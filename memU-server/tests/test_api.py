#!/usr/bin/env python3
"""
memU-server 完整 API 测试
"""

import requests
import json
import time
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"

def print_section(title):
    print("\n" + "=" * 60)
    print(f"  {title}")
    print("=" * 60)

def check_server():
    """检查服务器是否运行"""
    print_section("0. 健康检查")
    try:
        # 测试根路径（增加超时时间，首次请求可能需要初始化）
        response = requests.get(f"{BASE_URL}/", timeout=30)  # ✅ 增加到 30 秒
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 服务器正在运行")
            print(f"  版本: {data.get('version')}")
            print(f"  状态: {data.get('status')}")
        
        # 测试 /health 接口
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        if response.status_code == 200:
            data = response.json()
            print(f"✓ 健康检查通过")
            print(f"  数据库: {data.get('database')}")
            print(f"  LLM: {data.get('llm')}")
            return True
        
        return False
    except requests.exceptions.Timeout:
        print(f"✗ 服务器响应超时（可能正在初始化）")
        print(f"  提示：首次启动需要 10-30 秒初始化")
        print(f"  建议：等待片刻后重试")
        return False
    except Exception as e:
        print(f"✗ 无法连接到服务器: {e}")
        print(f"\n请确保 memU-server 已启动:")
        print(f"  cd memU-server")
        print(f"  uv run fastapi dev app/main.py")
        return False

def test_memorize():
    """测试 POST /memorize - 存储记忆"""
    print_section("1. POST /memorize - 存储记忆")
    
    test_cases = [
        {
            "name": "对话记忆 1",
            "data": {
                "messages": [
                    {"role": "user", "content": "我今天写了 500 行 Python 代码"},
                    {"role": "assistant", "content": "很棒！你在做什么项目？"}
                ]
            }
        },
        {
            "name": "对话记忆 2",
            "data": {
                "messages": [
                    {"role": "user", "content": "我使用了 JWT Token 认证"},
                    {"role": "assistant", "content": "JWT 是很好的选择"}
                ]
            }
        },
        {
            "name": "系统观察",
            "data": {
                "type": "system_observation",
                "observation": {
                    "type": "app_switch",
                    "app": "VSCode",
                    "duration": 3600,
                    "timestamp": datetime.now().isoformat()
                }
            }
        }
    ]
    
    success_count = 0
    for test in test_cases:
        print(f"\n测试: {test['name']}")
        try:
            response = requests.post(
                f"{BASE_URL}/memorize",
                json=test['data'],
                timeout=60
            )
            
            if response.status_code == 200:
                print(f"  ✓ 存储成功")
                success_count += 1
                time.sleep(1)  # 避免请求过快
            else:
                print(f"  ✗ 存储失败: {response.status_code}")
                print(f"     {response.text}")
        except Exception as e:
            print(f"  ✗ 请求失败: {e}")
    
    print(f"\n存储统计: {success_count}/{len(test_cases)} 成功")
    
    # 等待向量化处理
    if success_count > 0:
        print("\n等待记忆处理（向量化需要时间）...")
        time.sleep(3)
    
    return success_count > 0

def test_retrieve():
    """测试 POST /retrieve - 检索记忆"""
    print_section("2. POST /retrieve - 检索记忆")
    
    test_cases = [
        {
            "name": "对话场景 - 代码",
            "data": {
                "scenario": "conversation",
                "query": "我今天写了多少代码？",
                "limit": 3
            }
        },
        {
            "name": "对话场景 - 认证",
            "data": {
                "scenario": "conversation",
                "query": "我用的什么认证方案？",
                "limit": 3
            }
        },
        {
            "name": "对话场景 - Python",
            "data": {
                "scenario": "conversation",
                "query": "Python",
                "limit": 5
            }
        },
        {
            "name": "主动推理场景",
            "data": {
                "scenario": "proactive",
                "context": {
                    "working_duration": 7200,
                    "active_app": "VSCode",
                    "fatigue_level": "Tired"
                },
                "limit": 3
            }
        }
    ]
    
    success_count = 0
    for i, test in enumerate(test_cases):
        print(f"\n测试: {test['name']}")
        try:
            # 远程数据库的向量搜索需要更长时间
            timeout = 90
            
            response = requests.post(
                f"{BASE_URL}/retrieve",
                json=test['data'],
                timeout=timeout
            )
            
            if response.status_code == 200:
                result = response.json()
                items = result.get("result", {}).get("items", [])
                print(f"  ✓ 找到 {len(items)} 条记忆")
                
                # 显示前 2 条
                for i, item in enumerate(items[:2], 1):
                    summary = item.get("summary", "N/A")
                    score = item.get("score", 0)
                    print(f"    {i}. [{score:.2f}] {summary[:60]}...")
                
                success_count += 1
            else:
                print(f"  ✗ 检索失败: {response.status_code}")
                print(f"     {response.text}")
        except Exception as e:
            print(f"  ✗ 请求失败: {e}")
    
    print(f"\n检索统计: {success_count}/{len(test_cases)} 成功")
    return success_count > 0

def test_chat():
    """测试 POST /chat - 记忆增强对话"""
    print_section("4. POST /chat - 记忆增强对话")
    
    test_cases = [
        {
            "name": "询问今天做了什么",
            "data": {
                "message": "你还记得我今天做了什么吗？",
                "personality": "friendly",
                "use_memory": True
            }
        },
        {
            "name": "询问认证方案",
            "data": {
                "message": "我用的是什么认证方案？",
                "personality": "professional",
                "use_memory": True
            }
        },
        {
            "name": "不使用记忆",
            "data": {
                "message": "今天天气怎么样？",
                "personality": "friendly",
                "use_memory": False
            }
        }
    ]
    
    success_count = 0
    for test in test_cases:
        print(f"\n测试: {test['name']}")
        try:
            # chat 接口内部调用 retrieve + LLM，需要更长时间
            response = requests.post(
                f"{BASE_URL}/chat",
                json=test['data'],
                timeout=90
            )
            
            if response.status_code == 200:
                result = response.json()
                answer = result.get("response", "")
                memory_used = result.get("memory_used", False)
                memories_count = result.get("memories_used", 0)
                
                print(f"  ✓ 回复: {answer[:100]}...")
                print(f"    使用记忆: {memory_used} ({memories_count} 条)")
                success_count += 1
            else:
                print(f"  ✗ 对话失败: {response.status_code}")
                print(f"     {response.text}")
        except Exception as e:
            print(f"  ✗ 请求失败: {e}")
    
    print(f"\n对话统计: {success_count}/{len(test_cases)} 成功")
    return success_count > 0

def test_proactive_analyze():
    """测试 POST /proactive/analyze - 主动推理分析"""
    print_section("5. POST /proactive/analyze - 主动推理分析")
    
    test_cases = [
        {
            "name": "疲劳检测",
            "data": {
                "context": {
                    "working_duration": 7200,
                    "active_app": "VSCode",
                    "fatigue_level": "Tired",
                    "is_late_night": False,
                    "idle_time": 0
                },
                "skip_cooldown": True  # 测试时跳过冷却检查
            }
        },
        {
            "name": "深夜工作",
            "data": {
                "context": {
                    "working_duration": 3600,
                    "active_app": "VSCode",
                    "fatigue_level": "Normal",
                    "is_late_night": True,
                    "idle_time": 0
                },
                "skip_cooldown": True  # 测试时跳过冷却检查
            }
        }
    ]
    
    success_count = 0
    suggestions_for_next_test = None  # 保存建议供下一个测试使用
    
    for test in test_cases:
        print(f"\n测试: {test['name']}")
        try:
            response = requests.post(
                f"{BASE_URL}/proactive/analyze",
                json=test['data'],
                timeout=10
            )
            
            if response.status_code == 200:
                result = response.json()
                suggestions = result.get("suggestions", [])
                print(f"  ✓ 生成 {len(suggestions)} 条建议")
                
                for i, suggestion in enumerate(suggestions, 1):
                    print(f"    {i}. {suggestion.get('type')} - {suggestion.get('message')}")
                
                # 保存第一个建议供 generate 测试使用
                if suggestions and not suggestions_for_next_test:
                    suggestions_for_next_test = suggestions[0]
                
                success_count += 1
            else:
                print(f"  ✗ 分析失败: {response.status_code}")
                print(f"     {response.text}")
        except Exception as e:
            print(f"  ✗ 请求失败: {e}")
    
    print(f"\n分析统计: {success_count}/{len(test_cases)} 成功")
    return success_count > 0, suggestions_for_next_test

def test_proactive_generate(suggestion=None):
    """测试 POST /proactive/generate - 生成主动推理消息"""
    print_section("6. POST /proactive/generate - 生成主动推理消息")
    
    # 如果没有传入建议，使用默认的
    if not suggestion:
        suggestion = {
            "type": "fatigue_reminder",
            "priority": "high",
            "message": "检测到疲劳",
            "reason": "连续工作 2 小时",
            "action": "建议休息 10 分钟"
        }
    
    test_data = {
        "suggestion": suggestion,
        "context": {
            "working_duration": 7200,
            "fatigue_level": "Tired"
        },
        "personality": "friendly",
        "limit": 3
    }
    
    print(f"\n测试: 生成消息（建议类型: {suggestion.get('type')}）")
    try:
        # generate 接口需要调用 retrieve + LLM
        response = requests.post(
            f"{BASE_URL}/proactive/generate",
            json=test_data,
            timeout=90
        )
        
        if response.status_code == 200:
            result = response.json()
            message = result.get("message", "")
            memories = result.get("memories", [])
            
            print(f"  ✓ 生成消息成功")
            print(f"    消息: {message[:100]}...")
            print(f"    使用记忆: {len(memories)} 条")
            return True
        else:
            print(f"  ✗ 生成失败: {response.status_code}")
            print(f"     {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ 请求失败: {e}")
        return False

def test_proactive_quick():
    """测试 POST /proactive/quick - 快捷主动推理"""
    print_section("7. POST /proactive/quick - 快捷主动推理")
    
    test_data = {
        "context": {
            "working_duration": 7200,
            "active_app": "VSCode",
            "fatigue_level": "Tired",
            "is_late_night": False,
            "idle_time": 0,
            "is_work_hours": True,
            "focus_level": "NormalFocus"
        },
        "personality": "friendly",
        "limit": 3
    }
    
    print("\n测试: 快捷主动推理（一步完成）")
    try:
        # quick 接口可能需要调用 retrieve + LLM
        response = requests.post(
            f"{BASE_URL}/proactive/quick",
            json=test_data,
            timeout=90
        )
        
        if response.status_code == 200:
            result = response.json()
            message = result.get("message")
            suggestion = result.get("suggestion")
            memories = result.get("memories", [])
            
            if message:
                print(f"  ✓ 生成消息成功")
                print(f"    消息: {message[:100]}...")
                print(f"    建议类型: {suggestion.get('type') if suggestion else 'N/A'}")
                print(f"    使用记忆: {len(memories)} 条")
            else:
                print(f"  ✓ 无需主动推理（当前状态正常）")
            return True
        else:
            print(f"  ✗ 生成失败: {response.status_code}")
            print(f"     {response.text}")
            return False
    except Exception as e:
        print(f"  ✗ 请求失败: {e}")
        return False

def test_proactive_cooldown():
    """测试 GET /proactive/cooldown - 获取冷却状态"""
    print_section("8. GET /proactive/cooldown - 获取冷却状态")
    
    print("\n测试: 获取冷却状态")
    try:
        response = requests.get(
            f"{BASE_URL}/proactive/cooldown",
            timeout=5
        )
        
        if response.status_code == 200:
            result = response.json()
            cooldowns = result.get("cooldowns", {})
            
            print(f"  ✓ 获取成功")
            print(f"    冷却项数量: {len(cooldowns)}")
            
            for suggestion_type, status in list(cooldowns.items())[:3]:
                can_trigger = status.get("can_trigger", False)
                remaining = status.get("remaining_seconds", 0)
                print(f"    - {suggestion_type}: {'可触发' if can_trigger else f'冷却中 ({remaining}s)'}")
            
            return True
        else:
            print(f"  ✗ 获取失败: {response.status_code}")
            return False
    except Exception as e:
        print(f"  ✗ 请求失败: {e}")
        return False

def main():
    print_section("memU-server 完整 API 测试")
    print(f"时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"服务器: {BASE_URL}")
    
    # 0. 健康检查
    if not check_server():
        print("\n✗ 服务器未运行，终止测试")
        return
    
    # 统计结果
    results = {}
    
    # 1. 存储记忆
    print("\n提示：首次存储可能需要 30-60 秒（初始化向量化模型）")
    results['memorize'] = test_memorize()
    
    # 2. 检索记忆
    results['retrieve'] = test_retrieve()
    
    # 3. 对话
    results['chat'] = test_chat()
    
    # 4. 主动推理分析
    analyze_success, suggestion = test_proactive_analyze()
    results['proactive_analyze'] = analyze_success
    
    # 5. 生成主动推理消息（使用 analyze 返回的建议）
    results['proactive_generate'] = test_proactive_generate(suggestion)
    
    # 6. 快捷主动推理
    results['proactive_quick'] = test_proactive_quick()
    
    # 7. 冷却状态
    results['proactive_cooldown'] = test_proactive_cooldown()
    
    # 总结
    print_section("测试总结")
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    print(f"\n通过: {passed}/{total}")
    print("\n详细结果:")
    for name, result in results.items():
        status = "✓ 通过" if result else "✗ 失败"
        print(f"  {name:20s} {status}")
    
    if passed == total:
        print("\n🎉 所有测试通过！")
    else:
        print(f"\n⚠️  {total - passed} 个测试失败")

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试被中断")
    except Exception as e:
        print(f"\n✗ 测试失败: {e}")
        import traceback
        traceback.print_exc()
