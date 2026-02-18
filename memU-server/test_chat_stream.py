#!/usr/bin/env python3
import requests
import json

url = "http://127.0.0.1:8000/chat/stream"
payload = {"message": "你好"}

print("测试 /chat/stream 接口...")
print(f"URL: {url}")
print(f"Payload: {payload}")
print("-" * 50)

try:
    response = requests.post(url, json=payload, stream=True, timeout=30)
    print(f"状态码: {response.status_code}")
    print("响应内容:")
    
    for line in response.iter_lines():
        if line:
            print(line.decode('utf-8'))
            
except Exception as e:
    print(f"错误: {e}")
    import traceback
    traceback.print_exc()
