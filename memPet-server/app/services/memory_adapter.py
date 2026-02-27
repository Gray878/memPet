# -*- coding: utf-8 -*-
"""
桌面宠物记忆适配器

为桌面宠物场景提供记忆存储和检索的适配功能：
- 自定义记忆分类（工作习惯、情感状态等）
- 系统观察记录的格式化
- 主动推理场景的检索增强
- 高频数据的过滤和聚合
"""

import time
from typing import Any, Optional
from datetime import datetime

from memu.app import MemoryService


class MemoryAdapter:
    """桌面宠物记忆适配器"""

    # 桌面宠物专用的记忆分类
    DESKTOP_PET_CATEGORIES = [
        {
            "name": "工作习惯",
            "description": "用户的工作模式、时长、常用应用、工作节奏等行为模式"
        },
        {
            "name": "情感状态",
            "description": "用户的情绪变化、压力水平、疲劳度、心理状态等"
        },
        {
            "name": "互动历史",
            "description": "用户与宠物的对话、反馈、互动记录、偏好设置等"
        },
        {
            "name": "日常行为",
            "description": "作息时间、活动模式、休息习惯、生活规律等"
        },
        {
            "name": "兴趣爱好",
            "description": "用户的兴趣、爱好、娱乐活动、学习内容等"
        }
    ]

    def __init__(self, memu_service: MemoryService):
        """
        初始化适配器
        
        Args:
            memu_service: memU 核心服务实例
        """
        self.service = memu_service
        self.observation_buffer: list[dict[str, Any]] = []  # 观察记录缓冲区
        self.last_flush_time = time.time()
        self.buffer_size_limit = 10  # 缓冲区大小限制
        self.flush_interval = 300  # 刷新间隔（秒）：5分钟

    async def memorize_conversation(
        self,
        content: list[dict[str, Any]],
        file_path: str,
        user_id: str | None = None  # ✅ 添加 user_id 参数
    ) -> dict[str, Any]:
        """
        存储对话记忆（标准场景）
        
        Args:
            content: 对话内容列表
            file_path: JSON 文件路径
            user_id: 用户 ID
        
        Returns:
            存储结果
        """
        # 调用 memU 核心库
        # ✅ 关键修复：传递 user 参数
        user_data = {"user_id": user_id} if user_id else None
        return await self.service.memorize(
            resource_url=file_path,
            modality="conversation",
            user=user_data  # ✅ 添加 user 参数
        )

    async def memorize_system_observation(
        self,
        observation: dict[str, Any],
        storage_dir: str,
        user_id: str | None = None  # ✅ 添加 user_id 参数
    ) -> dict[str, Any]:
        """
        存储系统观察记录（桌面宠物专用）
        
        Args:
            observation: 观察记录
            storage_dir: 存储目录
            user_id: 用户 ID
        
        Returns:
            存储结果
        """
        import json
        import uuid
        from pathlib import Path
        
        # 格式化为自然语言
        text = self._format_observation(observation)
        
        # 转换为 memU 格式
        content = [{
            "role": "system",
            "content": {"text": text},
            "created_at": observation.get("timestamp", datetime.now().isoformat())
        }]
        
        # 保存为 JSON 文件
        file_path = Path(storage_dir) / f"observation-{uuid.uuid4().hex}.json"
        with file_path.open("w", encoding="utf-8") as f:
            json.dump({"content": content}, f, ensure_ascii=False)
        
        # 调用 memU 核心库
        # ✅ 关键修复：传递 user 参数
        user_data = {"user_id": user_id} if user_id else None
        return await self.service.memorize(
            resource_url=str(file_path),
            modality="conversation",
            user=user_data  # ✅ 添加 user 参数
        )

    def _format_observation(self, obs: dict[str, Any]) -> str:
        """
        格式化观察记录为自然语言
        
        Args:
            obs: 观察记录
        
        Returns:
            自然语言描述
        """
        obs_type = obs.get("type", "unknown")
        
        if obs_type == "app_switch":
            # 应用切换
            app = obs.get("app", "未知应用")
            duration = obs.get("duration", 0)
            minutes = duration // 60
            return f"用户在 {app} 工作了 {minutes} 分钟"
        
        elif obs_type == "fatigue_detected":
            # 疲劳检测
            hours = obs.get("hours", 0)
            level = obs.get("level", "Normal")
            level_text = {
                "Fresh": "精力充沛",
                "Normal": "正常",
                "Tired": "疲劳",
                "Exhausted": "极度疲劳"
            }.get(level, "未知")
            return f"检测到用户{level_text}：连续工作 {hours} 小时"
        
        elif obs_type == "idle_detected":
            # 空闲检测
            minutes = obs.get("minutes", 0)
            return f"用户空闲了 {minutes} 分钟"
        
        elif obs_type == "work_session_end":
            # 工作会话结束
            app = obs.get("app", "未知应用")
            duration = obs.get("duration", 0)
            minutes = duration // 60
            return f"用户结束了在 {app} 的工作，持续 {minutes} 分钟"
        
        elif obs_type == "late_night_work":
            # 深夜工作
            hour = obs.get("hour", 0)
            return f"检测到深夜工作：{hour}:00 仍在活动"
        
        elif obs_type == "break_taken":
            # 休息记录
            duration = obs.get("duration", 0)
            minutes = duration // 60
            return f"用户休息了 {minutes} 分钟"
        
        else:
            # 未知类型，返回原始数据
            return f"系统观察：{obs}"

    async def add_observation(self, obs: dict[str, Any]) -> None:
        """
        添加观察记录到缓冲区（批量处理优化）
        
        Args:
            obs: 观察记录
        """
        self.observation_buffer.append(obs)
        
        # 检查是否需要刷新缓冲区
        current_time = time.time()
        should_flush = (
            len(self.observation_buffer) >= self.buffer_size_limit or
            (current_time - self.last_flush_time) >= self.flush_interval
        )
        
        if should_flush:
            await self._flush_buffer()

    async def _flush_buffer(self) -> None:
        """批量存储缓冲区中的观察记录"""
        if not self.observation_buffer:
            return
        
        # 聚合相似的观察记录
        aggregated = self._aggregate_observations(self.observation_buffer)
        
        # 批量存储
        for obs in aggregated:
            try:
                await self.memorize_system_observation(obs)
            except Exception as e:
                print(f"存储观察记录失败: {e}")
        
        # 清空缓冲区
        self.observation_buffer = []
        self.last_flush_time = time.time()

    def _aggregate_observations(self, observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        聚合观察记录，避免存储过多重复数据
        
        策略：
        - 合并短时间内的多次应用切换
        - 过滤掉持续时间过短的记录（< 5分钟）
        - 保留重要事件（疲劳检测、深夜工作等）
        
        Args:
            observations: 原始观察记录列表
        
        Returns:
            聚合后的观察记录列表
        """
        if not observations:
            return []
        
        aggregated = []
        app_switches = []
        
        for obs in observations:
            obs_type = obs.get("type", "")
            
            if obs_type == "app_switch":
                # 收集应用切换记录
                duration = obs.get("duration", 0)
                if duration >= 300:  # 只保留 >= 5分钟的记录
                    app_switches.append(obs)
            
            elif obs_type in ["fatigue_detected", "late_night_work", "break_taken"]:
                # 重要事件，直接保留
                aggregated.append(obs)
            
            elif obs_type == "idle_detected":
                # 空闲记录，只保留 >= 30分钟的
                minutes = obs.get("minutes", 0)
                if minutes >= 30:
                    aggregated.append(obs)
        
        # 添加应用切换记录
        aggregated.extend(app_switches)
        
        return aggregated

    async def retrieve_for_proactive(
        self,
        context: dict[str, Any],
        limit: int = 5,
        user_id: str | None = None  # ✅ 添加 user_id 参数
    ) -> dict[str, Any]:
        """
        为主动推理场景检索记忆（桌面宠物专用）
        
        根据当前上下文智能构建查询，检索相关记忆
        
        Args:
            context: 当前上下文，包含：
                - working_duration: 工作时长（秒）
                - active_app: 当前活动应用
                - fatigue_level: 疲劳级别
                - is_late_night: 是否深夜
                - idle_time: 空闲时间（秒）
            limit: 返回记忆数量限制（注意：memU 的 limit 在 RetrieveConfig 中配置）
            user_id: 用户 ID（用于过滤）
        
        Returns:
            检索结果
        """
        query_texts = []
        
        # 根据上下文构建查询
        working_duration = context.get("working_duration", 0)
        fatigue_level = context.get("fatigue_level", "Normal")
        is_late_night = context.get("is_late_night", False)
        idle_time = context.get("idle_time", 0)
        
        # 查询工作习惯
        if working_duration > 7200:  # 超过 2 小时
            query_texts.append("用户的工作习惯和休息频率")
        
        # 查询疲劳相关记忆
        if fatigue_level in ["Tired", "Exhausted"]:
            query_texts.append("用户疲劳时的偏好和反馈")
        
        # 查询深夜工作记录
        if is_late_night:
            query_texts.append("用户的作息习惯和深夜工作记录")
        
        # 查询空闲时的互动偏好
        if idle_time > 1800:  # 超过 30 分钟空闲
            query_texts.append("用户空闲时的互动偏好")
        
        # 如果没有特定查询，使用通用查询
        if not query_texts:
            query_texts.append("用户最近的活动和状态")
        
        # 转换为 memU 期望的格式
        queries = [{
            "role": "user",
            "content": {"text": text}
        } for text in query_texts]
        
        # 调用 memU 检索
        try:
            # ✅ 关键修复：传递 where 参数
            where_filter = {"user_id": user_id} if user_id else {}
            result = await self.service.retrieve(
                queries=queries,
                where=where_filter  # ✅ 添加 where 参数
            )
            return result
        except Exception as e:
            print(f"检索记忆失败: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    async def retrieve_conversation_context(
        self,
        query: str,
        limit: int = 3,
        user_id: str | None = None  # ✅ 添加 user_id 参数
    ) -> dict[str, Any]:
        """
        为对话场景检索上下文记忆
        
        Args:
            query: 用户查询
            limit: 返回记忆数量限制（注意：memU 的 limit 在 RetrieveConfig 中配置）
            user_id: 用户 ID（用于过滤）
        
        Returns:
            检索结果
        """
        try:
            # 转换为 memU 期望的格式
            queries = [{
                "role": "user",
                "content": {"text": query}
            }]
            # ✅ 关键修复：传递 where 参数
            where_filter = {"user_id": user_id} if user_id else {}
            result = await self.service.retrieve(
                queries=queries,
                where=where_filter  # ✅ 添加 where 参数
            )
            return result
        except Exception as e:
            print(f"检索对话上下文失败: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    async def force_flush(self) -> None:
        """强制刷新缓冲区（用于应用关闭时）"""
        await self._flush_buffer()

    async def list_memories(
        self,
        limit: int = 50,
        offset: int = 0,
        memory_type: str = "all",
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, Any]:
        """
        查询记忆列表
        """
        try:
            import os
            import asyncpg
            
            host = os.getenv("DATABASE_HOST", "127.0.0.1")
            port = int(os.getenv("DATABASE_PORT", "5432"))
            user = os.getenv("DATABASE_USER", "postgres")
            password = os.getenv("DATABASE_PASSWORD", "")
            database = os.getenv("DATABASE_NAME", "memu")
            
            conn = await asyncpg.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
                timeout=10
            )
            
            try:
                # 构建查询
                query = "SELECT id, memory_type, summary, created_at, extra FROM memory_items WHERE 1=1"
                params = []
                param_idx = 1
                
                # 类型筛选: conversation 对应 profile, system_observation 对应 event
                if memory_type == "conversation":
                    query += f" AND memory_type = ${param_idx}"
                    params.append("profile")
                    param_idx += 1
                elif memory_type == "system_observation":
                    query += f" AND memory_type = ${param_idx}"
                    params.append("event")
                    param_idx += 1
                
                # 日期筛选
                if start_date:
                    query += f" AND created_at >= ${param_idx}"
                    params.append(start_date)
                    param_idx += 1
                if end_date:
                    query += f" AND created_at <= ${param_idx}"
                    params.append(end_date)
                    param_idx += 1
                
                # 排序和分页
                query += f" ORDER BY created_at DESC LIMIT ${param_idx} OFFSET ${param_idx + 1}"
                params.extend([limit, offset])
                
                rows = await conn.fetch(query, *params)
                
                # 统计总数
                count_query = "SELECT COUNT(*) as total FROM memory_items WHERE 1=1"
                count_params = []
                count_idx = 1
                
                if memory_type == "conversation":
                    count_query += f" AND memory_type = ${count_idx}"
                    count_params.append("profile")
                    count_idx += 1
                elif memory_type == "system_observation":
                    count_query += f" AND memory_type = ${count_idx}"
                    count_params.append("event")
                    count_idx += 1
                
                if start_date:
                    count_query += f" AND created_at >= ${count_idx}"
                    count_params.append(start_date)
                    count_idx += 1
                if end_date:
                    count_query += f" AND created_at <= ${count_idx}"
                    count_params.append(end_date)
                    count_idx += 1
                
                total_row = await conn.fetchrow(count_query, *count_params)
                total = total_row['total'] if total_row else 0
                
                # 转换数据
                items = []
                for row in rows:
                    # 映射类型: profile -> conversation, event -> system_observation
                    item_type = "conversation" if row['memory_type'] == "profile" else "system_observation"
                    
                    items.append({
                        "id": str(row['id']),
                        "type": item_type,
                        "content": row['summary'] if row['summary'] else "",
                        "summary": row['summary'],
                        "created_at": row['created_at'].isoformat() if row['created_at'] else "",
                        "metadata": row['extra'] if row['extra'] else {}
                    })
                
                return {
                    "items": items,
                    "total": total,
                    "has_more": (offset + limit) < total,
                }
                
            finally:
                await conn.close()
                
        except Exception as e:
            print(f"查询失败: {e}")
            import traceback
            traceback.print_exc()
            return {
                "items": [],
                "total": 0,
                "has_more": False,
            }

    async def get_memories_stats(self) -> dict[str, Any]:
        """
        获取记忆统计信息
        """
        try:
            import os
            import asyncpg
            from datetime import datetime
            
            host = os.getenv("DATABASE_HOST", "127.0.0.1")
            port = int(os.getenv("DATABASE_PORT", "5432"))
            user = os.getenv("DATABASE_USER", "postgres")
            password = os.getenv("DATABASE_PASSWORD", "")
            database = os.getenv("DATABASE_NAME", "memu")
            
            conn = await asyncpg.connect(
                host=host,
                port=port,
                user=user,
                password=password,
                database=database,
                timeout=10
            )
            
            try:
                # 总数
                total_row = await conn.fetchrow("SELECT COUNT(*) as total FROM memory_items")
                total_memories = total_row['total'] if total_row else 0
                
                # 对话记录 (profile)
                conv_row = await conn.fetchrow("SELECT COUNT(*) as total FROM memory_items WHERE memory_type = 'profile'")
                conversations = conv_row['total'] if conv_row else 0
                
                # 系统观察 (event)
                obs_row = await conn.fetchrow("SELECT COUNT(*) as total FROM memory_items WHERE memory_type = 'event'")
                observations = obs_row['total'] if obs_row else 0
                
                # 今日新增
                today = datetime.now().date()
                today_row = await conn.fetchrow(
                    "SELECT COUNT(*) as total FROM memory_items WHERE DATE(created_at) = $1",
                    today
                )
                today_count = today_row['total'] if today_row else 0
                
                # 存储大小估算
                storage_bytes = total_memories * 1024
                if storage_bytes < 1024:
                    storage_size = f"{storage_bytes} B"
                elif storage_bytes < 1024 * 1024:
                    storage_size = f"{storage_bytes / 1024:.1f} KB"
                else:
                    storage_size = f"{storage_bytes / (1024 * 1024):.1f} MB"
                
                return {
                    "total_memories": total_memories,
                    "conversations": conversations,
                    "observations": observations,
                    "today_count": today_count,
                    "storage_size": storage_size,
                }
                
            finally:
                await conn.close()
                
        except Exception as e:
            print(f"统计失败: {e}")
            import traceback
            traceback.print_exc()
            return {
                "total_memories": 0,
                "conversations": 0,
                "observations": 0,
                "today_count": 0,
                "storage_size": "0 B",
            }
