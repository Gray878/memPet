# -*- coding: utf-8 -*-
"""
数据库诊断脚本

检查记忆是否真的存储到数据库中
"""

import os
import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
from sqlalchemy import create_engine, text

# 加载环境变量
env_file = project_root / ".env"
if env_file.exists():
    load_dotenv(env_file)

# 获取数据库配置
db_provider = os.getenv("DATABASE_PROVIDER", "sqlite")

print("=" * 60)
print("memU 数据库诊断")
print("=" * 60)
print(f"数据库类型: {db_provider}")

if db_provider == "postgres":
    # PostgreSQL 诊断
    host = os.getenv("DATABASE_HOST", "localhost")
    port = os.getenv("DATABASE_PORT", "5432")
    user = os.getenv("DATABASE_USER", "postgres")
    password = os.getenv("DATABASE_PASSWORD", "")
    dbname = os.getenv("DATABASE_NAME", "memu")
    
    print(f"连接信息: {user}@{host}:{port}/{dbname}")
    
    try:
        # 连接数据库
        db_url = f"postgresql+psycopg://{user}:{password}@{host}:{port}/{dbname}"
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            print("\n✓ 数据库连接成功")
            
            # 检查表是否存在
            result = conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """))
            tables = [row[0] for row in result]
            
            print(f"\n数据库表列表 ({len(tables)} 个):")
            for table in tables:
                print(f"  - {table}")
            
            # 查看 memory_items 表结构
            if "memory_items" in tables:
                result = conn.execute(text("""
                    SELECT column_name, data_type 
                    FROM information_schema.columns 
                    WHERE table_name = 'memory_items'
                    ORDER BY ordinal_position;
                """))
                columns = result.fetchall()
                
                print(f"\nmemory_items 表结构:")
                for col in columns:
                    col_name, data_type = col
                    print(f"  - {col_name}: {data_type}")
            
            # 检查记忆项数量
            if any("memory_item" in t for t in tables):
                result = conn.execute(text("SELECT COUNT(*) FROM memory_items;"))
                count = result.fetchone()[0]
                print(f"\n记忆项总数: {count}")
                
                if count > 0:
                    # 显示最近的几条记忆
                    result = conn.execute(text("""
                        SELECT id, summary, memory_type, created_at 
                        FROM memory_items 
                        ORDER BY created_at DESC 
                        LIMIT 5;
                    """))
                    items = result.fetchall()
                    
                    print("\n最近的记忆:")
                    for item in items:
                        item_id, summary, memory_type, created_at = item
                        summary_preview = summary[:80] if summary else "无内容"
                        print(f"  [{created_at}] [{memory_type}] {summary_preview}...")
            
            # 检查分类
            if any("memory_categor" in t for t in tables):
                result = conn.execute(text("SELECT COUNT(*) FROM memory_categories;"))
                count = result.fetchone()[0]
                print(f"\n记忆分类总数: {count}")
                
                if count > 0:
                    result = conn.execute(text("SELECT name, description FROM memory_categories;"))
                    categories = result.fetchall()
                    
                    print("\n分类列表:")
                    for cat in categories:
                        name, desc = cat
                        print(f"  - {name}: {desc}")
            
            # 检查资源
            if any("resource" in t for t in tables):
                result = conn.execute(text("SELECT COUNT(*) FROM resources;"))
                count = result.fetchone()[0]
                print(f"\n资源总数: {count}")
                
                if count > 0:
                    result = conn.execute(text("""
                        SELECT url, modality, created_at 
                        FROM resources 
                        ORDER BY created_at DESC 
                        LIMIT 5;
                    """))
                    resources = result.fetchall()
                    
                    print("\n最近的资源:")
                    for res in resources:
                        url, modality, created_at = res
                        print(f"  [{created_at}] {modality}: {url}")
        
        print("\n" + "=" * 60)
        print("诊断完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 数据库连接失败: {e}")
        import traceback
        traceback.print_exc()

elif db_provider == "sqlite":
    # SQLite 诊断
    db_url = os.getenv("DATABASE_URL", "sqlite:///./data/memu.db")
    db_path = db_url.replace("sqlite:///", "")
    
    print(f"数据库文件: {db_path}")
    
    if not Path(db_path).exists():
        print(f"\n✗ 数据库文件不存在: {db_path}")
        sys.exit(1)
    
    try:
        engine = create_engine(db_url)
        
        with engine.connect() as conn:
            print("\n✓ 数据库连接成功")
            
            # 检查表
            result = conn.execute(text("""
                SELECT name FROM sqlite_master 
                WHERE type='table' 
                ORDER BY name;
            """))
            tables = [row[0] for row in result]
            
            print(f"\n数据库表列表 ({len(tables)} 个):")
            for table in tables:
                print(f"  - {table}")
            
            # 检查记忆项
            if any("memory_item" in t for t in tables):
                result = conn.execute(text("SELECT COUNT(*) FROM memory_item;"))
                count = result.fetchone()[0]
                print(f"\n记忆项总数: {count}")
                
                if count > 0:
                    result = conn.execute(text("""
                        SELECT id, content, created_at 
                        FROM memory_item 
                        ORDER BY created_at DESC 
                        LIMIT 5;
                    """))
                    items = result.fetchall()
                    
                    print("\n最近的记忆:")
                    for item in items:
                        item_id, content, created_at = item
                        content_preview = content[:80] if content else "无内容"
                        print(f"  [{created_at}] {content_preview}...")
        
        print("\n" + "=" * 60)
        print("诊断完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n✗ 数据库操作失败: {e}")
        import traceback
        traceback.print_exc()

else:
    print(f"\n✗ 不支持的数据库类型: {db_provider}")

