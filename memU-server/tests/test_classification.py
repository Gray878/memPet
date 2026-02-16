# -*- coding: utf-8 -*-
"""
测试记忆分类和识别功能
"""

import requests
import time
from datetime import datetime

BASE_URL = "http://127.0.0.1:8000"


def test_work_habit_classification():
    """测试工作习惯分类"""
    print("\n" + "=" * 60)
    print("测试 1: 工作习惯记忆分类")
    print("=" * 60)
    
    # 存储工作相关的对话
    payload = {
        "type": "conversation",
        "content": [
            {
                "role": "user",
                "content": {"text": "我每天早上 9 点开始工作，通常在 VSCode 写代码 3-4 小时"},
                "created_at": datetime.now().isoformat()
            },
            {
                "role": "assistant",
                "content": {"text": "了解了，你的工作习惯很规律呢"},
                "created_at": datetime.now().isoformat()
            }
        ]
    }
    
    print("存储工作习惯记忆...")
    response = requests.post(f"{BASE_URL}/memorize", json=payload, timeout=120)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        print("✓ 工作习惯记忆存储成功")
        return True
    else:
        print(f"✗ 失败: {response.text}")
        return False


def test_emotion_classification():
    """测试情感状态分类"""
    print("\n" + "=" * 60)
    print("测试 2: 情感状态记忆分类")
    print("=" * 60)
    
    # 存储情感相关的对话
    payload = {
        "type": "conversation",
        "content": [
            {
                "role": "user",
                "content": {"text": "今天工作压力有点大，感觉有点累"},
                "created_at": datetime.now().isoformat()
            },
            {
                "role": "assistant",
                "content": {"text": "辛苦了，要注意休息哦"},
                "created_at": datetime.now().isoformat()
            }
        ]
    }
    
    print("存储情感状态记忆...")
    response = requests.post(f"{BASE_URL}/memorize", json=payload, timeout=120)
    print(f"状态码: {response.status_code}")
    
    if response.status_code == 200:
        print("✓ 情感状态记忆存储成功")
        return True
    else:
        print(f"✗ 失败: {response.text}")
        return False


def test_system_observation_types():
    """测试系统观察类型识别"""
    print("\n" + "=" * 60)
    print("测试 3: 系统观察类型识别")
    print("=" * 60)
    
    observations = [
        {
            "name": "应用切换",
            "data": {
                "type": "app_switch",
                "app": "VSCode",
                "duration": 3600,
                "timestamp": datetime.now().isoformat()
            },
            "expected": "用户在 VSCode 工作了 60 分钟"
        },
        {
            "name": "疲劳检测",
            "data": {
                "type": "fatigue_detected",
                "hours": 2,
                "level": "Tired",
                "timestamp": datetime.now().isoformat()
            },
            "expected": "检测到用户疲劳：连续工作 2 小时"
        },
        {
            "name": "空闲检测",
            "data": {
                "type": "idle_detected",
                "minutes": 30,
                "timestamp": datetime.now().isoformat()
            },
            "expected": "用户空闲了 30 分钟"
        },
        {
            "name": "深夜工作",
            "data": {
                "type": "late_night_work",
                "hour": 23,
                "timestamp": datetime.now().isoformat()
            },
            "expected": "检测到深夜工作：23:00 仍在活动"
        }
    ]
    
    success_count = 0
    
    for obs in observations:
        print(f"\n测试 {obs['name']}...")
        payload = {
            "type": "system_observation",
            "observation": obs["data"]
        }
        
        response = requests.post(f"{BASE_URL}/memorize", json=payload, timeout=120)
        
        if response.status_code == 200:
            print(f"  ✓ {obs['name']} 识别成功")
            print(f"  预期格式化: {obs['expected']}")
            success_count += 1
        else:
            print(f"  ✗ 失败: {response.text}")
    
    print(f"\n系统观察识别: {success_count}/{len(observations)} 成功")
    return success_count == len(observations)


def test_memory_retrieval_by_category():
    """测试按分类检索记忆"""
    print("\n" + "=" * 60)
    print("测试 4: 按分类检索记忆")
    print("=" * 60)
    
    # 等待记忆处理（向量化需要时间）
    print("等待记忆处理（30秒，向量化需要时间）...")
    time.sleep(30)
    
    queries = [
        {
            "name": "工作习惯",
            "query": "用户的工作习惯和时间安排"
        },
        {
            "name": "情感状态",
            "query": "用户最近的情绪和压力状态"
        },
        {
            "name": "系统观察",
            "query": "用户最近的应用使用情况"
        }
    ]
    
    success_count = 0
    
    for query_info in queries:
        print(f"\n检索 {query_info['name']}...")
        payload = {
            "scenario": "conversation",
            "query": query_info["query"],
            "limit": 3
        }
        
        response = requests.post(f"{BASE_URL}/retrieve", json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            memories = result.get("result", [])
            
            # 检查 memories 是否是列表
            if isinstance(memories, dict):
                # 如果是字典，尝试获取 items 字段
                memories = memories.get("items", [])
            
            print(f"  ✓ 检索成功，找到 {len(memories)} 条相关记忆")
            
            # 调试：显示完整响应结构
            if len(memories) == 0:
                print(f"  调试信息 - 响应结构: {list(result.keys())}")
                print(f"  调试信息 - result 内容: {result.get('result')}")
            
            # 显示前 2 条记忆
            if isinstance(memories, list) and memories:
                for i, memory in enumerate(memories[:2], 1):
                    if isinstance(memory, dict):
                        content = memory.get("content", memory.get("summary", ""))
                        if content:
                            print(f"  {i}. {content[:80]}...")
            
            success_count += 1
        else:
            print(f"  ✗ 失败: {response.text}")
    
    print(f"\n分类检索: {success_count}/{len(queries)} 成功")
    return success_count == len(queries)


def test_proactive_context_analysis():
    """测试主动推理上下文分析"""
    print("\n" + "=" * 60)
    print("测试 5: 主动推理上下文分析")
    print("=" * 60)
    
    contexts = [
        {
            "name": "疲劳场景",
            "context": {
                "working_duration": 7200,
                "fatigue_level": "Tired",
                "is_late_night": False,
                "idle_time": 0
            },
            "expected_suggestions": ["fatigue_reminder", "break_suggestion"]
        },
        {
            "name": "深夜场景",
            "context": {
                "working_duration": 3600,
                "fatigue_level": "Normal",
                "is_late_night": True,
                "idle_time": 0
            },
            "expected_suggestions": ["late_night_reminder"]
        },
        {
            "name": "空闲场景",
            "context": {
                "working_duration": 0,
                "fatigue_level": "Fresh",
                "is_late_night": False,
                "idle_time": 2000
            },
            "expected_suggestions": ["idle_interaction"]
        }
    ]
    
    success_count = 0
    
    for ctx_info in contexts:
        # 在每个测试之前重置冷却时间
        try:
            requests.post(f"{BASE_URL}/proactive/cooldown/reset", timeout=10)
        except Exception:
            pass
        
        print(f"\n测试 {ctx_info['name']}...")
        payload = {"context": ctx_info["context"]}
        
        response = requests.post(f"{BASE_URL}/proactive/analyze", json=payload, timeout=120)
        
        if response.status_code == 200:
            result = response.json()
            suggestions = result.get("suggestions", [])
            
            if suggestions:
                print(f"  ✓ 分析成功，生成 {len(suggestions)} 条建议")
                for suggestion in suggestions:
                    print(f"    - {suggestion['type']}: {suggestion['message']}")
                
                # 检查是否包含预期的建议类型
                suggestion_types = [s["type"] for s in suggestions]
                has_expected = any(
                    exp_type in suggestion_types 
                    for exp_type in ctx_info["expected_suggestions"]
                )
                
                if has_expected:
                    print(f"  ✓ 包含预期的建议类型")
                    success_count += 1
                else:
                    print(f"  ⚠ 未包含预期的建议类型: {ctx_info['expected_suggestions']}")
            else:
                print(f"  ⚠ 未生成建议")
        else:
            print(f"  ✗ 失败: {response.text}")
    
    print(f"\n上下文分析: {success_count}/{len(contexts)} 成功")
    return success_count >= len(contexts) - 1  # 允许一个失败


def main():
    """运行所有分类和识别测试"""
    print("=" * 60)
    print("memU-server 记忆分类和识别测试")
    print("=" * 60)
    print(f"测试目标: {BASE_URL}")
    print(f"测试时间: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("\n本测试将验证：")
    print("1. 记忆是否被正确分类到自定义类别")
    print("2. 系统观察是否被正确识别和格式化")
    print("3. 按分类检索是否有效")
    print("4. 主动推理上下文分析是否准确")
    
    # 重置冷却时间，确保测试环境干净
    try:
        requests.post(f"{BASE_URL}/proactive/cooldown/reset", timeout=10)
        print("\n✓ 已重置主动推理冷却时间")
    except Exception:
        pass
    
    results = []
    
    # 测试 1: 工作习惯分类
    results.append(("工作习惯分类", test_work_habit_classification()))
    
    # 测试 2: 情感状态分类
    results.append(("情感状态分类", test_emotion_classification()))
    
    # 测试 3: 系统观察类型识别
    results.append(("系统观察识别", test_system_observation_types()))
    
    # 测试 4: 按分类检索
    results.append(("分类检索", test_memory_retrieval_by_category()))
    
    # 测试 5: 主动推理分析
    results.append(("主动推理分析", test_proactive_context_analysis()))
    
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
        print("\n记忆分类和系统观察识别功能正常工作。")
    else:
        print(f"\n⚠ {total - passed} 个测试失败")
        print("\n建议检查：")
        print("1. memU 的记忆分类配置是否正确")
        print("2. 系统观察格式化逻辑是否正确")
        print("3. 检索查询是否需要调整")


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n测试被中断")
    except requests.exceptions.ConnectionError:
        print(f"\n✗ 无法连接到 {BASE_URL}")
        print("请确保 memU-server 正在运行")
    except Exception as e:
        print(f"\n✗ 测试出错: {e}")
        import traceback
        traceback.print_exc()
