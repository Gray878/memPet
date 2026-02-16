"""
memU-server 完整接口测试脚本
"""
import requests
import json
from datetime import datetime
import time
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_health():
    """测试健康检查"""
    print("\n=== 测试 1: 健康检查 ===")
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"✓ 状态码: {response.status_code}")
        print(f"✓ 响应: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_memorize():
    """测试记忆存储"""
    print("\n=== 测试 2: 记忆存储 ===")
    try:
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
        
        print("发送请求...")
        response = requests.post(f"{BASE_URL}/memorize", json=conversation, timeout=60)
        print(f"✓ 状态码: {response.status_code}")
        
        result = response.json()
        
        # 如果是 500 错误，显示详细信息
        if response.status_code == 500:
            print(f"✗ 错误详情: {result.get('detail', '未知错误')}")
            return False
        
        print(f"✓ 响应状态: {result.get('status')}")
        
        # 打印部分结果（避免输出过长）
        if 'result' in result:
            print(f"✓ 记忆已存储")
        
        return response.status_code == 200
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def test_retrieve():
    """测试记忆检索"""
    print("\n=== 测试 3: 记忆检索 ===")
    try:
        # 等待一下让记忆处理完成
        print("等待记忆处理完成...")
        time.sleep(3)
        
        query = {"query": "我最近学了什么？"}
        print("发送检索请求...")
        response = requests.post(f"{BASE_URL}/retrieve", json=query, timeout=60)
        print(f"✓ 状态码: {response.status_code}")
        
        result = response.json()
        
        # 如果是 500 错误，显示详细信息
        if response.status_code == 500:
            print(f"✗ 错误详情: {result.get('detail', '未知错误')}")
            return False
        
        print(f"✓ 响应状态: {result.get('status')}")
        
        # 打印检索结果摘要
        if 'result' in result:
            print(f"✓ 检索到记忆")
        
        return response.status_code == 200
    except Exception as e:
        print(f"✗ 失败: {e}")
        return False

def main():
    print("=" * 60)
    print("memU-server 接口测试")
    print("=" * 60)
    print(f"测试目标: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 运行所有测试
    results = []
    results.append(("健康检查", test_health()))
    
    if results[0][1]:  # 如果健康检查通过
        results.append(("记忆存储", test_memorize()))
        results.append(("记忆检索", test_retrieve()))
    else:
        print("\n✗ 健康检查失败，跳过后续测试")
        print("请确保:")
        print("1. memU-server 已启动 (uv run fastapi dev)")
        print("2. 服务运行在 http://127.0.0.1:8000")
        sys.exit(1)
    
    # 打印总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name}: {status}")
    
    # 统计
    passed = sum(1 for _, r in results if r)
    total = len(results)
    print(f"\n总计: {passed}/{total} 通过")
    
    if passed == total:
        print("\n🎉 所有测试通过！memU-server 工作正常。")
        return 0
    else:
        print("\n⚠️  部分测试失败，请检查错误信息。")
        return 1

if __name__ == "__main__":
    sys.exit(main())
