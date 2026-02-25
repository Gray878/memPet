import asyncio
import json
import os
import traceback
import uuid
from pathlib import Path
from typing import Any

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.responses import JSONResponse
from memu.app import MemoryService
from memu.app.settings import CategoryConfig
from openai import (
    APIConnectionError,
    APIStatusError,
    AuthenticationError,
    BadRequestError,
    NotFoundError,
    PermissionDeniedError,
    RateLimitError,
)

from app.compat.memu_sqlite_patch import (
    apply_memu_sqlite_pydantic_patch,
    ensure_memu_sqlite_schema_columns,
)
from app.database import get_database_config
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

app = FastAPI(title="memU Server", version="0.1.0")


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
        # SQLite 格式
        provider = database_config["metadata_store"]["provider"]
        dsn = database_config["metadata_store"]["dsn"]
        print(f"✓ 使用 SQLite 数据库")
        print(f"✓ 数据库文件: {dsn.replace('sqlite:///', '')}")
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

service = MemoryService(
    llm_profiles=llm_profiles,
    database_config=database_config
    # 暂时不传递自定义分类，使用默认配置
    # memorize_config={
    #     "memory_categories": [
    #         CategoryConfig(**cat) for cat in MemoryAdapter.DESKTOP_PET_CATEGORIES
    #     ]
    # }
)

if provider == "sqlite":
    patched_columns = ensure_memu_sqlite_schema_columns(dsn)
    if patched_columns:
        print("✓ 已自动补齐 SQLite 表字段:")
        for col in patched_columns:
            print(f"  - {col}")
    else:
        print("✓ SQLite 表字段检查通过")

# 初始化桌面宠物适配器
adapter = MemoryAdapter(service)

# 初始化主动推理辅助器
proactive_helper = ProactiveHelper()

# 打印配置信息
print(f"✓ API 地址: {base_url}")
print(f"✓ 聊天模型: {llm_profiles['default']['chat_model']}")
print(f"✓ 嵌入模型: {llm_profiles['default']['embed_model']}")

# 存储目录配置
# 支持 STORAGE_PATH 和 MEMU_STORAGE_DIR（向后兼容）
storage_dir = Path(os.getenv("STORAGE_PATH") or os.getenv("MEMU_STORAGE_DIR") or "./data")
storage_dir.mkdir(parents=True, exist_ok=True)
print(f"✓ 存储目录: {storage_dir.absolute()}")

print("\n" + "=" * 60)
print("memU-server 启动成功！")
print("=" * 60)


@app.post("/memorize")
async def memorize(payload: dict[str, Any]):
    """
    存储记忆（支持对话和系统观察两种类型）
    
    对话记忆格式:
    {
        "type": "conversation",
        "content": [
            {
                "role": "user",
                "content": {"text": "消息内容"},
                "created_at": "2024-02-12 10:00:00"
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
        memory_type = payload.get("type", "conversation")
        
        if memory_type == "conversation":
            # 对话记忆：保存 JSON 文件并调用 memU
            file_path = storage_dir / f"conversation-{uuid.uuid4().hex}.json"
            with file_path.open("w", encoding="utf-8") as f:
                json.dump(payload, f, ensure_ascii=False)
            
            result = await adapter.memorize_conversation(
                payload.get("content", []),
                str(file_path)
            )
        
        elif memory_type == "system_observation":
            # 系统观察：通过适配器处理
            observation = payload.get("observation", {})
            result = await adapter.memorize_system_observation(
                observation,
                str(storage_dir)
            )
        
        else:
            raise HTTPException(status_code=400, detail=f"不支持的记忆类型: {memory_type}")
        
        # 转换结果为可序列化的格式
        serializable_result = json.loads(json.dumps(result, default=str))
        
        return JSONResponse(content={"status": "success", "result": serializable_result})
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"存储失败：{_extract_error_message(exc)}") from exc


@app.post("/retrieve")
async def retrieve(payload: dict[str, Any]):
    """
    检索相关记忆（支持对话和主动推理两种场景）
    
    对话场景格式:
    {
        "scenario": "conversation",
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
        scenario = payload.get("scenario", "conversation")
        limit = payload.get("limit", 5)
        
        if scenario == "proactive":
            # 主动推理场景：使用适配器的增强检索
            context = payload.get("context", {})
            result = await adapter.retrieve_for_proactive(context, limit=limit)
        
        elif scenario == "conversation":
            # 对话场景：使用适配器的对话上下文检索
            if "query" not in payload:
                raise HTTPException(status_code=400, detail="对话场景需要提供 'query' 参数")
            
            query = payload["query"]
            result = await adapter.retrieve_conversation_context(query, limit=limit)
        
        else:
            raise HTTPException(status_code=400, detail=f"不支持的检索场景: {scenario}")
        
        # 转换结果为可序列化的格式
        serializable_result = json.loads(json.dumps(result, default=str))
        
        return JSONResponse(content={"status": "success", "result": serializable_result})
    except HTTPException:
        raise
    except Exception as exc:
        traceback.print_exc()
        _raise_upstream_http_error(exc)
        raise HTTPException(status_code=500, detail=f"检索失败：{_extract_error_message(exc)}") from exc


@app.get("/")
async def root():
    """健康检查接口"""
    return {
        "message": "Hello MemU user!",
        "version": "0.1.0",
        "status": "running"
    }


@app.post("/proactive/analyze")
async def proactive_analyze(payload: dict[str, Any]):
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
        context = payload.get("context", {})
        
        # 分析上下文，生成建议
        suggestions = proactive_helper.analyze_context(context)
        
        return JSONResponse(content={
            "status": "success",
            "suggestions": suggestions
        })
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/proactive/generate")
async def proactive_generate(payload: dict[str, Any]):
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
        suggestion = payload.get("suggestion", {})
        context = payload.get("context", {})
        personality = payload.get("personality", "friendly")
        limit = payload.get("limit", 3)
        
        # 检索相关记忆
        memories_result = await adapter.retrieve_for_proactive(context, limit=limit)
        memories = memories_result.get("result", [])
        
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
        
        return JSONResponse(content={
            "status": "success",
            "message": message,
            "memories": memories,
            "prompt": prompt  # 调试用
        })
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.get("/proactive/cooldown")
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
        
        return JSONResponse(content={
            "status": "success",
            "cooldowns": cooldowns
        })
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/proactive/cooldown/reset")
async def proactive_cooldown_reset(payload: dict[str, Any]):
    """
    重置冷却时间
    
    请求格式:
    {
        "type": "fatigue_reminder"  # 可选，不提供则重置所有
    }
    """
    try:
        suggestion_type = payload.get("type")
        proactive_helper.reset_cooldown(suggestion_type)
        
        return JSONResponse(content={
            "status": "success",
            "message": f"已重置冷却时间: {suggestion_type or '全部'}"
        })
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/batch/observations")
async def batch_observations(payload: dict[str, Any]):
    """
    批量添加观察记录到缓冲区
    
    用于高频监控数据的批量处理
    
    请求格式:
    {
        "observations": [
            {
                "type": "app_switch",
                "app": "VSCode",
                "duration": 300,
                "timestamp": "2024-02-15T10:00:00"
            },
            {
                "type": "idle_detected",
                "minutes": 5,
                "timestamp": "2024-02-15T10:05:00"
            }
        ]
    }
    """
    try:
        observations = payload.get("observations", [])
        
        # 添加到缓冲区
        for obs in observations:
            await adapter.add_observation(obs)
        
        return JSONResponse(content={
            "status": "success",
            "message": f"已添加 {len(observations)} 条观察记录到缓冲区",
            "buffer_size": len(adapter.observation_buffer)
        })
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/batch/flush")
async def batch_flush():
    """
    强制刷新缓冲区
    
    立即将缓冲区中的所有观察记录存储到数据库
    """
    try:
        buffer_size = len(adapter.observation_buffer)
        await adapter.force_flush()
        
        return JSONResponse(content={
            "status": "success",
            "message": f"已刷新 {buffer_size} 条观察记录"
        })
    except Exception as exc:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(exc)) from exc


@app.post("/chat")
async def chat(payload: dict[str, Any]):
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
        message = payload.get("message")
        if not message:
            raise ValueError("message 参数不能为空")
        
        history = payload.get("history", [])
        personality = payload.get("personality", "friendly")
        temperature = payload.get("temperature", 0.7)
        max_tokens = payload.get("max_tokens", 2000)
        retrieve_memories = payload.get("retrieve_memories", True)
        
        # 性格提示词
        personality_prompts = {
            "friendly": "你是一个友好、温暖的桌面宠物助手,名叫 memPet。你会用轻松愉快的语气与用户交流,关心用户的工作和生活。",
            "energetic": "你是一个充满活力、积极向上的桌面宠物助手,名叫 memPet。你总是充满热情,用鼓励的话语激励用户。",
            "professional": "你是一个专业、高效的桌面助手,名叫 memPet。你会用简洁明了的语言提供帮助,注重效率和准确性。",
            "tsundere": "你是一个表面高冷但内心温柔的桌面宠物,名叫 memPet。你会用略带傲娇的语气说话,但实际上很关心用户。",
        }
        
        system_prompt = personality_prompts.get(personality, personality_prompts["friendly"])
        system_prompt += "\n\n你具有记忆能力,可以记住与用户的对话历史和用户的活动。当用户提到过去的事情时,你可以回忆起来。\n\n回复时请注意:\n1. 保持简洁,避免过长的回复\n2. 使用自然、口语化的表达\n3. 适当使用 emoji 增加亲和力\n4. 如果用户问到你不知道的事情,诚实地说不知道\n5. 根据上下文和记忆提供个性化的回复"
        
        # 检索相关记忆
        memories = []
        if retrieve_memories:
            try:
                retrieve_result = await service.retrieve(
                    text=message,  # 使用 text 而不是 query
                    limit=5,
                    category="conversation"
                )
                memories = retrieve_result.get("result", [])
            except Exception as e:
                print(f"[Chat] 检索记忆失败: {e}")
        
        # 注入记忆到系统提示词
        if memories:
            system_prompt += "\n\n相关记忆:\n"
            for i, memory in enumerate(memories, 1):
                system_prompt += f"{i}. {memory.get('content', '')}\n"
        
        # 构建消息列表
        messages = [{"role": "system", "content": system_prompt}]
        
        # 添加历史对话
        for msg in history[-10:]:  # 只保留最近 10 条
            messages.append({
                "role": msg.get("role", "user"),
                "content": msg.get("content", "")
            })
        
        # 添加当前消息
        messages.append({"role": "user", "content": message})
        
        # 调用 LLM (使用简化的方式)
        # 构建完整的 prompt
        full_prompt = system_prompt + "\n\n"
        
        # 添加历史对话
        for msg in history[-10:]:
            role = msg.get("role", "user")
            content = msg.get("content", "")
            full_prompt += f"{role}: {content}\n"
        
        # 添加当前消息
        full_prompt += f"user: {message}\nassistant:"
        
        # 使用 memU 的内部方法调用 LLM
        try:
            # 尝试使用 _get_llm_client 方法
            llm_client = service._get_llm_client()
            llm_response = await llm_client.chat(
                prompt=full_prompt,
                temperature=temperature,
                max_tokens=max_tokens
            )
        except Exception as e:
            print(f"[Chat] LLM 调用失败: {e}")
            # 降级方案：返回简单响应
            llm_response = "抱歉，我现在无法回复。请稍后再试。"
        
        # 提取响应内容
        if isinstance(llm_response, dict):
            response = llm_response.get("content", str(llm_response))
        else:
            response = str(llm_response)
        
        # 自动记忆对话 (暂时禁用，避免格式问题)
        # try:
        #     await service.memorize(
        #         content=[
        #             {"role": "user", "content": message},
        #             {"role": "assistant", "content": response}
        #         ],
        #         category="conversation"
        #     )
        # except Exception as e:
        #     print(f"[Chat] 自动记忆对话失败: {e}")
        
        return {
            "response": response,
            "memories_used": len(memories)
        }
        
    except Exception as e:
        print(f"[Chat] 对话失败: {e}")
        import traceback
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/chat/stream")
async def chat_stream(payload: dict[str, Any]):
    """
    流式对话接口 - 支持 Server-Sent Events (已修复 v2)
    
    请求参数同 /chat
    
    返回: SSE 流
    """
    from fastapi.responses import StreamingResponse
    import json
    
    async def generate():
        try:
            message = payload.get("message")
            if not message:
                yield f"data: {json.dumps({'error': 'message 参数不能为空'})}\n\n"
                return
            
            history = payload.get("history", [])
            personality = payload.get("personality", "friendly")
            temperature = payload.get("temperature", 0.7)
            max_tokens = payload.get("max_tokens", 2000)
            retrieve_memories = payload.get("retrieve_memories", True)
            
            # 性格提示词 (同上)
            personality_prompts = {
                "friendly": "你是一个友好、温暖的桌面宠物助手,名叫 memPet。你会用轻松愉快的语气与用户交流,关心用户的工作和生活。",
                "energetic": "你是一个充满活力、积极向上的桌面宠物助手,名叫 memPet。你总是充满热情,用鼓励的话语激励用户。",
                "professional": "你是一个专业、高效的桌面助手,名叫 memPet。你会用简洁明了的语言提供帮助,注重效率和准确性。",
                "tsundere": "你是一个表面高冷但内心温柔的桌面宠物,名叫 memPet。你会用略带傲娇的语气说话,但实际上很关心用户。",
            }
            
            system_prompt = personality_prompts.get(personality, personality_prompts["friendly"])
            system_prompt += "\n\n你具有记忆能力,可以记住与用户的对话历史和用户的活动。当用户提到过去的事情时,你可以回忆起来。\n\n回复时请注意:\n1. 保持简洁,避免过长的回复\n2. 使用自然、口语化的表达\n3. 适当使用 emoji 增加亲和力\n4. 如果用户问到你不知道的事情,诚实地说不知道\n5. 根据上下文和记忆提供个性化的回复"
            
            # 检索相关记忆
            memories = []
            if retrieve_memories:
                try:
                    retrieve_result = await service.retrieve(
                        text=message,  # 使用 text 而不是 query
                        limit=5,
                        category="conversation"
                    )
                    memories = retrieve_result.get("result", [])
                except Exception as e:
                    print(f"[Chat] 检索记忆失败: {e}")
            
            # 注入记忆
            if memories:
                system_prompt += "\n\n相关记忆:\n"
                for i, memory in enumerate(memories, 1):
                    system_prompt += f"{i}. {memory.get('content', '')}\n"
            
            # 构建消息列表
            messages = [{"role": "system", "content": system_prompt}]
            for msg in history[-10:]:
                messages.append({
                    "role": msg.get("role", "user"),
                    "content": msg.get("content", "")
                })
            messages.append({"role": "user", "content": message})
            
            # 构建完整的 prompt
            full_prompt = system_prompt + "\n\n"
            for msg in history[-10:]:
                role = msg.get("role", "user")
                content = msg.get("content", "")
                full_prompt += f"{role}: {content}\n"
            full_prompt += f"user: {message}\nassistant:"
            
            # 调用 LLM（使用普通 chat，然后模拟流式返回）
            try:
                llm_client = service._get_llm_client()
                
                # 调用普通 chat 方法
                llm_response = await llm_client.chat(
                    prompt=full_prompt,
                    temperature=temperature,
                    max_tokens=max_tokens
                )
                
                # 提取响应内容
                if isinstance(llm_response, dict):
                    full_response = llm_response.get("content", str(llm_response))
                else:
                    full_response = str(llm_response)
                
                # 模拟流式输出（按字符分块）
                chunk_size = 5  # 每次发送 5 个字符
                for i in range(0, len(full_response), chunk_size):
                    chunk = full_response[i:i+chunk_size]
                    yield f"data: {json.dumps({'chunk': chunk}, ensure_ascii=False)}\n\n"
                    # 添加小延迟模拟流式效果
                    await asyncio.sleep(0.05)
                
                yield f"data: {json.dumps({'done': True})}\n\n"
            except Exception as e:
                print(f"[Chat Stream] 流式调用失败: {e}")
                yield f"data: {json.dumps({'error': str(e)}, ensure_ascii=False)}\n\n"
            
            # 自动记忆对话 (暂时禁用，避免格式问题)
            # try:
            #     await service.memorize(
            #         content=[
            #             {"role": "user", "content": message},
            #             {"role": "assistant", "content": full_response}
            #         ],
            #         category="conversation"
            #     )
            # except Exception as e:
            #     print(f"[Chat] 自动记忆对话失败: {e}")
                
        except Exception as e:
            print(f"[Chat Stream] 流式对话失败: {e}")
            import traceback
            traceback.print_exc()
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
    
    return StreamingResponse(generate(), media_type="text/event-stream")
