"""
测试 /memorize 接口
"""
import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

# 测试数据
conversation = {
    "content": [
        {
            "role": "user",
            "content": {"text": "我今天学习了 Python 编程"},
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        },
        {
            "role": "assistant",
            "content": {"text": "很好！Python 是一门很实用的语言"},
            "created_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }
    ]
}

print("发送记忆存储请求...")
print(f"URL: {BASE_URL}/memorize")
print(f"数据: {json.dumps(conversation, indent=2, ensure_ascii=False)}")

try:
    response = requests.post(f"{BASE_URL}/memorize", json=conversation, timeout=60)
    
    print(f"\n状态码: {response.status_code}")
    print("响应内容:")
    print(json.dumps(response.json(), indent=2, ensure_ascii=False))
    
    if response.status_code == 200:
        print("\n✓ 记忆存储成功！")
    else:
        print("\n✗ 记忆存储失败")
        
except Exception as e:
    print(f"\n✗ 请求失败: {e}")
    print("\n请确保:")
    print("1. memU-server 已启动 (uv run fastapi dev)")
    print("2. OPENAI_API_KEY 已设置")
