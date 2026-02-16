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
# 检测是否使用通义千问
base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
is_qwen = "dashscope.aliyuncs.com" in base_url

if is_qwen:
    # 通义千问配置
    llm_profiles = {
        "default": {
            "provider": "openai",
            "api_key": openai_api_key,
            "base_url": base_url,
            "chat_model": os.getenv("DEFAULT_LLM_MODEL", "qwen-plus"),
            "embed_model": "text-embedding-v3",  # 通义千问的嵌入模型
        }
    }
    print(f"✓ 使用通义千问")
else:
    # OpenAI 配置
    llm_profiles = {
        "default": {
            "provider": "openai",
            "api_key": openai_api_key,
            "base_url": base_url,
            "chat_model": os.getenv("DEFAULT_LLM_MODEL", "gpt-4o-mini"),
            "embed_model": "text-embedding-3-small",  # OpenAI 的嵌入模型
        }
    }
    print(f"✓ 使用 OpenAI")

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
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
        raise HTTPException(status_code=500, detail=str(exc)) from exc


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
        # 注意：这里使用 service 的 LLM 配置
        from memu.llm import get_llm_client
        
        llm_client = get_llm_client(
            provider=llm_profiles["default"]["provider"],
            api_key=llm_profiles["default"]["api_key"],
            base_url=llm_profiles["default"].get("base_url"),
            chat_model=llm_profiles["default"]["chat_model"]
        )
        
        response = await llm_client.chat(
            messages=[{"role": "user", "content": prompt}],
            temperature=0.8
        )
        
        message = response.get("content", "")
        
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
