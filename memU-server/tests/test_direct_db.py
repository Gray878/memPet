# -*- coding: utf-8 -*-
"""
直接查询数据库，检查是否有数据
"""

import asyncio
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 加载环境变量
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    print(f"加载配置文件: {env_file}")
    load_dotenv(env_file)
else:
    print(f"警告: 未找到 .env 文件: {env_file}")

# 获取数据库 URL（支持多种配置方式）
database_url = os.getenv("DATABASE_URL")

if not database_url:
    # 尝试从独立变量构建
    host = os.getenv("DATABASE_HOST", "localhost")
    port = os.getenv("DATABASE_PORT", "5432")
    user = os.getenv("DATABASE_USER", "postgres")
    password = os.getenv("DATABASE_PASSWORD", "postgres")
    dbname = os.getenv("DATABASE_NAME", "memu")
    database_url = f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"
    print(f"从独立变量构建数据库 URL")

if not database_url:
    print("错误: 无法获取数据库配置")
    exit(1)

print(f"数据库 URL: {database_url.split('@')[0]}@...")

# 创建数据库连接
engine = create_engine(database_url)

print("\n" + "=" * 60)
print("检查数据库表和数据")
print("=" * 60)

with engine.connect() as conn:
    # 1. 检查表是否存在
    print("\n1. 检查表...")
    result = conn.execute(text("""
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
    """))
    tables = [row[0] for row in result]
    print(f"找到 {len(tables)} 个表:")
    for table in tables:
        print(f"  - {table}")
    
    # 2. 检查 memory_items 表
    if "memory_items" in tables:
        print("\n2. 检查 memory_items 表...")
        result = conn.execute(text("SELECT COUNT(*) FROM memory_items"))
        count = result.scalar()
        print(f"  记录数: {count}")
        
        if count > 0:
            print("\n  最近 5 条记录:")
            result = conn.execute(text("""
                SELECT id, content, summary, created_at 
                FROM memory_items 
                ORDER BY created_at DESC 
                LIMIT 5
            """))
            for row in result:
                print(f"  ID: {row[0]}")
                print(f"  内容: {row[1][:100] if row[1] else 'None'}...")
                print(f"  摘要: {row[2][:100] if row[2] else 'None'}...")
                print(f"  时间: {row[3]}")
                print()
    
    # 3. 检查 memory_categories 表
    if "memory_categories" in tables:
        print("\n3. 检查 memory_categories 表...")
        result = conn.execute(text("SELECT COUNT(*) FROM memory_categories"))
        count = result.scalar()
        print(f"  记录数: {count}")
        
        if count > 0:
            print("\n  所有分类:")
            result = conn.execute(text("""
                SELECT id, name, description 
                FROM memory_categories 
                ORDER BY name
            """))
            for row in result:
                print(f"  - {row[1]}: {row[2]}")
    
    # 4. 检查 resources 表
    if "resources" in tables:
        print("\n4. 检查 resources 表...")
        result = conn.execute(text("SELECT COUNT(*) FROM resources"))
        count = result.scalar()
        print(f"  记录数: {count}")
        
        if count > 0:
            print("\n  最近 5 条记录:")
            result = conn.execute(text("""
                SELECT id, url, modality, created_at 
                FROM resources 
                ORDER BY created_at DESC 
                LIMIT 5
            """))
            for row in result:
                print(f"  ID: {row[0]}")
                print(f"  URL: {row[1]}")
                print(f"  类型: {row[2]}")
                print(f"  时间: {row[3]}")
                print()

print("\n" + "=" * 60)
print("检查完成")
print("=" * 60)
