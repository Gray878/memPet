# -*- coding: utf-8 -*-
"""
数据库配置模块

支持从环境变量或 .env 文件读取数据库配置
支持 SQLite 和 PostgreSQL 两种数据库
"""

import os


def get_database_config() -> dict:
    """
    获取数据库配置
    
    支持两种数据库：
    1. SQLite（默认，桌面应用推荐）
    2. PostgreSQL（服务端应用推荐）
    
    Returns:
        数据库配置字典，格式为 memU 的 database_config
    
    Raises:
        RuntimeError: 如果数据库配置不完整
    """
    provider = os.getenv("DATABASE_PROVIDER", "postgres").lower()
    
    if provider == "sqlite":
        # SQLite 配置
        database_url = os.getenv("DATABASE_URL", "sqlite:///./data/memu.db")
        return {
            "metadata_store": {
                "provider": "sqlite",
                "dsn": database_url
            }
        }
    
    elif provider == "postgres":
        # PostgreSQL 配置
        database_url = os.getenv("DATABASE_URL")
        
        if not database_url:
            # 从独立变量构建
            host = os.getenv("DATABASE_HOST")
            port = os.getenv("DATABASE_PORT", "5432")
            user = os.getenv("DATABASE_USER")
            password = os.getenv("DATABASE_PASSWORD")
            dbname = os.getenv("DATABASE_NAME")
            
            # 检查必需的配置
            missing = []
            if not host:
                missing.append("DATABASE_HOST")
            if not user:
                missing.append("DATABASE_USER")
            if not password:
                missing.append("DATABASE_PASSWORD")
            if not dbname:
                missing.append("DATABASE_NAME")
            
            if missing:
                raise RuntimeError(
                    f"PostgreSQL 配置不完整，缺少: {', '.join(missing)}\n"
                    f"请在 .env 文件中设置这些变量"
                )
            
            # 构建基础连接字符串（不包含连接池参数）
            database_url = f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"
        
        # ✅ 连接池参数通过 engine_kwargs 传递给 SQLAlchemy
        # 这些参数会被传递给 SessionManager，然后传递给 create_engine()
        engine_kwargs = {
            "pool_size": 10,           # 连接池大小：10个连接
            "max_overflow": 20,        # 最大溢出：额外20个连接
            "pool_recycle": 3600,      # 连接回收：1小时后回收
            "pool_pre_ping": True,     # 连接前检查：使用前先ping（SessionManager 默认已启用）
            "connect_args": {
                "connect_timeout": 30,  # 连接超时：30秒（初始化需要更长时间）
                "options": "-c statement_timeout=60000"  # SQL 语句超时：60秒
            }
        }
        
        return {
            "metadata_store": {
                "provider": "postgres",
                "ddl_mode": "create",
                "dsn": database_url,
                "engine_kwargs": engine_kwargs,  # ✅ 传递连接池配置
            },
            "vector_index": {
                "provider": "pgvector",
                "dsn": database_url,
                "engine_kwargs": engine_kwargs,  # ✅ 向量索引也使用连接池
            }
        }
    
    else:
        raise RuntimeError(f"不支持的数据库类型: {provider}，支持 sqlite 或 postgres")
