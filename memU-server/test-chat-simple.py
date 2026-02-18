#!/usr/bin/env python3
"""
快速测试 /chat 接口（非流式）
"""
import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_chat():
    print("测试 /chat 接口...")
    
    payload = {
        "message": "你好",
        "personality": "friendly"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat",
            json=payload,
            timeout=30
        )
        
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"响应: {result.get('response', '')}")
            print(f"使用记忆数: {result.get('memories_used', 0)}")
            print("✓ 测试通过")
        else:
            print(f"✗ 测试失败: {response.text}")
            
    except Exception as e:
        print(f"✗ 请求失败: {e}")

if __name__ == "__main__":
    test_chat()
