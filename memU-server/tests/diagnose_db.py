# -*- coding: utf-8 -*-
"""
诊断数据库问题
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 加载环境变量
env_file = Path(__file__).parent.parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

# 获取数据库配置
host = os.getenv("DATABASE_HOST", "localhost")
port = os.getenv("DATABASE_PORT", "5432")
user = os.getenv("DATABASE_USER", "postgres")
password = os.getenv("DATABASE_PASSWORD", "postgres")
dbname = os.getenv("DATABASE_NAME", "memu")
database_url = f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"

print("=" * 60)
print("数据库诊断")
print("=" * 60)
print(f"数据库: {dbname}")
print(f"主机: {host}:{port}")
print(f"用户: {user}")

engine = create_engine(database_url)

try:
    with engine.connect() as conn:
        print("\n✓ 数据库连接成功")
        
        # 1. 检查 pgvector 扩展
        print("\n" + "-" * 60)
        print("1. 检查 pgvector 扩展")
        print("-" * 60)
        
        result = conn.execute(text(
            "SELECT 1 FROM pg_extension WHERE extname = 'vector'"
        )).fetchone()
        
        if result:
            print("✓ pgvector 扩展已安装")
        else:
            print("✗ pgvector 扩展未安装")
            print("\n尝试安装...")
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
                conn.commit()
                print("✓ pgvector 扩展安装成功")
            except Exception as e:
                print(f"✗ 安装失败: {e}")
                print("\n手动安装步骤:")
                print("1. 下载 pgvector: https://github.com/pgvector/pgvector")
                print("2. 或使用包管理器安装")
                print("3. 然后以超级用户身份运行:")
                print(f"   psql -U postgres -d {dbname} -c 'CREATE EXTENSION vector;'")
                sys.exit(1)
        
        # 2. 检查表
        print("\n" + "-" * 60)
        print("2. 检查数据库表")
        print("-" * 60)
        
        result = conn.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
            ORDER BY table_name
        """))
        tables = [row[0] for row in result]
        
        if tables:
            print(f"找到 {len(tables)} 个表:")
            for table in tables:
                print(f"  - {table}")
        else:
            print("✗ 没有找到任何表")
            print("\n这意味着 memU 的表创建失败了")
        
        # 3. 检查权限
        print("\n" + "-" * 60)
        print("3. 检查用户权限")
        print("-" * 60)
        
        result = conn.execute(text(f"""
            SELECT 
                has_database_privilege('{user}', '{dbname}', 'CREATE') as can_create,
                has_database_privilege('{user}', '{dbname}', 'CONNECT') as can_connect
        """))
        row = result.fetchone()
        
        if row[0]:
            print("✓ 用户有 CREATE 权限")
        else:
            print("✗ 用户没有 CREATE 权限")
            
        if row[1]:
            print("✓ 用户有 CONNECT 权限")
        else:
            print("✗ 用户没有 CONNECT 权限")
        
        # 4. 测试创建表
        print("\n" + "-" * 60)
        print("4. 测试创建表")
        print("-" * 60)
        
        try:
            conn.execute(text("""
                CREATE TABLE IF NOT EXISTS test_table (
                    id SERIAL PRIMARY KEY,
                    name TEXT
                )
            """))
            conn.commit()
            print("✓ 可以创建表")
            
            # 清理测试表
            conn.execute(text("DROP TABLE IF EXISTS test_table"))
            conn.commit()
        except Exception as e:
            print(f"✗ 无法创建表: {e}")
        
        print("\n" + "=" * 60)
        print("诊断完成")
        print("=" * 60)
        
        if not tables:
            print("\n建议:")
            print("1. 确保 pgvector 扩展已安装")
            print("2. 检查 memU-server 启动日志中的错误信息")
            print("3. 尝试手动运行: uv run python tests/init_database.py")

except Exception as e:
    print(f"\n✗ 数据库连接失败: {e}")
    import traceback
    traceback.print_exc()
