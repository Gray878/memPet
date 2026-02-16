# -*- coding: utf-8 -*-
"""
简单测试脚本 - 只测试核心功能
"""

import requests
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


def test_health():
    """测试 1: 健康检查"""
    print("\n" + "=" * 60)
    print("测试 1: 健康检查")
    print("=" * 60)
    
    try:
        response = requests.get(f"{BASE_URL}/")
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            print(f"响应: {response.json()}")
            print("✓ 健康检查通过")
            return True
        else:
            print(f"✗ 失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 错误: {e}")
        return False


def test_memorize():
    """测试 2: 记忆存储"""
    print("\n" + "=" * 60)
    print("测试 2: 记忆存储")
    print("=" * 60)
    
    try:
        # 测试对话记忆
        payload = {
            "type": "conversation",
            "content": [
                {
                    "role": "user",
                    "content": {"text": "测试消息：我今天工作了 8 小时"},
                    "created_at": datetime.now().isoformat()
                }
            ]
        }
        
        print("发送对话记忆...")
        response = requests.post(f"{BASE_URL}/memorize", json=payload)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            print("✓ 对话记忆存储成功")
            
            # 测试系统观察
            payload = {
                "type": "system_observation",
                "observation": {
                    "type": "app_switch",
                    "app": "VSCode",
                    "duration": 3600,
                    "timestamp": datetime.now().isoformat()
                }
            }
            
            print("\n发送系统观察...")
            response = requests.post(f"{BASE_URL}/memorize", json=payload)
            print(f"状态码: {response.status_code}")
            
            if response.status_code == 200:
                print("✓ 系统观察存储成功")
                return True
            else:
                print(f"✗ 失败: {response.text}")
                return False
        else:
            print(f"✗ 失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 错误: {e}")
        return False


def test_proactive():
    """测试 3: 主动推理"""
    print("\n" + "=" * 60)
    print("测试 3: 主动推理")
    print("=" * 60)
    
    try:
        # 测试分析
        payload = {
            "context": {
                "working_duration": 7200,
                "fatigue_level": "Tired",
                "is_late_night": False,
                "idle_time": 0
            }
        }
        
        print("发送上下文分析...")
        response = requests.post(f"{BASE_URL}/proactive/analyze", json=payload)
        print(f"状态码: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            suggestions = result.get("suggestions", [])
            print(f"✓ 分析成功，生成 {len(suggestions)} 条建议")
            
            if suggestions:
                print(f"  第一条建议: {suggestions[0].get('message', '')}")
            
            return True
        else:
            print(f"✗ 失败: {response.text}")
            return False
    except Exception as e:
        print(f"✗ 错误: {e}")
        return False


def main():
    """运行所有测试"""
    print("=" * 60)
    print("memU-server 简单测试")
    print("=" * 60)
    print(f"测试目标: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    results = []
    
    # 测试 1: 健康检查
    results.append(("健康检查", test_health()))
    
    # 测试 2: 记忆存储
    results.append(("记忆存储", test_memorize()))
    
    # 等待处理
    print("\n等待记忆处理（3秒）...")
    import time
    time.sleep(3)
    
    # 测试 3: 主动推理
    results.append(("主动推理", test_proactive()))
    
    # 总结
    print("\n" + "=" * 60)
    print("测试总结")
    print("=" * 60)
    
    passed = sum(1 for _, result in results if result)
    total = len(results)
    
    for name, result in results:
        status = "✓ 通过" if result else "✗ 失败"
        print(f"{name}: {status}")
    
    print(f"\n总计: {passed}/{total} 通过")
    
    if passed == total:
        print("\n✓ 所有测试通过！")
    else:
        print(f"\n⚠ {total - passed} 个测试失败")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试被中断")
    except requests.exceptions.ConnectionError:
        print(f"\n✗ 无法连接到 {BASE_URL}")
        print("请确保 memU-server 正在运行：")
        print("  cd memU-server")
        print("  uv run fastapi dev app/main.py")
    except Exception as e:
        print(f"\n✗ 测试出错: {e}")
        import traceback
        traceback.print_exc()
