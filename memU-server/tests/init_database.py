# -*- coding: utf-8 -*-
"""
初始化数据库表
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from memu.app import MemoryService

# 加载环境变量
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    print(f"✓ 加载配置文件: {env_file}")
    load_dotenv(env_file)

# 获取配置
openai_api_key = os.getenv("OPENAI_API_KEY")
base_url = os.getenv("OPENAI_BASE_URL", "https://api.openai.com/v1")
is_qwen = "dashscope.aliyuncs.com" in base_url

# 获取数据库配置
from app.database import get_database_config

print("\n" + "=" * 60)
print("初始化 memU 数据库")
print("=" * 60)

try:
    database_config = get_database_config()
    provider = database_config["metadata_store"]["provider"]
    dsn = database_config["metadata_store"]["dsn"]
    vector_provider = database_config["vector_index"]["provider"]
    
    print(f"数据库类型: {provider}")
    print(f"数据库连接: {dsn.split('@')[0]}@..." if '@' in dsn else f"数据库连接: {dsn}")
    print(f"向量索引: {vector_provider}")
except Exception as e:
    print(f"✗ 数据库配置错误: {e}")
    exit(1)

# 配置 LLM
if is_qwen:
    llm_profiles = {
        "default": {
            "provider": "openai",
            "api_key": openai_api_key,
            "base_url": base_url,
            "chat_model": os.getenv("DEFAULT_LLM_MODEL", "qwen-plus"),
            "embed_model": "text-embedding-v3",
        }
    }
    print("✓ 使用通义千问")
else:
    llm_profiles = {
        "default": {
            "provider": "openai",
            "api_key": openai_api_key,
            "base_url": base_url,
            "chat_model": os.getenv("DEFAULT_LLM_MODEL", "gpt-4o-mini"),
            "embed_model": "text-embedding-3-small",
        }
    }
    print("✓ 使用 OpenAI")

print("\n初始化 MemoryService...")

try:
    # 初始化 MemoryService（这会触发表创建）
    service = MemoryService(
        llm_profiles=llm_profiles,
        database_config={
            "metadata_store": {
                "provider": "postgres",
                "ddl_mode": "create",
                "dsn": database_url
            },
            "vector_index": {
                "provider": "pgvector",
                "dsn": database_url
            }
        }
    )
    
    print("✓ MemoryService 初始化成功")
    print("✓ 数据库表已创建")
    
    print("\n" + "=" * 60)
    print("初始化完成！")
    print("=" * 60)
    print("\n现在可以启动 memU-server:")
    print("  uv run fastapi dev app/main.py")
    
except Exception as e:
    print(f"\n✗ 初始化失败: {e}")
    import traceback
    traceback.print_exc()
    
    print("\n可能的原因:")
    print("1. pgvector 扩展未安装")
    print("2. 数据库连接失败")
    print("3. 权限不足")
