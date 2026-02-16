# -*- coding: utf-8 -*-
"""
主动推理调试脚本
"""

import sys
from pathlib import Path

# 添加项目根目录到 Python 路径
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from app.services.proactive_helper import ProactiveHelper

print("=" * 60)
print("主动推理调试")
print("=" * 60)

helper = ProactiveHelper()

# 测试场景 1：疲劳场景
print("\n测试场景 1：疲劳场景")
context1 = {
    "working_duration": 7200,  # 2小时
    "fatigue_level": "Tired",
    "is_late_night": False,
    "idle_time": 0
}
print(f"上下文: {context1}")

suggestions1 = helper.analyze_context(context1)
print(f"生成建议数: {len(suggestions1)}")
for s in suggestions1:
    print(f"  - {s['type']}: {s['message']}")

# 测试场景 2：深夜场景
print("\n测试场景 2：深夜场景")
helper.reset_cooldown()  # 重置冷却
context2 = {
    "working_duration": 3600,
    "fatigue_level": "Normal",
    "is_late_night": True,
    "idle_time": 0
}
print(f"上下文: {context2}")

suggestions2 = helper.analyze_context(context2)
print(f"生成建议数: {len(suggestions2)}")
for s in suggestions2:
    print(f"  - {s['type']}: {s['message']}")

# 测试场景 3：空闲场景
print("\n测试场景 3：空闲场景")
helper.reset_cooldown()  # 重置冷却
context3 = {
    "working_duration": 0,
    "fatigue_level": "Fresh",
    "is_late_night": False,
    "idle_time": 2000  # 33分钟
}
print(f"上下文: {context3}")

suggestions3 = helper.analyze_context(context3)
print(f"生成建议数: {len(suggestions3)}")
for s in suggestions3:
    print(f"  - {s['type']}: {s['message']}")

print("\n" + "=" * 60)
print("调试完成")
print("=" * 60)
