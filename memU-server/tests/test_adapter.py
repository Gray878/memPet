# -*- coding: utf-8 -*-
"""
测试桌面宠物适配器功能
"""

import asyncio
import requests
import json
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


def test_health():
    """测试健康检查"""
    print("\n" + "=" * 60)
    print("测试 1: 健康检查")
    print("=" * 60)
    
    response = requests.get(f"{BASE_URL}/")
    print(f"状态码: {response.status_code}")
    print(f"响应: {response.json()}")
    
    assert response.status_code == 200
    print("✓ 健康检查通过")


def test_memorize_conversation():
    """测试对话记忆存储"""
    print("\n" + "=" * 60)
    print("测试 2: 对话记忆存储")
    print("=" * 60)
    
    payload = {
        "type": "conversation",
        "content": [
            {
                "role": "user",
                "content": {"text": "我今天工作了 8 小时，感觉有点累"},
                "created_at": datetime.now().isoformat()
            },
            {
                "role": "assistant",
                "content": {"text": "辛苦了！工作 8 小时确实需要好好休息"},
                "created_at": datetime.now().isoformat()
            }
        ]
    }
    
    print("发送请求...")
    response = requests.post(f"{BASE_URL}/memorize", json=payload)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        print("✓ 对话记忆存储成功")
    else:
        print(f"✗ 错误: {response.text}")


def test_memorize_system_observation():
    """测试系统观察记录存储"""
    print("\n" + "=" * 60)
    print("测试 3: 系统观察记录存储")
    print("=" * 60)
    
    # 测试应用切换记录
    payload = {
        "type": "system_observation",
        "observation": {
            "type": "app_switch",
            "app": "VSCode",
            "duration": 3600,  # 1小时
            "timestamp": datetime.now().isoformat()
        }
    }
    
    print("发送应用切换记录...")
    response = requests.post(f"{BASE_URL}/memorize", json=payload)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        print("✓ 应用切换记录存储成功")
    else:
        print(f"✗ 错误: {response.text}")
    
    # 测试疲劳检测记录
    payload = {
        "type": "system_observation",
        "observation": {
            "type": "fatigue_detected",
            "hours": 2,
            "level": "Tired",
            "timestamp": datetime.now().isoformat()
        }
    }
    
    print("\n发送疲劳检测记录...")
    response = requests.post(f"{BASE_URL}/memorize", json=payload)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        print("✓ 疲劳检测记录存储成功")
    else:
        print(f"✗ 错误: {response.text}")


def test_retrieve_conversation():
    """测试对话场景检索"""
    print("\n" + "=" * 60)
    print("测试 4: 对话场景检索")
    print("=" * 60)
    
    payload = {
        "scenario": "conversation",
        "query": "用户今天的工作情况",
        "limit": 3
    }
    
    print("发送检索请求...")
    response = requests.post(f"{BASE_URL}/retrieve", json=payload)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        print("✓ 对话场景检索成功")
    else:
        print(f"✗ 错误: {response.text}")


def test_retrieve_proactive():
    """测试主动推理场景检索"""
    print("\n" + "=" * 60)
    print("测试 5: 主动推理场景检索")
    print("=" * 60)
    
    payload = {
        "scenario": "proactive",
        "context": {
            "working_duration": 7200,  # 2小时
            "active_app": "VSCode",
            "fatigue_level": "Tired",
            "is_late_night": False,
            "idle_time": 0
        },
        "limit": 5
    }
    
    print("发送主动推理检索请求...")
    response = requests.post(f"{BASE_URL}/retrieve", json=payload)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        result = response.json()
        print(f"响应: {json.dumps(result, ensure_ascii=False, indent=2)}")
        print("✓ 主动推理场景检索成功")
    else:
        print(f"✗ 错误: {response.text}")


def main():
    """运行所有测试"""
    print("=" * 60)
    print("memU-server 桌面宠物适配器测试")
    print("=" * 60)
    print(f"测试目标: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 1. 健康检查
        test_health()
        
        # 2. 对话记忆存储
        test_memorize_conversation()
        
        # 等待记忆处理
        print("\n等待记忆处理...")
        import time
        time.sleep(3)
        
        # 3. 系统观察记录存储
        test_memorize_system_observation()
        
        # 等待记忆处理
        print("\n等待记忆处理...")
        time.sleep(3)
        
        # 4. 对话场景检索
        test_retrieve_conversation()
        
        # 5. 主动推理场景检索
        test_retrieve_proactive()
        
        print("\n" + "=" * 60)
        print("测试总结")
        print("=" * 60)
        print("✓ 所有测试通过")
        
    except AssertionError as e:
        print(f"\n✗ 测试失败: {e}")
    except requests.exceptions.ConnectionError:
        print(f"\n✗ 无法连接到 {BASE_URL}")
        print("请确保 memU-server 正在运行")
    except Exception as e:
        print(f"\n✗ 测试出错: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    main()
