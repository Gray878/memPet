# -*- coding: utf-8 -*-
"""
检查 pgvector 扩展是否安装
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 加载环境变量
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

# 获取数据库 URL
host = os.getenv("DATABASE_HOST", "localhost")
port = os.getenv("DATABASE_PORT", "5432")
user = os.getenv("DATABASE_USER", "postgres")
password = os.getenv("DATABASE_PASSWORD", "postgres")
dbname = os.getenv("DATABASE_NAME", "memu")
database_url = f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"

print(f"数据库 URL: {database_url.split('@')[0]}@...")

engine = create_engine(database_url)

print("\n" + "=" * 60)
print("检查 pgvector 扩展")
print("=" * 60)

with engine.connect() as conn:
    # 检查 pgvector 扩展
    result = conn.execute(text("SELECT 1 FROM pg_extension WHERE extname = 'vector'")).fetchone()
    
    if result:
        print("\n✓ pgvector 扩展已安装")
    else:
        print("\n✗ pgvector 扩展未安装")
        print("\n尝试安装 pgvector 扩展...")
        
        try:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()
            print("✓ pgvector 扩展安装成功")
        except Exception as e:
            print(f"✗ 安装失败: {e}")
            print("\n解决方案:")
            print("1. 使用超级用户连接数据库:")
            print(f"   psql -U postgres -d {dbname}")
            print("2. 运行命令:")
            print("   CREATE EXTENSION vector;")
            print("3. 或者安装 pgvector:")
            print("   https://github.com/pgvector/pgvector#installation")

print("\n" + "=" * 60)
