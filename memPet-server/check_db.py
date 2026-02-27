#!/usr/bin/env python3
"""
快速检查数据库中的记忆数据
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv

# 加载环境变量
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    print(f"✓ 加载配置: {env_file}")
    load_dotenv(env_file)
else:
    print(f"⚠️  未找到 .env 文件: {env_file}")
    sys.exit(1)

async def check_database():
    """检查数据库中的记忆数据"""
    
    # 获取数据库连接参数
    host = os.getenv("DATABASE_HOST")
    port = int(os.getenv("DATABASE_PORT", "5432"))
    user = os.getenv("DATABASE_USER")
    password = os.getenv("DATABASE_PASSWORD")
    dbname = os.getenv("DATABASE_NAME")
    
    if not all([host, user, password, dbname]):
        print("❌ 数据库配置不完整")
        return
    
    print(f"数据库连接: {host}:{port}/{dbname}")
    
    try:
        import asyncpg
        
        # 连接数据库
        conn = await asyncpg.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            database=dbname,
            timeout=10
        )
        
        # 检查表是否存在
        print("\n1. 检查表结构...")
        tables = await conn.fetch("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name LIKE '%memory%'
        """)
        print(f"   找到的表: {[t['table_name'] for t in tables]}")
        
        # 检查 memory_items 表的字段
        print("\n2. 检查 memory_items 表字段...")
        columns = await conn.fetch("""
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'memory_items'
            ORDER BY ordinal_position
        """)
        print(f"   字段列表:")
        for col in columns:
            print(f"     - {col['column_name']}: {col['data_type']}")
        
        # 检查 memory_items 表
        if any('memory_items' in t['table_name'] for t in tables):
            print("\n3. 统计记忆数据...")
            
            # 总数
            total_row = await conn.fetchrow("SELECT COUNT(*) as total FROM memory_items")
            total = total_row['total']
            print(f"   总记忆数: {total}")
            
            if total > 0:
                # 检查是否有 modality 字段
                has_modality = any(col['column_name'] == 'modality' for col in columns)
                has_memory_type = any(col['column_name'] == 'memory_type' for col in columns)
                
                type_field = 'modality' if has_modality else 'memory_type' if has_memory_type else None
                
                if type_field:
                    # 按类型统计
                    types = await conn.fetch(f"""
                        SELECT {type_field}, COUNT(*) as count
                        FROM memory_items 
                        GROUP BY {type_field}
                    """)
                    print(f"\n   按类型统计 (字段: {type_field}):")
                    for row in types:
                        print(f"     - {row[type_field]}: {row['count']}")
                    
                    # 查看最近的记录
                    recent = await conn.fetch(f"""
                        SELECT id, {type_field}, summary, created_at 
                        FROM memory_items 
                        ORDER BY created_at DESC 
                        LIMIT 5
                    """)
                    print(f"\n   最近的 5 条记录:")
                    for row in recent:
                        type_val = row[type_field]
                        summary = row['summary']
                        created_at = row['created_at']
                        summary_text = summary[:50] if summary else "(无摘要)"
                        print(f"     - [{type_val}] {summary_text}... ({created_at})")
                else:
                    print("   ⚠️  未找到类型字段 (modality 或 memory_type)")
            else:
                print("   ⚠️  数据库中没有记忆数据")
        else:
            print("   ❌ 未找到 memory_items 表")
        
        await conn.close()
        print("\n✓ 检查完成")
        
    except Exception as e:
        print(f"\n❌ 检查失败: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(check_database())

