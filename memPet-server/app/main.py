import asyncio
import json
import os
import traceback
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Request
from fastapi.encoders import jsonable_encoder
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from memu.app.settings import CategoryConfig
from memu.app import MemoryService
from openai import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
)
from sse_starlette.sse import EventSourceResponse

from app.compat.memu_sqlite_patch import (
    apply_memu_sqlite_pydantic_patch,
    ensure_memu_sqlite_schema_columns,
)
from app.database import get_database_config
from app.schemas.api_contract import (
    ApiEnvelope,
    BatchObservationsRequest,
    BatchFlushData,
    BatchObservationsData,
    ChatRequest,
    ChatData,
    ChatStreamRequest,
    CooldownData,
    CooldownResetData,
    HealthData,
    MemorizeRequest,
    MemorizeData,
    ProactiveAnalyzeRequest,
    ProactiveAnalyzeData,
    ProactiveCooldownResetRequest,
    ProactiveGenerateRequest,
    ProactiveGenerateData,
    ProactiveQuickRequest,
    ProactiveQuickData,
    RetrieveRequest,
    RetrieveData,
    RootData,
    MemoriesListRequest,
    MemoriesListData,
    MemoriesStatsData,
)
from app.services.memory_adapter import MemoryAdapter
from app.services.proactive_helper import ProactiveHelper

# 加载 .env 文件（如果存在）
# 优先级：环境变量 > .env 文件
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    print(f"✓ 加载配置文件: {env_file}")
    load_dotenv(env_file)
else:
    print("⚠ 未找到 .env 文件，使用环境变量")
    print(f"  提示: 可以复制 .env.example 为 .env 来配置")

app = FastAPI(title="memPet Server", version="0.1.0")

cors_allow_origins = os.getenv(
    "CORS_ALLOW_ORIGINS",
    "https://tauri.localhost,http://tauri.localhost,tauri://localhost,http://127.0.0.1:1420,http://localhost:1420",
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in cors_allow_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


def _extract_error_message(exc: Exception) -> str:
    msg = getattr(exc, "message", None)
    if isinstance(msg, str) and msg.strip():
        return msg.strip()
    text = str(exc).strip()
    return text or exc.__class__.__name__


def _raise_upstream_http_error(exc: Exception) -> None:
    """将上游 LLM/Embedding 异常映射为可读的 HTTP 错误。"""
    if isinstance(exc, APIConnectionError):
        raise HTTPException(
            status_code=502,
            detail=(
                "LLM 服务连接失败，请检查 OPENAI_BASE_URL 网络可达性、DNS/代理设置，"
                "以及服务商地址是否正确（例如硅基流动应为 https://api.siliconflow.cn/v1）。"
            ),
        ) from exc
    if isinstance(exc, AuthenticationError):
        raise HTTPException(status_code=401, detail="LLM 鉴权失败，请检查 OPENAI_API_KEY。") from exc
    if isinstance(exc, PermissionDeniedError):
        raise HTTPException(
            status_code=403,
            detail="LLM 权限不足或账户不可用，请检查模型权限、实名认证与余额状态。",
        ) from exc
    if isinstance(exc, RateLimitError):
        raise HTTPException(status_code=429, detail="LLM 请求频率超限，请稍后重试。") from exc
    if isinstance(exc, (BadRequestError, NotFoundError)):
        raise HTTPException(
            status_code=400,
            detail=f"LLM 请求参数错误：{_extract_error_message(exc)}",
        ) from exc
    if isinstance(exc, APIStatusError):
        status_code = exc.status_code if isinstance(exc.status_code, int) else 502
        raise HTTPException(
            status_code=status_code,
            detail=f"LLM 服务返回错误：{_extract_error_message(exc)}",
        ) from exc


def _success(
    data: dict[str, Any] | None = None,
    **legacy_fields: Any,
) -> JSONResponse:
    payload: dict[str, Any] = {
        "status": "success",
        "data": data if data is not None else {},
        "error": None,
    }
    payload.update(legacy_fields)
    return JSONResponse(content=payload)


def _error(status_code: int, message: str, data: dict[str, Any] | None = None) -> JSONResponse:
    return JSONResponse(
        status_code=status_code,
        content={
            "status": "error",
            "data": data if data is not None else {},
            "error": message,
        },
    )


def _normalize_retrieve_result(result: dict[str, Any] | None) -> dict[str, Any]:
    raw = result if isinstance(result, dict) else {}
    if isinstance(raw.get("result"), dict):
        raw = raw["result"]

    items = raw.get("items")
    categories = raw.get("categories")
    resources = raw.get("resources")

    return {
        "items": items if isinstance(items, list) else [],
        "categories": categories if isinstance(categories, list) else [],
        "resources": resources if isinstance(resources, list) else [],
    }


@app.exception_handler(HTTPException)
async def http_exception_handler(_request: Request, exc: HTTPException) -> JSONResponse:
    detail = exc.detail if isinstance(exc.detail, str) else jsonable_encoder(exc.detail)
    message = detail if isinstance(detail, str) else json.dumps(detail, ensure_ascii=False)
    return _error(status_code=exc.status_code, message=message)


@app.exception_handler(Exception)
async def unhandled_exception_handler(_request: Request, exc: Exception) -> JSONResponse:
    traceback.print_exc()
    return _error(status_code=500, message=f"服务器内部错误：{_extract_error_message(exc)}")

# 检查必需的环境变量
openai_api_key = os.getenv("OPENAI_API_KEY")
if not openai_api_key:
    error_msg = """
    ❌ 错误: OPENAI_API_KEY 未设置
    
    请通过以下方式之一配置:
    
    方式 1: 创建 .env 文件 (推荐)
      1. 复制 .env.example 为 .env
      2. 编辑 .env 文件，填入你的 API Key
      3. 重新启动服务
    
    方式 2: 设置环境变量
      PowerShell: $env:OPENAI_API_KEY="your_api_key"
      Linux/Mac: export OPENAI_API_KEY="your_api_key"
    
    支持的 API:
      - OpenAI: https://platform.openai.com/api-keys
      - 通义千问: https://dashscope.console.aliyun.com/
    """
    raise RuntimeError(error_msg)

# 获取数据库配置
try:
    database_config = get_database_config()
    
    # 判断数据库类型
    if "metadata_store" in database_config:
        provider = database_config["metadata_store"]["provider"]
        dsn = database_config["metadata_store"]["dsn"]
        
        if provider == "sqlite":
            print(f"✓ 使用 SQLite 数据库")
            print(f"✓ 数据库文件: {dsn.replace('sqlite:///', '')}")
        elif provider == "postgres":
            print(f"✓ 使用 PostgreSQL 数据库")
            # 隐藏密码部分
            if "@" in dsn:
                safe_dsn = dsn.split("@")[0].split(":")[0] + ":***@" + dsn.split("@")[1]
            else:
                safe_dsn = dsn
            print(f"✓ 数据库连接: {safe_dsn}")
    else:
        # PostgreSQL 格式
        provider = "postgres"
        dsn = database_config["url"]
        print(f"✓ 使用 PostgreSQL 数据库")
        print(f"✓ 数据库配置: {dsn.split('@')[0]}@...")  # 隐藏敏感信息
        
except RuntimeError as e:
    error_msg = f"""
    ❌ 错误: 数据库配置不完整
    
    {str(e)}
    
    请在 .env 文件中配置数据库:
    
    方式 1: 使用 PostgreSQL (当前配置)
      DATABASE_PROVIDER=postgres
      DATABASE_HOST=127.0.0.1
      DATABASE_PORT=5432
      DATABASE_USER=postgres
      DATABASE_PASSWORD=your_password
      DATABASE_NAME=memu
    
    方式 2: 使用 SQLite (桌面应用，memU 的 SQLite 有兼容性问题)
      DATABASE_PROVIDER=sqlite
      DATABASE_URL=sqlite:///./data/memu.db
    """
    raise RuntimeError(error_msg) from e

# 初始化 MemoryService
base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1").rstrip("/")
base_url_lower = base_url.lower()
is_dashscope = "dashscope.aliyuncs.com" in base_url_lower
is_siliconflow = "siliconflow.cn" in base_url_lower

chat_model = os.getenv("DEFAULT_LLM_MODEL")
embed_model = os.getenv("DEFAULT_EMBED_MODEL")
provider_name = "OpenAI"

if is_dashscope:
    provider_name = "通义千问"
    chat_model = chat_model or "qwen-plus"
    embed_model = embed_model or "text-embedding-v3"
elif is_siliconflow:
    provider_name = "硅基流动"
    chat_model = chat_model or "Qwen/Qwen3-8B"
    # 参考硅基流动 embeddings 文档示例模型
    embed_model = embed_model or "BAAI/bge-large-zh-v1.5"
else:
    chat_model = chat_model or "gpt-4o-mini"
    embed_model = embed_model or "text-embedding-3-small"

llm_profiles = {
    "default": {
        "provider": "openai",
        "api_key": openai_api_key,
        "base_url": base_url,
        "chat_model": chat_model,
        "embed_model": embed_model,
    }
}
print(f"✓ 使用{provider_name}")

if provider == "sqlite":
    if apply_memu_sqlite_pydantic_patch():
        print("✓ 已应用 memu SQLite 兼容补丁")

print(f"✓ API 地址: {base_url}")
print(f"✓ 聊天模型: {llm_profiles['default']['chat_model']}")
print(f"✓ 嵌入模型: {llm_profiles['default']['embed_model']}")
print("")
print("正在初始化 MemoryService...")
print("  - 连接数据库...")
print("  - 创建表结构...")
print("  - 初始化嵌入模型...")
print("  (首次启动可能需要 30-60 秒)")
print("")

# ✅ 配置 blob_config，指定 resources 目录
blob_config = {
    "provider": "local",
    "resources_dir": str(Path("./data/resources").absolute())
}

# ✅ 配置 retrieve_config，禁用意图路由和充分性检查（调试用）
retrieve_config = {
    "method": "rag",
    "route_intention": False,  # 🔍 禁用意图路由，直接检索
    "sufficiency_check": False,  # 🔍 禁用充分性检查，返回所有结果
    "category": {"enabled": True, "top_k": 5},
    "item": {"enabled": True, "top_k": 10},  # 增加返回数量
    "resource": {"enabled": True, "top_k": 5}
}

# ✅ 添加重试机制
max_retries = 3
retry_delay = 2  # 秒

for attempt in range(max_retries):
    try:
        print(f"尝试初始化 MemoryService (第 {attempt + 1}/{max_retries} 次)...")
        service = MemoryService(
            llm_profiles=llm_profiles,
            database_config=database_config,
            blob_config=blob_config,  # ✅ 添加 blob_config
            retrieve_config=retrieve_config  # ✅ 添加 retrieve_config
            # 暂时不传递自定义分类，使用默认配置
            # memorize_config={
            #     "memory_categories": [
            #         CategoryConfig(**cat) for cat in MemoryAdapter.DESKTOP_PET_CATEGORIES
            #     ]
            # }
        )
        print("✓ MemoryService 初始化完成")
        break
    except Exception as e:
        print(f"✗ 初始化失败: {e}")
        if attempt < max_retries - 1:
            print(f"等待 {retry_delay} 秒后重试...")
            import time
            time.sleep(retry_delay)
        else:
            print("✗ 达到最大重试次数，初始化失败")
            print("\n可能的原因:")
            print("1. 数据库服务器连接不稳定")
            print("2. 数据库连接数达到上限")
            print("3. 网络问题")
            print("\n建议:")
            print("1. 检查数据库服务器状态")
            print("2. 检查网络连接")
            print("3. 稍后再试")
            raise

if provider == "sqlite":
    patched_columns = ensure_memu_sqlite_schema_columns(dsn)
    if patched_columns:
        print("✓ 已自动补齐 SQLite 表字段:")
        for col in patched_columns:
            print(f"  - {col}")
    else:
        print("✓ SQLite 表字段检查通过")

# 初始化桌面宠物适配器
print("正在初始化适配器...")
adapter = MemoryAdapter(service)
print("✓ 适配器初始化完成")

# 初始化主动推理辅助器
print("正在初始化主动推理辅助器...")
proactive_helper = ProactiveHelper()
print("✓ 主动推理辅助器初始化完成")

# 打印配置信息
print("")
print(f"✓ API 地址: {base_url}")
print(f"✓ 聊天模型: {llm_profiles['default']['chat_model']}")
print(f"✓ 嵌入模型: {llm_profiles['default']['embed_model']}")

# 存储目录配置
# 支持 STORAGE_PATH 和 MEMU_STORAGE_DIR（向后兼容）
storage_dir = Path(os.getenv("STORAGE_PATH") or os.getenv("MEMU_STORAGE_DIR") or "./data")
storage_dir.mkdir(parents=True, exist_ok=True)

# ✅ 创建 resources 子目录（memU 需要）
resources_dir = storage_dir / "resources"
resources_dir.mkdir(parents=True, exist_ok=True)

print(f"✓ 存储目录: {storage_dir.absolute()}")
print(f"✓ 资源目录: {resources_dir.absolute()}")

print("\n" + "=" * 60)
print("memPet-server 启动成功！")
print("=" * 60)


@app.post("/memorize", response_model=ApiEnvelope[MemorizeData])
async def memorize(payload: MemorizeRequest):
    """
    存储记忆（支持对话和系统观察两种类型）
    
    对话记忆格式:
    {
        "user_id": "test_user",
        "messages": [
            {
                "role": "user",
                "content": "消息内容"
            },
            {
                "role": "assistant",
                "content": "回复内容"
            }
        ]
    }
    
    系统观察格式:
    {
        "type": "system_observation",
        "observation": {
            "type": "app_switch",
            "app": "VSCode",
            "duration": 3600,
            "timestamp": "2024-02-12T10:00:00"
        }
    }
    """
    try:
        memory_type = payload.type
        
        # 调试日志
        print(f"[DEBUG] memorize - memory_type: {memory_type}")
        
        if memory_type == "conversation":
            # 对话记忆：保存 JSON 文件并调用 memU
            file_path = storage_dir / f"conversation-{uuid.uuid4().hex}.json"
            
            # 构建 memU 期望的格式
            messages = payload.messages or []
            if not messages:
                raise HTTPException(status_code=400, detail="conversation 类型需要提供 messages 或 content")
            conversation_data = {
                "messages": messages,
                "content": messages,
            }
            
            with file_path.open("w", encoding="utf-8") as f:
                json.dump(conversation_data, f, ensure_ascii=False)
            
            # 调用 memU 存储
            try:
                result = await service.memorize(
                    resource_url=str(file_path),
                    modality="conversation"
                )
            except Exception as e:
                print(f"[ERROR] memorize 调用失败: {e}")
                import traceback
                traceback.print_exc()
                raise HTTPException(status_code=500, detail=f"存储失败: {str(e)}")
        
        elif memory_type == "system_observation":
            # 系统观察：通过适配器处理
            observation = payload.observation or {}
            if not observation:
                raise HTTPException(status_code=400, detail="system_observation 类型需要提供 observation")
            result = await adapter.memorize_system_observation(
                observation,
                str(storage_dir),
                user_id=payload.user_id,
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"不支持的记忆类型: {memory_type}")
        
        # 转换结果为可序列化的格式
        serializable_result = json.loads(json.dumps(result, default=str))
        
        return _success(
            data={"result": serializable_result},
            result=serializable_result,
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"存储失败：{_extract_error_message(exc)}") from exc


@app.post("/retrieve", response_model=ApiEnvelope[RetrieveData])
async def retrieve(payload: RetrieveRequest):
    """
    检索相关记忆（支持对话和主动推理两种场景）
    
    对话场景格式:
    {
        "scenario": "conversation",
        "user_id": "test_user",
        "query": "查询文本",
        "limit": 3
    }
    
    主动推理场景格式:
    {
        "scenario": "proactive",
        "context": {
            "working_duration": 7200,
            "active_app": "VSCode",
            "fatigue_level": "Tired",
            "is_late_night": false,
            "idle_time": 0
        },
        "limit": 5
    }
    """
    try:
        scenario = payload.scenario
        limit = payload.limit
        
        # 调试日志
        print(f"[DEBUG] retrieve - scenario: {scenario}, limit: {limit}")
        
        if scenario == "proactive":
            # 主动推理场景：使用适配器的增强检索
            context = payload.context
            result = await adapter.retrieve_for_proactive(
                context,
                limit=limit,
                user_id=payload.user_id,
            )
        
        elif scenario == "conversation":
            # 对话场景：使用 memU 的 retrieve
            if payload.query is None:
                raise HTTPException(status_code=400, detail="对话场景需要提供 'query' 参数")
            
            query = payload.query
            
            # 构建查询格式
            queries = [{
                "role": "user",
                "content": {"text": query}
            }]
            
            result = await service.retrieve(
                queries=queries,
                where={"user_id": payload.user_id} if payload.user_id else {},
            )
            
            print(f"[DEBUG] retrieve - items count: {len(result.get('items', []))}")
            
            # 如果有 items，打印前几条
            items = result.get('items', [])
            if items:
                print(f"[DEBUG] retrieve - 前 3 条记忆:")
                for i, item in enumerate(items[:3], 1):
                    print(f"  {i}. {item.get('summary', '')[:80]}")
            else:
                print(f"[DEBUG] retrieve - 没有找到记忆")
        
        else:
            raise HTTPException(status_code=400, detail=f"不支持的检索场景: {scenario}")
        
        # 转换结果为可序列化的格式并统一结构
        serializable_result = _normalize_retrieve_result(
            json.loads(json.dumps(result, default=str))
        )
        serializable_data = {
            "result": serializable_result,
            "items": serializable_result["items"],
        }
        return _success(
            data=serializable_data,
            result=serializable_result,
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"检索失败：{_extract_error_message(exc)}") from exc


@app.get("/", response_model=ApiEnvelope[RootData])
async def root():
    """健康检查接口"""
    server_info = {
        "message": "Hello memPet user!",
        "version": "0.1.0",
        "server_status": "running",
    }
    return _success(data=server_info, **server_info)




@app.get("/health", response_model=ApiEnvelope[HealthData])
async def health():
    """健康检查接口（详细版本）"""
    health_info = {
        "server_status": "ok",
        "version": "0.1.0",
        "database": "connected",
        "llm": llm_profiles["default"]["chat_model"],
    }
    return _success(data=health_info, **health_info)


@app.post("/batch/observations", response_model=ApiEnvelope[BatchObservationsData])
async def batch_observations(payload: BatchObservationsRequest):
    """批量添加系统观察记录到缓冲区。"""
    try:
        accepted = 0
        for observation in payload.observations:
            await adapter.add_observation(observation)
            accepted += 1
        buffered = len(adapter.observation_buffer)
        return _success(
            data={"accepted": accepted, "buffered": buffered},
            accepted=accepted,
            buffered=buffered,
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"批量写入失败：{_extract_error_message(exc)}") from exc


@app.post("/batch/flush", response_model=ApiEnvelope[BatchFlushData])
async def batch_flush():
    """强制刷新观察记录缓冲区。"""
    try:
        await adapter.force_flush()
        return _success(data={"flushed": True}, flushed=True)
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"刷新缓冲区失败：{_extract_error_message(exc)}") from exc


@app.post("/proactive/analyze", response_model=ApiEnvelope[ProactiveAnalyzeData])
async def proactive_analyze(payload: ProactiveAnalyzeRequest):
    """
    主动推理分析接口
    
    分析当前上下文，生成建议列表
    
    请求格式:
    {
        "context": {
            "working_duration": 7200,
            "active_app": "VSCode",
            "fatigue_level": "Tired",
            "is_late_night": false,
            "idle_time": 0,
            "is_work_hours": true,
            "focus_level": "NormalFocus"
        }
    }
    
    返回格式:
    {
        "status": "success",
        "suggestions": [
            {
                "type": "fatigue_reminder",
                "priority": "high",
                "message": "检测到疲劳",
                "reason": "连续工作 2 小时",
                "action": "建议休息 10 分钟"
            }
        ]
    }
    """
    try:
        context = payload.context
        skip_cooldown = payload.skip_cooldown
        
        # 分析上下文，生成建议
        suggestions = proactive_helper.analyze_context(context, check_cooldown=not skip_cooldown)
        
        return _success(data={"suggestions": suggestions}, suggestions=suggestions)
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"主动分析失败：{_extract_error_message(exc)}") from exc


@app.post("/proactive/generate", response_model=ApiEnvelope[ProactiveGenerateData])
async def proactive_generate(payload: ProactiveGenerateRequest):
    """
    生成主动推理消息
    
    根据建议和相关记忆，生成自然语言消息
    
    请求格式:
    {
        "suggestion": {
            "type": "fatigue_reminder",
            "priority": "high",
            "message": "检测到疲劳",
            "reason": "连续工作 2 小时",
            "action": "建议休息 10 分钟"
        },
        "context": {
            "working_duration": 7200,
            "fatigue_level": "Tired"
        },
        "personality": "friendly",
        "limit": 3
    }
    
    返回格式:
    {
        "status": "success",
        "message": "主人已经工作 2 小时了，要不要休息一下眼睛呀？",
        "memories": [...]
    }
    """
    try:
        suggestion = payload.suggestion
        context = payload.context
        personality = payload.personality
        limit = payload.limit
        
        # 检索相关记忆
        memories_result = await adapter.retrieve_for_proactive(context, limit=limit)
        memories = _normalize_retrieve_result(
            json.loads(json.dumps(memories_result, default=str))
        )["items"]
        
        # 格式化为 LLM prompt
        prompt = proactive_helper.format_suggestion_for_llm(
            suggestion,
            memories,
            personality
        )
        
        # 调用 LLM 生成消息
        try:
            llm_client = service._get_llm_client()
            llm_response = await llm_client.chat(
                prompt=prompt,
                temperature=0.8
            )
        except Exception as e:
            print(f"[Proactive] LLM 调用失败: {e}")
            llm_response = "主人，我现在有点累了，稍后再聊吧~"
        
        # 提取响应内容
        if isinstance(llm_response, dict):
            message = llm_response.get("content", str(llm_response))
        else:
            message = str(llm_response)
        
        return _success(
            data={"message": message, "memories": memories, "prompt": prompt},
            message=message,
            memories=memories,
            prompt=prompt,
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"主动消息生成失败：{_extract_error_message(exc)}") from exc


@app.post("/proactive/quick", response_model=ApiEnvelope[ProactiveQuickData])
async def proactive_quick(payload: ProactiveQuickRequest):
    """
    快捷主动推理接口 - 一步完成分析和生成
    
    自动分析上下文，选择最高优先级的建议，并生成自然语言消息
    
    请求格式:
    {
        "context": {
            "working_duration": 7200,
            "active_app": "VSCode",
            "fatigue_level": "Tired",
            "is_late_night": false,
            "idle_time": 0,
            "is_work_hours": true,
            "focus_level": "NormalFocus"
        },
        "personality": "friendly",
        "limit": 3
    }
    
    返回格式:
    {
        "status": "success",
        "message": "主人已经工作 2 小时了，要不要休息一下眼睛呀？",
        "suggestion": {
            "type": "fatigue_reminder",
            "priority": "high",
            "message": "检测到疲劳",
            "reason": "连续工作 2 小时",
            "action": "建议休息 10 分钟"
        },
        "memories": [...]
    }
    """
    try:
        context = payload.context
        personality = payload.personality
        limit = payload.limit
        
        # 第一步：分析上下文，生成建议
        suggestions = proactive_helper.analyze_context(context)
        
        if not suggestions:
            return _success(
                data={"message": None, "suggestion": None, "memories": []},
                message=None,
                suggestion=None,
                memories=[],
            )
        
        # 选择最高优先级的建议
        suggestion = suggestions[0]
        
        # 第二步：检索相关记忆
        memories_result = await adapter.retrieve_for_proactive(context, limit=limit)
        memories = _normalize_retrieve_result(
            json.loads(json.dumps(memories_result, default=str))
        )["items"]
        
        # 第三步：生成自然语言消息
        prompt = proactive_helper.format_suggestion_for_llm(
            suggestion,
            memories,
            personality
        )
        
        try:
            llm_client = service._get_llm_client()
            llm_response = await llm_client.chat(
                prompt=prompt,
                temperature=0.8
            )
        except Exception as e:
            print(f"[Proactive Quick] LLM 调用失败: {e}")
            llm_response = "主人，我现在有点累了，稍后再聊吧~"
        
        # 提取响应内容
        if isinstance(llm_response, dict):
            message = llm_response.get("content", str(llm_response))
        else:
            message = str(llm_response)
        
        return _success(
            data={"message": message, "suggestion": suggestion, "memories": memories},
            message=message,
            suggestion=suggestion,
            memories=memories,
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"快捷主动推理失败：{_extract_error_message(exc)}") from exc


@app.get("/proactive/cooldown", response_model=ApiEnvelope[CooldownData])
async def proactive_cooldown():
    """
    获取冷却状态
    
    返回所有建议类型的冷却状态
    
    返回格式:
    {
        "status": "success",
        "cooldowns": {
            "fatigue_reminder": {
                "cooldown_seconds": 1800,
                "remaining_seconds": 600,
                "can_trigger": false,
                "last_triggered": "2024-02-15T10:00:00"
            }
        }
    }
    """
    try:
        cooldowns = proactive_helper.get_cooldown_status()
        
        return _success(data={"cooldowns": cooldowns}, cooldowns=cooldowns)
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"获取冷却状态失败：{_extract_error_message(exc)}") from exc


@app.post("/proactive/cooldown/reset", response_model=ApiEnvelope[CooldownResetData])
async def proactive_cooldown_reset(payload: ProactiveCooldownResetRequest | None = None):
    """重置主动推理冷却时间。"""
    try:
        suggestion_type = payload.type if payload else None
        proactive_helper.reset_cooldown(suggestion_type)
        cooldowns = proactive_helper.get_cooldown_status()
        return _success(
            data={"type": suggestion_type, "cooldowns": cooldowns},
            type=suggestion_type,
            cooldowns=cooldowns,
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"重置冷却失败：{_extract_error_message(exc)}") from exc


@app.get("/memory-log", response_model=ApiEnvelope[MemoriesListData])
async def list_memory_log(
    limit: int = 50,
    offset: int = 0,
    type: str = "all",
    start_date: str | None = None,
    end_date: str | None = None,
):
    """
    查询记忆日志列表（用于记忆管理界面）
    
    参数:
    - limit: 返回数量限制 (1-200, 默认 50)
    - offset: 偏移量 (默认 0)
    - type: 记忆类型 (all, conversation, system_observation, 默认 all)
    - start_date: 开始日期 (可选)
    - end_date: 结束日期 (可选)
    
    返回格式:
    {
        "status": "success",
        "data": {
            "items": [
                {
                    "id": "uuid",
                    "type": "conversation",
                    "content": "我今天写了500行代码",
                    "summary": "用户分享工作进展",
                    "created_at": "2024-02-27T18:30:00",
                    "metadata": {}
                }
            ],
            "total": 150,
            "has_more": true
        }
    }
    """
    try:
        result = await adapter.list_memories(
            limit=min(max(limit, 1), 200),
            offset=max(offset, 0),
            memory_type=type,
            start_date=start_date,
            end_date=end_date,
        )
        
        return _success(
            data=result,
            items=result["items"],
            total=result["total"],
            has_more=result["has_more"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"查询记忆日志失败：{_extract_error_message(exc)}") from exc


@app.get("/memory-log/stats", response_model=ApiEnvelope[MemoriesStatsData])
async def get_memory_log_stats():
    """
    获取记忆日志统计信息
    
    返回格式:
    {
        "status": "success",
        "data": {
            "total_memories": 150,
            "conversations": 50,
            "observations": 100,
            "today_count": 20,
            "storage_size": "2.5 MB"
        }
    }
    """
    try:
        stats = await adapter.get_memories_stats()
        
        return _success(
            data=stats,
            total_memories=stats["total_memories"],
            conversations=stats["conversations"],
            observations=stats["observations"],
            today_count=stats["today_count"],
            storage_size=stats["storage_size"],
        )
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"获取统计信息失败：{_extract_error_message(exc)}") from exc

    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"重置冷却失败：{_extract_error_message(exc)}") from exc








def _build_personality_prompt(personality: str) -> str:
    personality_prompts = {
        "friendly": "你是一个友好、温暖的桌面宠物助手,名叫 memPet。你会用轻松愉快的语气与用户交流,关心用户的工作和生活。",
        "energetic": "你是一个充满活力、积极向上的桌面宠物助手,名叫 memPet。你总是充满热情,用鼓励的话语激励用户。",
        "professional": "你是一个专业、高效的桌面助手,名叫 memPet。你会用简洁明了的语言提供帮助,注重效率和准确性。",
        "tsundere": "你是一个表面高冷但内心温柔的桌面宠物,名叫 memPet。你会用略带傲娇的语气说话,但实际上很关心用户。",
    }
    system_prompt = personality_prompts.get(personality, personality_prompts["friendly"])
    system_prompt += "\n\n你具有记忆能力,可以记住与用户的对话历史和用户的活动。当用户提到过去的事情时,你可以回忆起来。\n\n回复时请注意:\n1. 保持简洁,避免过长的回复\n2. 使用自然、口语化的表达\n3. 适当使用 emoji 增加亲和力\n4. 如果用户问到你不知道的事情,诚实地说不知道\n5. 根据上下文和记忆提供个性化的回复"
    return system_prompt


def _normalize_history_text(value: Any) -> str:
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        text = value.get("text")
        if isinstance(text, str):
            return text
    if value is None:
        return ""
    return str(value)


def _build_chat_prompt(system_prompt: str, history: list[dict[str, Any]], message: str) -> str:
    full_prompt = system_prompt + "\n\n"
    for msg in history[-10:]:
        role = msg.get("role", "user")
        content = _normalize_history_text(msg.get("content", ""))
        full_prompt += f"{role}: {content}\n"
    full_prompt += f"user: {message}\nassistant:"
    return full_prompt


async def _retrieve_chat_memories(message: str, retrieve_memories: bool) -> tuple[list[dict[str, Any]], bool]:
    if not retrieve_memories:
        return [], False
    queries = [{"role": "user", "content": {"text": message}}]
    retrieve_result = await service.retrieve(queries=queries)
    items = _normalize_retrieve_result(json.loads(json.dumps(retrieve_result, default=str)))["items"]
    memories = items[:5]
    return memories, bool(memories)


@app.post("/chat", response_model=ApiEnvelope[ChatData])
async def chat(payload: ChatRequest):
    """
    对话接口 - 支持记忆增强的 AI 对话
    
    请求参数:
    - message: 用户消息
    - history: 对话历史 (可选)
    - personality: 性格类型 (可选: friendly, energetic, professional, tsundere)
    - temperature: 温度参数 (可选, 默认 0.7)
    - max_tokens: 最大 token 数 (可选, 默认 2000)
    - retrieve_memories: 是否检索相关记忆 (可选, 默认 True)
    
    返回:
    - response: AI 回复
    - memories_used: 使用的记忆数量
    """
    try:
        message = payload.message.strip()
        if not message:
            raise HTTPException(status_code=400, detail="message 参数不能为空")
        
        history = payload.history
        personality = payload.personality
        temperature = payload.temperature
        max_tokens = payload.max_tokens
        retrieve_memories = payload.retrieve_memories
        
        system_prompt = _build_personality_prompt(personality)
        
        # 检索相关记忆
        memories, memory_used = await _retrieve_chat_memories(message, retrieve_memories)
        
        # 注入记忆到系统提示词
        if memories:
            system_prompt += "\n\n【相关记忆】\n"
            for i, memory in enumerate(memories, 1):
                summary = memory.get('summary', '')
                system_prompt += f"{i}. {summary}\n"
            system_prompt += "\n请基于以上记忆回答用户的问题。"
        
        full_prompt = _build_chat_prompt(system_prompt, history, message)
        
        # 使用 memU 的内部方法调用 LLM
        try:
            import time
            llm_start = time.time()
            
            # 尝试使用 _get_llm_client 方法
            llm_client = service._get_llm_client()
            llm_response = await llm_client.chat(
                prompt=full_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
            
            llm_time = time.time() - llm_start
            print(f"[Chat] LLM 调用耗时: {llm_time:.2f}秒")
            
        except Exception as e:
            print(f"[Chat] LLM 调用失败: {e}")
            # 降级方案：返回简单响应
            llm_response = "抱歉，我现在无法回复。请稍后再试。"
        
        # 提取响应内容
        if isinstance(llm_response, dict):
            response = llm_response.get("content", str(llm_response))
        else:
            response = str(llm_response)
        
        return _success(
            data={
                "response": response,
                "memories_used": len(memories),
                "memory_used": memory_used,
            },
            response=response,
            memories_used=len(memories),
            memory_used=memory_used,
        )
    except HTTPException:
        raise
    except Exception as exc:
        print(f"[Chat] 对话失败: {exc}")
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"对话失败：{_extract_error_message(exc)}") from exc


async def stream_chat_response(
    message: str,
    history: list[dict[str, Any]],
    personality: str,
    temperature: float,
    max_tokens: int,
    retrieve_memories: bool
):
    """
    生成流式对话响应
    
    先获取完整响应，然后分段发送（模拟打字机效果）
    """
    try:
        # 1. 检索相关记忆
        memories, memory_used = await _retrieve_chat_memories(message, retrieve_memories)

        # 2. 构建系统提示词
        system_prompt = _build_personality_prompt(personality)
        
        # 注入记忆到系统提示词
        if memories:
            system_prompt += "\n\n【相关记忆】\n"
            for i, memory in enumerate(memories, 1):
                summary = memory.get('summary', '')
                system_prompt += f"{i}. {summary}\n"
            system_prompt += "\n请基于以上记忆回答用户的问题。"
        
        # 3. 构建完整 prompt
        full_prompt = _build_chat_prompt(system_prompt, history, message)
        
        # 4. 调用 LLM 获取完整响应
        try:
            llm_client = service._get_llm_client()
            llm_response = await llm_client.chat(
                prompt=full_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        except Exception as e:
            print(f"[Chat Stream] LLM 调用失败: {e}")
            llm_response = "抱歉，我现在无法回复。请稍后再试。"
        
        # 提取响应内容
        if isinstance(llm_response, dict):
            response = llm_response.get("content", str(llm_response))
        else:
            response = str(llm_response)
        
        # 5. 流式发送响应（模拟打字机效果）
        # 发送元数据事件
        yield {
            "event": "metadata",
            "data": json.dumps({
                "memories_used": len(memories),
                "memory_used": memory_used
            })
        }
        
        # 分段发送内容（每段 1-3 个字符，模拟打字）
        chunk_size = 2
        for i in range(0, len(response), chunk_size):
            chunk = response[i:i + chunk_size]
            yield {
                "event": "chunk",
                "data": json.dumps({"content": chunk})
            }
            # 控制打字速度（每字符约 30-50ms）
            await asyncio.sleep(0.04)
        
        # 发送完成事件
        yield {
            "event": "complete",
            "data": json.dumps({"finished": True})
        }
        
    except Exception as e:
        print(f"[Chat Stream] 流式响应失败: {e}")
        import traceback
        traceback.print_exc()
        yield {
            "event": "error",
            "data": json.dumps({"error": str(e)})
        }


@app.post("/chat/stream")
async def chat_stream(payload: ChatStreamRequest):
    """
    流式对话接口 - 使用 SSE (Server-Sent Events) 返回打字机效果
    
    请求参数:
    - message: 用户消息（必需）
    - history: 对话历史（可选）
    - personality: 性格类型（可选: friendly, energetic, professional, tsundere）
    - temperature: 温度参数（可选, 默认 0.7）
    - max_tokens: 最大 token 数（可选, 默认 2000）
    - retrieve_memories: 是否检索相关记忆（可选, 默认 True）
    
    SSE 事件类型:
    - metadata: 元数据事件（包含 memories_used, memory_used）
    - chunk: 内容片段（包含 content 字段）
    - complete: 完成事件
    - error: 错误事件
    
    示例用法(JavaScript):
        import { fetchEventSource } from '@microsoft/fetch-event-source';
        await fetchEventSource('/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: '你好' }),
            onmessage(ev) {
                console.log(ev.event, ev.data);
            },
        });
    """
    message = payload.message.strip()
    if not message:
        raise HTTPException(status_code=400, detail="message 参数不能为空")
    
    history = payload.history
    personality = payload.personality
    temperature = payload.temperature
    max_tokens = payload.max_tokens
    retrieve_memories = payload.retrieve_memories
    
    return EventSourceResponse(
        stream_chat_response(
            message=message,
            history=history,
            personality=personality,
            temperature=temperature,
            max_tokens=max_tokens,
            retrieve_memories=retrieve_memories
        ),
        media_type="text/event-stream"
    )
