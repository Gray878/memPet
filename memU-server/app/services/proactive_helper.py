# -*- coding: utf-8 -*-
"""
主动推理辅助模块

为桌面宠物的主动推理提供辅助功能：
- 规则匹配
- 建议生成
- 冷却时间管理
"""

import time
from typing import Any, Optional
from datetime import datetime, timedelta


class ProactiveHelper:
    """主动推理辅助类"""

    def __init__(self):
        """初始化"""
        self.last_suggestion_time: dict[str, float] = {}  # 记录每种建议的最后触发时间
        self.cooldown_periods = {
            "fatigue_reminder": 1800,      # 疲劳提醒：30分钟冷却
            "late_night_reminder": 3600,   # 深夜提醒：1小时冷却
            "idle_interaction": 1800,      # 空闲互动：30分钟冷却
            "break_suggestion": 1800,      # 休息建议：30分钟冷却
            "hydration_reminder": 3600,    # 喝水提醒：1小时冷却
        }

    def should_trigger(self, suggestion_type: str) -> bool:
        """
        检查是否应该触发建议（冷却时间检查）
        
        Args:
            suggestion_type: 建议类型
        
        Returns:
            是否应该触发
        """
        current_time = time.time()
        last_time = self.last_suggestion_time.get(suggestion_type, 0)
        cooldown = self.cooldown_periods.get(suggestion_type, 1800)
        
        if current_time - last_time >= cooldown:
            self.last_suggestion_time[suggestion_type] = current_time
            return True
        
        return False

    def analyze_context(self, context: dict[str, Any]) -> list[dict[str, Any]]:
        """
        分析上下文，生成建议列表
        
        Args:
            context: 系统上下文，包含：
                - working_duration: 工作时长（秒）
                - active_app: 当前活动应用
                - fatigue_level: 疲劳级别
                - is_late_night: 是否深夜
                - idle_time: 空闲时间（秒）
                - is_work_hours: 是否工作时间
                - focus_level: 专注级别
        
        Returns:
            建议列表，每个建议包含：
                - type: 建议类型
                - priority: 优先级（high, medium, low）
                - message: 建议内容
                - action: 建议的操作
        """
        suggestions = []
        
        working_duration = context.get("working_duration", 0)
        fatigue_level = context.get("fatigue_level", "Normal")
        is_late_night = context.get("is_late_night", False)
        idle_time = context.get("idle_time", 0)
        focus_level = context.get("focus_level", "NormalFocus")
        
        # 1. 疲劳提醒（高优先级）
        if fatigue_level == "Exhausted" and self.should_trigger("fatigue_reminder"):
            suggestions.append({
                "type": "fatigue_reminder",
                "priority": "high",
                "message": "检测到极度疲劳",
                "reason": f"连续工作 {working_duration // 3600} 小时",
                "action": "建议立即休息 15-20 分钟"
            })
        elif fatigue_level == "Tired" and self.should_trigger("fatigue_reminder"):
            suggestions.append({
                "type": "fatigue_reminder",
                "priority": "medium",
                "message": "检测到疲劳",
                "reason": f"连续工作 {working_duration // 3600} 小时",
                "action": "建议休息 10 分钟"
            })
        
        # 2. 深夜工作提醒（高优先级）
        if is_late_night and self.should_trigger("late_night_reminder"):
            suggestions.append({
                "type": "late_night_reminder",
                "priority": "high",
                "message": "深夜工作提醒",
                "reason": "已经很晚了",
                "action": "建议早点休息，保持健康作息"
            })
        
        # 3. 空闲互动（低优先级）
        if idle_time > 1800 and self.should_trigger("idle_interaction"):
            suggestions.append({
                "type": "idle_interaction",
                "priority": "low",
                "message": "空闲互动",
                "reason": f"空闲了 {idle_time // 60} 分钟",
                "action": "要不要聊聊天？"
            })
        
        # 4. 定时休息建议（中优先级）
        if working_duration > 3600 and working_duration % 3600 < 300:  # 每小时提醒一次
            if self.should_trigger("break_suggestion"):
                suggestions.append({
                    "type": "break_suggestion",
                    "priority": "medium",
                    "message": "定时休息提醒",
                    "reason": f"已工作 {working_duration // 3600} 小时",
                    "action": "建议站起来活动一下，看看远处"
                })
        
        # 5. 喝水提醒（低优先级）
        if working_duration > 3600 and self.should_trigger("hydration_reminder"):
            suggestions.append({
                "type": "hydration_reminder",
                "priority": "low",
                "message": "喝水提醒",
                "reason": "工作一段时间了",
                "action": "记得喝点水哦"
            })
        
        # 按优先级排序
        priority_order = {"high": 0, "medium": 1, "low": 2}
        suggestions.sort(key=lambda x: priority_order.get(x["priority"], 3))
        
        return suggestions

    def format_suggestion_for_llm(
        self,
        suggestion: dict[str, Any],
        memories: list[dict[str, Any]],
        personality: str = "friendly"
    ) -> str:
        """
        格式化建议为 LLM prompt
        
        Args:
            suggestion: 建议内容
            memories: 相关记忆
            personality: 性格类型
        
        Returns:
            格式化的 prompt
        """
        # 性格描述
        personality_prompts = {
            "friendly": "你是一个温和友善的桌面宠物，总是关心用户。使用温暖的语气词。",
            "energetic": "你是一个充满活力的桌面宠物，热情洋溢。使用感叹号和表情。",
            "professional": "你是一个专业的助手，简洁高效。基于数据给出建议。",
            "tsundere": "你是一个傲娇的桌面宠物，表面高冷内心温柔。先否定再转折。"
        }
        
        personality_desc = personality_prompts.get(personality, personality_prompts["friendly"])
        
        # 构建 prompt
        prompt = f"""
{personality_desc}

当前情况：
- 类型：{suggestion['message']}
- 原因：{suggestion['reason']}
- 建议：{suggestion['action']}

相关记忆：
"""
        
        if memories:
            for i, memory in enumerate(memories[:3], 1):
                content = memory.get("content", memory.get("summary", ""))
                prompt += f"{i}. {content}\n"
        else:
            prompt += "（暂无相关记忆）\n"
        
        prompt += """
请根据以上信息，生成一句简短、自然、符合性格的关心话语（不超过 50 字）。
不要重复上述内容，要用自己的话表达。
"""
        
        return prompt

    def get_cooldown_status(self) -> dict[str, Any]:
        """
        获取所有建议类型的冷却状态
        
        Returns:
            冷却状态字典
        """
        current_time = time.time()
        status = {}
        
        for suggestion_type, cooldown in self.cooldown_periods.items():
            last_time = self.last_suggestion_time.get(suggestion_type, 0)
            remaining = max(0, cooldown - (current_time - last_time))
            
            status[suggestion_type] = {
                "cooldown_seconds": cooldown,
                "remaining_seconds": int(remaining),
                "can_trigger": remaining == 0,
                "last_triggered": datetime.fromtimestamp(last_time).isoformat() if last_time > 0 else None
            }
        
        return status

    def reset_cooldown(self, suggestion_type: Optional[str] = None) -> None:
        """
        重置冷却时间
        
        Args:
            suggestion_type: 建议类型，如果为 None 则重置所有
        """
        if suggestion_type:
            self.last_suggestion_time.pop(suggestion_type, None)
        else:
            self.last_suggestion_time.clear()
