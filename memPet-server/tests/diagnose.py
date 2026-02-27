#!/usr/bin/env python3
"""
诊断脚本 - 检查数据库和检索问题
"""

import os
import sys
from pathlib import Path

# 添加项目路径
sys.path.insert(0, str(Path(__file__).parent))

from dotenv import load_dotenv

# 加载环境变量
env_file = Path(__file__).parent / ".env"
if env_file.exists():
    load_dotenv(env_file)

def check_sqlite_data():
    """检查 SQLite 数据库中的数据"""
    import sqlite3
    
    db_path = Path("data/memu.db")
    
    if not db_path.exists():
        print("❌ SQLite 数据库文件不存在")
        return
    
    print(f"✓ 数据库文件: {db_path.absolute()}")
    
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # 检查表是否存在
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
        tables = cursor.fetchall()
        print(f"\n数据库表: {[t[0] for t in tables]}")
        
        # 检查 memory_items 表
        if any('memory_items' in str(t) for t in tables):
            # 获取表结构
            cursor.execute("PRAGMA table_info(memory_items)")
            columns = cursor.fetchall()
            print(f"\nmemory_items 表结构:")
            for col in columns:
                print(f"  - {col[1]} ({col[2]})")
            
            # 统计记录数
            cursor.execute("SELECT COUNT(*) FROM memory_items")
            count = cursor.fetchone()[0]
            print(f"\n记忆项总数: {count}")
            
            if count > 0:
                # 查看 user_id 分布
                cursor.execute("SELECT user_id, COUNT(*) FROM memory_items GROUP BY user_id")
                user_counts = cursor.fetchall()
                print(f"\n用户分布:")
                for user_id, cnt in user_counts:
                    print(f"  - {user_id}: {cnt} 条")
                
                # 查看最近的记录
                cursor.execute("SELECT user_id, summary, created_at FROM memory_items ORDER BY created_at DESC LIMIT 5")
                recent = cursor.fetchall()
                print(f"\n最近的记忆:")
                for user_id, summary, created_at in recent:
                    print(f"  - [{user_id}] {summary[:60]}... ({created_at})")
        else:
            print("❌ memory_items 表不存在")
        
        conn.close()
        
    except Exception as e:
        print(f"❌ 检查数据库失败: {e}")
        import traceback
        traceback.print_exc()

def check_postgres_data():
    """检查 PostgreSQL 数据库中的数据"""
    try:
        import psycopg2
        from urllib.parse import urlparse
        
        # 从环境变量构建连接字符串
        provider = os.getenv("DATABASE_PROVIDER", "sqlite")
        if provider != "postgres":
            print("当前使用的不是 PostgreSQL")
            return
        
        host = os.getenv("DATABASE_HOST", "127.0.0.1")
        port = os.getenv("DATABASE_PORT", "5432")
        user = os.getenv("DATABASE_USER", "postgres")
        password = os.getenv("DATABASE_PASSWORD", "")
        dbname = os.getenv("DATABASE_NAME", "memu")
        
        print(f"✓ 连接 PostgreSQL: {user}@{host}:{port}/{dbname}")
        
        conn = psycopg2.connect(
            host=host,
            port=port,
            user=user,
            password=password,
            dbname=dbname
        )
        cursor = conn.cursor()
        
        # 检查表
        cursor.execute("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """)
        tables = cursor.fetchall()
        print(f"\n数据库表: {[t[0] for t in tables]}")
        
        # 检查 memory_items
        cursor.execute("""
            SELECT COUNT(*) 
            FROM information_schema.tables 
            WHERE table_name = 'memory_items'
        """)
        if cursor.fetchone()[0] > 0:
            # 统计记录数
            cursor.execute("SELECT COUNT(*) FROM memory_items")
            count = cursor.fetchone()[0]
            print(f"\n记忆项总数: {count}")
            
            if count > 0:
                # 查看 user_id 分布
                cursor.execute("SELECT user_id, COUNT(*) FROM memory_items GROUP BY user_id")
                user_counts = cursor.fetchall()
                print(f"\n用户分布:")
                for user_id, cnt in user_counts:
                    print(f"  - {user_id}: {cnt} 条")
                
                # 查看最近的记录
                cursor.execute("SELECT user_id, summary, created_at FROM memory_items ORDER BY created_at DESC LIMIT 5")
                recent = cursor.fetchall()
                print(f"\n最近的记忆:")
                for user_id, summary, created_at in recent:
                    print(f"  - [{user_id}] {summary[:60]}... ({created_at})")
        else:
            print("❌ memory_items 表不存在")
        
        conn.close()
        
    except ImportError:
        print("❌ psycopg2 未安装，无法检查 PostgreSQL")
    except Exception as e:
        print(f"❌ 检查数据库失败: {e}")
        import traceback
        traceback.print_exc()

def test_retrieve():
    """测试检索功能"""
    import requests
    
    print("\n" + "=" * 60)
    print("  测试检索功能")
    print("=" * 60)
    
    base_url = "http://127.0.0.1:8000"
    
    # 测试健康检查
    try:
        response = requests.get(f"{base_url}/")
        if response.status_code == 200:
            print("✓ 服务运行正常")
        else:
            print(f"❌ 服务异常: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ 无法连接服务: {e}")
        print("请确保服务正在运行:")
        print("  uv run fastapi dev app/main.py --host 127.0.0.1 --port 8000")
        return
    
    # 测试检索
    test_cases = [
        {"user_id": "test_user_001", "query": "Python"},
        {"user_id": "default_user", "query": "Python"},
        {"user_id": "test_user_001", "query": "代码"},
        {"query": "Python"},  # ✅ 测试单用户模式（不传 user_id）
    ]
    
    for test in test_cases:
        user_id = test.get('user_id', 'None (单用户模式)')
        query = test['query']
        print(f"\n测试检索: user_id={user_id}, query={query}")
        try:
            # ✅ 添加 scenario 参数
            payload = {
                "scenario": "conversation",
                "query": query,
                "limit": 3
            }
            
            # 只有提供了 user_id 才添加
            if 'user_id' in test:
                payload['user_id'] = test['user_id']
            
            response = requests.post(
                f"{base_url}/retrieve",
                json=payload,
                timeout=30
            )
            
            if response.status_code == 200:
                result = response.json()
                items = result.get("result", {}).get("items", [])
                print(f"  ✓ 返回 {len(items)} 条记忆")
                
                if items:
                    for i, item in enumerate(items[:2], 1):
                        summary = item.get("summary", "")
                        print(f"    {i}. {summary[:60]}...")
            else:
                print(f"  ❌ 请求失败: {response.status_code}")
                print(f"     {response.text}")
        except Exception as e:
            print(f"  ❌ 请求异常: {e}")

def main():
    print("=" * 60)
    print("  memPet-server 诊断工具")
    print("=" * 60)
    
    # 检查环境变量
    print("\n环境配置:")
    print(f"  DATABASE_PROVIDER: {os.getenv('DATABASE_PROVIDER', 'sqlite')}")
    print(f"  OPENAI_API_KEY: {'已设置' if os.getenv('OPENAI_API_KEY') else '未设置'}")
    
    # 检查数据库
    print("\n" + "=" * 60)
    print("  检查数据库")
    print("=" * 60)
    
    provider = os.getenv("DATABASE_PROVIDER", "sqlite")
    if provider == "sqlite":
        check_sqlite_data()
    elif provider == "postgres":
        check_postgres_data()
    else:
        print(f"❌ 未知的数据库类型: {provider}")
    
    # 测试检索
    test_retrieve()
    
    print("\n" + "=" * 60)
    print("  诊断完成")
    print("=" * 60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n已中断")
    except Exception as e:
        print(f"\n❌ 诊断失败: {e}")
        import traceback
        traceback.print_exc()
