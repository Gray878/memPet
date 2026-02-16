"""
测试 /retrieve 接口
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

# 测试查询
query = {"query": "我最近学了什么？"}

print("发送记忆检索请求...")
print(f"URL: {BASE_URL}/retrieve")
print(f"查询: {query['query']}")

try:
    response = requests.post(f"{BASE_URL}/retrieve", json=query, timeout=60)
    
    print(f"\n状态码: {response.status_code}")
    print("响应内容:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    if response.status_code == 200:
        print("\n✓ 记忆检索成功！")
    else:
        print("\n✗ 记忆检索失败")
        
except Exception as e:
    print(f"\n✗ 请求失败: {e}")
    print("\n请确保:")
    print("1. memU-server 已启动 (uv run fastapi dev)")
    print("2. 已经先调用 /memorize 存储了一些记忆")
