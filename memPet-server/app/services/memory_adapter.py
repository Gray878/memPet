# -*- coding: utf-8 -*-
"""
妗岄潰瀹犵墿璁板繂閫傞厤鍣?

涓烘闈㈠疇鐗╁満鏅彁渚涜蹇嗗瓨鍌ㄥ拰妫€绱㈢殑閫傞厤鍔熻兘锛?
- 鑷畾涔夎蹇嗗垎绫伙紙宸ヤ綔涔犳儻銆佹儏鎰熺姸鎬佺瓑锛?
- 绯荤粺瑙傚療璁板綍鐨勬牸寮忓寲
- 涓诲姩鎺ㄧ悊鍦烘櫙鐨勬绱㈠寮?
- 楂橀鏁版嵁鐨勮繃婊ゅ拰鑱氬悎
"""

import time
from typing import Any, Optional
from datetime import datetime

from memu.app import MemoryService


class MemoryAdapter:
    """Desktop pet memory adapter."""

    # 妗岄潰瀹犵墿涓撶敤鐨勮蹇嗗垎绫?
    DESKTOP_PET_CATEGORIES = [
        {
            "name": "宸ヤ綔涔犳儻",
            "description": "鐢ㄦ埛鐨勫伐浣滄ā寮忋€佹椂闀裤€佸父鐢ㄥ簲鐢ㄣ€佸伐浣滆妭濂忕瓑琛屼负妯″紡"
        },
        {
            "name": "情感状态",
            "description": "鐢ㄦ埛鐨勬儏缁彉鍖栥€佸帇鍔涙按骞炽€佺柌鍔冲害銆佸績鐞嗙姸鎬佺瓑"
        },
        {
            "name": "浜掑姩鍘嗗彶",
            "description": "鐢ㄦ埛涓庡疇鐗╃殑瀵硅瘽銆佸弽棣堛€佷簰鍔ㄨ褰曘€佸亸濂借缃瓑"
        },
        {
            "name": "鏃ュ父琛屼负",
            "description": "浣滄伅鏃堕棿銆佹椿鍔ㄦā寮忋€佷紤鎭範鎯€佺敓娲昏寰嬬瓑"
        },
        {
            "name": "鍏磋叮鐖卞ソ",
            "description": "鐢ㄦ埛鐨勫叴瓒ｃ€佺埍濂姐€佸ū涔愭椿鍔ㄣ€佸涔犲唴瀹圭瓑"
        }
    ]

    def __init__(self, memu_service: MemoryService):
        """
        鍒濆鍖栭€傞厤鍣?
        
        Args:
            memu_service: memU 鏍稿績鏈嶅姟瀹炰緥
        """
        self.service = memu_service
        self.observation_buffer: list[dict[str, Any]] = []  # 瑙傚療璁板綍缂撳啿鍖?
        self.last_flush_time = time.time()
        self.buffer_size_limit = 10  # 缂撳啿鍖哄ぇ灏忛檺鍒?
        self.flush_interval = 300  # 鍒锋柊闂撮殧锛堢锛夛細5鍒嗛挓

    async def memorize_conversation(
        self,
        content: list[dict[str, Any]],
        file_path: str,
        user_id: str | None = None  # 鉁?娣诲姞 user_id 鍙傛暟
    ) -> dict[str, Any]:
        """
        瀛樺偍瀵硅瘽璁板繂锛堟爣鍑嗗満鏅級
        
        Args:
            content: 瀵硅瘽鍐呭鍒楄〃
            file_path: JSON 鏂囦欢璺緞
            user_id: 鐢ㄦ埛 ID
        
        Returns:
            瀛樺偍缁撴灉
        """
        # 璋冪敤 memU 鏍稿績搴?
        # 鉁?鍏抽敭淇锛氫紶閫?user 鍙傛暟
        user_data = {"user_id": user_id} if user_id else None
        return await self.service.memorize(
            resource_url=file_path,
            modality="conversation",
            user=user_data  # 鉁?娣诲姞 user 鍙傛暟
        )

    async def memorize_system_observation(
        self,
        observation: dict[str, Any],
        storage_dir: str,
        user_id: str | None = None  # 鉁?娣诲姞 user_id 鍙傛暟
    ) -> dict[str, Any]:
        """
        瀛樺偍绯荤粺瑙傚療璁板綍锛堟闈㈠疇鐗╀笓鐢級
        
        Args:
            observation: 瑙傚療璁板綍
            storage_dir: 瀛樺偍鐩綍
            user_id: 鐢ㄦ埛 ID
        
        Returns:
            瀛樺偍缁撴灉
        """
        import json
        import uuid
        from pathlib import Path
        
        # 鏍煎紡鍖栦负鑷劧璇█
        text = self._format_observation(observation)
        
        # 杞崲涓?memU 鏍煎紡
        content = [{
            "role": "system",
            "content": {"text": text},
            "created_at": observation.get("timestamp", datetime.now().isoformat())
        }]
        
        # 淇濆瓨涓?JSON 鏂囦欢
        file_path = Path(storage_dir) / f"observation-{uuid.uuid4().hex}.json"
        with file_path.open("w", encoding="utf-8") as f:
            json.dump({"content": content}, f, ensure_ascii=False)
        
        # 璋冪敤 memU 鏍稿績搴?
        # 鉁?鍏抽敭淇锛氫紶閫?user 鍙傛暟
        user_data = {"user_id": user_id} if user_id else None
        return await self.service.memorize(
            resource_url=str(file_path),
            modality="conversation",
            user=user_data  # 鉁?娣诲姞 user 鍙傛暟
        )

    def _format_observation(self, obs: dict[str, Any]) -> str:
        """
        鏍煎紡鍖栬瀵熻褰曚负鑷劧璇█
        
        Args:
            obs: 瑙傚療璁板綍
        
        Returns:
            鑷劧璇█鎻忚堪
        """
        obs_type = obs.get("type", "unknown")
        
        if obs_type == "app_switch":
            # 搴旂敤鍒囨崲
            app = obs.get("app", "鏈煡搴旂敤")
            duration = obs.get("duration", 0)
            minutes = duration // 60
            return f"鐢ㄦ埛鍦?{app} 宸ヤ綔浜?{minutes} 鍒嗛挓"
        
        elif obs_type == "fatigue_detected":
            # 鐤插姵妫€娴?
            hours = obs.get("hours", 0)
            level = obs.get("level", "Normal")
            level_text = {
                "Fresh": "绮惧姏鍏呮矝",
                "Normal": "姝ｅ父",
                "Tired": "鐤插姵",
                "Exhausted": "鏋佸害鐤插姵"
            }.get(level, "鏈煡")
            return f"妫€娴嬪埌鐢ㄦ埛{level_text}锛氳繛缁伐浣?{hours} 灏忔椂"
        
        elif obs_type == "idle_detected":
            # 绌洪棽妫€娴?
            minutes = obs.get("minutes", 0)
            return f"鐢ㄦ埛绌洪棽浜?{minutes} 鍒嗛挓"
        
        elif obs_type == "work_session_end":
            # 宸ヤ綔浼氳瘽缁撴潫
            app = obs.get("app", "鏈煡搴旂敤")
            duration = obs.get("duration", 0)
            minutes = duration // 60
            return f"鐢ㄦ埛缁撴潫浜嗗湪 {app} 鐨勫伐浣滐紝鎸佺画 {minutes} 鍒嗛挓"
        
        elif obs_type == "late_night_work":
            # 娣卞宸ヤ綔
            hour = obs.get("hour", 0)
            return f"检测到深夜工作：{hour}:00 仍在活动"
        
        elif obs_type == "break_taken":
            # 浼戞伅璁板綍
            duration = obs.get("duration", 0)
            minutes = duration // 60
            return f"鐢ㄦ埛浼戞伅浜?{minutes} 鍒嗛挓"
        
        else:
            # 鏈煡绫诲瀷锛岃繑鍥炲師濮嬫暟鎹?
            return f"系统观察：{obs}"

    async def add_observation(self, obs: dict[str, Any]) -> None:
        """
        娣诲姞瑙傚療璁板綍鍒扮紦鍐插尯锛堟壒閲忓鐞嗕紭鍖栵級
        
        Args:
            obs: 瑙傚療璁板綍
        """
        self.observation_buffer.append(obs)
        
        # 妫€鏌ユ槸鍚﹂渶瑕佸埛鏂扮紦鍐插尯
        current_time = time.time()
        should_flush = (
            len(self.observation_buffer) >= self.buffer_size_limit or
            (current_time - self.last_flush_time) >= self.flush_interval
        )
        
        if should_flush:
            await self._flush_buffer()

    async def _flush_buffer(self) -> None:
        """Batch persist buffered observations."""
        if not self.observation_buffer:
            return
        
        # 鑱氬悎鐩镐技鐨勮瀵熻褰?
        aggregated = self._aggregate_observations(self.observation_buffer)
        
        # 鎵归噺瀛樺偍
        for obs in aggregated:
            try:
                await self.memorize_system_observation(obs)
            except Exception as e:
                print(f"瀛樺偍瑙傚療璁板綍澶辫触: {e}")
        
        # 娓呯┖缂撳啿鍖?
        self.observation_buffer = []
        self.last_flush_time = time.time()

    def _aggregate_observations(self, observations: list[dict[str, Any]]) -> list[dict[str, Any]]:
        """
        鑱氬悎瑙傚療璁板綍锛岄伩鍏嶅瓨鍌ㄨ繃澶氶噸澶嶆暟鎹?
        
        绛栫暐锛?
        - 鍚堝苟鐭椂闂村唴鐨勫娆″簲鐢ㄥ垏鎹?
        - 杩囨护鎺夋寔缁椂闂磋繃鐭殑璁板綍锛? 5鍒嗛挓锛?
        - 淇濈暀閲嶈浜嬩欢锛堢柌鍔虫娴嬨€佹繁澶滃伐浣滅瓑锛?
        
        Args:
            observations: 鍘熷瑙傚療璁板綍鍒楄〃
        
        Returns:
            鑱氬悎鍚庣殑瑙傚療璁板綍鍒楄〃
        """
        if not observations:
            return []
        
        aggregated = []
        app_switches = []
        
        for obs in observations:
            obs_type = obs.get("type", "")
            
            if obs_type == "app_switch":
                # 鏀堕泦搴旂敤鍒囨崲璁板綍
                duration = obs.get("duration", 0)
                if duration >= 300:  # 鍙繚鐣?>= 5鍒嗛挓鐨勮褰?
                    app_switches.append(obs)
            
            elif obs_type in ["fatigue_detected", "late_night_work", "break_taken"]:
                # 閲嶈浜嬩欢锛岀洿鎺ヤ繚鐣?
                aggregated.append(obs)
            
            elif obs_type == "idle_detected":
                # 绌洪棽璁板綍锛屽彧淇濈暀 >= 30鍒嗛挓鐨?
                minutes = obs.get("minutes", 0)
                if minutes >= 30:
                    aggregated.append(obs)
        
        # 娣诲姞搴旂敤鍒囨崲璁板綍
        aggregated.extend(app_switches)
        
        return aggregated

    async def retrieve_for_proactive(
        self,
        context: dict[str, Any],
        limit: int = 5,
        user_id: str | None = None  # 鉁?娣诲姞 user_id 鍙傛暟
    ) -> dict[str, Any]:
        """
        涓轰富鍔ㄦ帹鐞嗗満鏅绱㈣蹇嗭紙妗岄潰瀹犵墿涓撶敤锛?
        
        鏍规嵁褰撳墠涓婁笅鏂囨櫤鑳芥瀯寤烘煡璇紝妫€绱㈢浉鍏宠蹇?
        
        Args:
            context: 褰撳墠涓婁笅鏂囷紝鍖呭惈锛?
                - working_duration: 宸ヤ綔鏃堕暱锛堢锛?
                - active_app: 褰撳墠娲诲姩搴旂敤
                - fatigue_level: 鐤插姵绾у埆
                - is_late_night: 鏄惁娣卞
                - idle_time: 绌洪棽鏃堕棿锛堢锛?
            limit: 杩斿洖璁板繂鏁伴噺闄愬埗锛堟敞鎰忥細memU 鐨?limit 鍦?RetrieveConfig 涓厤缃級
            user_id: 鐢ㄦ埛 ID锛堢敤浜庤繃婊わ級
        
        Returns:
            妫€绱㈢粨鏋?
        """
        query_texts = []
        
        # 鏍规嵁涓婁笅鏂囨瀯寤烘煡璇?
        working_duration = context.get("working_duration", 0)
        fatigue_level = context.get("fatigue_level", "Normal")
        is_late_night = context.get("is_late_night", False)
        idle_time = context.get("idle_time", 0)
        
        # 鏌ヨ宸ヤ綔涔犳儻
        if working_duration > 7200:  # 瓒呰繃 2 灏忔椂
            query_texts.append("鐢ㄦ埛鐨勫伐浣滀範鎯拰浼戞伅棰戠巼")
        
        # 鏌ヨ鐤插姵鐩稿叧璁板繂
        if fatigue_level in ["Tired", "Exhausted"]:
            query_texts.append("用户疲劳时的偏好和反馈")
        
        # 鏌ヨ娣卞宸ヤ綔璁板綍
        if is_late_night:
            query_texts.append("鐢ㄦ埛鐨勪綔鎭範鎯拰娣卞宸ヤ綔璁板綍")
        
        # 鏌ヨ绌洪棽鏃剁殑浜掑姩鍋忓ソ
        if idle_time > 1800:  # 瓒呰繃 30 鍒嗛挓绌洪棽
            query_texts.append("鐢ㄦ埛绌洪棽鏃剁殑浜掑姩鍋忓ソ")
        
        # 濡傛灉娌℃湁鐗瑰畾鏌ヨ锛屼娇鐢ㄩ€氱敤鏌ヨ
        if not query_texts:
            query_texts.append("用户最近的活动和状态")
        
        # 杞崲涓?memU 鏈熸湜鐨勬牸寮?
        queries = [{
            "role": "user",
            "content": {"text": text}
        } for text in query_texts]
        
        # 璋冪敤 memU 妫€绱?
        try:
            # 鉁?鍏抽敭淇锛氫紶閫?where 鍙傛暟
            where_filter = {"user_id": user_id} if user_id else {}
            result = await self.service.retrieve(
                queries=queries,
                where=where_filter  # 鉁?娣诲姞 where 鍙傛暟
            )
            return result
        except Exception as e:
            print(f"妫€绱㈣蹇嗗け璐? {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    async def retrieve_conversation_context(
        self,
        query: str,
        limit: int = 3,
        user_id: str | None = None  # 鉁?娣诲姞 user_id 鍙傛暟
    ) -> dict[str, Any]:
        """
        涓哄璇濆満鏅绱笂涓嬫枃璁板繂
        
        Args:
            query: 鐢ㄦ埛鏌ヨ
            limit: 杩斿洖璁板繂鏁伴噺闄愬埗锛堟敞鎰忥細memU 鐨?limit 鍦?RetrieveConfig 涓厤缃級
            user_id: 鐢ㄦ埛 ID锛堢敤浜庤繃婊わ級
        
        Returns:
            妫€绱㈢粨鏋?
        """
        try:
            # 杞崲涓?memU 鏈熸湜鐨勬牸寮?
            queries = [{
                "role": "user",
                "content": {"text": query}
            }]
            # 鉁?鍏抽敭淇锛氫紶閫?where 鍙傛暟
            where_filter = {"user_id": user_id} if user_id else {}
            result = await self.service.retrieve(
                queries=queries,
                where=where_filter  # 鉁?娣诲姞 where 鍙傛暟
            )
            return result
        except Exception as e:
            print(f"妫€绱㈠璇濅笂涓嬫枃澶辫触: {e}")
            import traceback
            traceback.print_exc()
            return {"status": "error", "message": str(e)}

    async def force_flush(self) -> None:
        """Force flush buffered observations."""
        await self._flush_buffer()

    @staticmethod
    def _parse_datetime(value: Any) -> datetime | None:
        """Normalize datetime values from memU records."""
        if isinstance(value, datetime):
            return value
        if not isinstance(value, str):
            return None

        text = value.strip()
        if not text:
            return None
        if text.endswith("Z"):
            text = f"{text[:-1]}+00:00"

        try:
            return datetime.fromisoformat(text)
        except ValueError:
            return None

    @staticmethod
    def _format_datetime(value: Any) -> str:
        dt = MemoryAdapter._parse_datetime(value)
        if dt is not None:
            return dt.isoformat()
        if isinstance(value, str):
            return value
        return ""

    @staticmethod
    def _map_external_type(internal_type: str) -> str:
        # Keep response compatible with API schema literals.
        return "conversation" if internal_type == "profile" else "system_observation"

    @staticmethod
    def _to_epoch_seconds(dt: datetime | None) -> float:
        if dt is None:
            return float("-inf")
        try:
            return dt.timestamp()
        except Exception:
            return float("-inf")

    async def list_memories(
        self,
        limit: int = 50,
        offset: int = 0,
        memory_type: str = "all",
        start_date: str | None = None,
        end_date: str | None = None,
    ) -> dict[str, Any]:
        """List memories for memory-log endpoint."""
        print(f"[list_memories] start: limit={limit}, offset={offset}, type={memory_type}")
        try:
            result = await self.service.list_memory_items()
            raw_items = result.get("items", []) if isinstance(result, dict) else []

            desired_types: set[str] | None = None
            if memory_type == "conversation":
                desired_types = {"profile"}
            elif memory_type == "system_observation":
                desired_types = {"event"}

            start_dt = self._parse_datetime(start_date) if start_date else None
            end_dt = self._parse_datetime(end_date) if end_date else None
            start_epoch = self._to_epoch_seconds(start_dt) if start_dt is not None else None
            end_epoch = self._to_epoch_seconds(end_dt) if end_dt is not None else None

            filtered: list[dict[str, Any]] = []
            for raw_item in raw_items:
                if not isinstance(raw_item, dict):
                    continue

                internal_type = str(raw_item.get("memory_type", ""))
                if desired_types is not None and internal_type not in desired_types:
                    continue

                created_raw = raw_item.get("created_at")
                created_dt = self._parse_datetime(created_raw)
                created_epoch = self._to_epoch_seconds(created_dt)

                if start_epoch is not None and created_epoch < start_epoch:
                    continue
                if end_epoch is not None and created_epoch > end_epoch:
                    continue

                summary = raw_item.get("summary")
                if summary is None:
                    summary_text = ""
                elif isinstance(summary, str):
                    summary_text = summary
                else:
                    summary_text = str(summary)

                metadata = raw_item.get("extra")
                if not isinstance(metadata, dict):
                    metadata = {}

                filtered.append(
                    {
                        "id": str(raw_item.get("id", "")),
                        "type": self._map_external_type(internal_type),
                        "content": summary_text,
                        "summary": summary_text,
                        "created_at": self._format_datetime(created_raw),
                        "metadata": metadata,
                        "_created_at_epoch": created_epoch,
                    }
                )

            filtered.sort(key=lambda item: item["_created_at_epoch"], reverse=True)
            total = len(filtered)
            page = filtered[offset : offset + limit]
            items = [{k: v for k, v in entry.items() if not k.startswith("_")} for entry in page]

            print(f"[list_memories] total: {total}")
            print(f"[list_memories] return {len(items)} records")
            return {
                "items": items,
                "total": total,
                "has_more": (offset + limit) < total,
            }

        except Exception as e:
            print(f"[list_memories] failed: {e}")
            import traceback

            traceback.print_exc()
            return {
                "items": [],
                "total": 0,
                "has_more": False,
            }

    async def get_memories_stats(self) -> dict[str, Any]:
        """Get memory statistics for memory-log dashboard."""
        try:
            result = await self.service.list_memory_items()
            raw_items = result.get("items", []) if isinstance(result, dict) else []

            total_memories = 0
            conversations = 0
            observations = 0
            today_count = 0
            today = datetime.now().date()

            for raw_item in raw_items:
                if not isinstance(raw_item, dict):
                    continue

                total_memories += 1
                internal_type = str(raw_item.get("memory_type", ""))
                if internal_type == "profile":
                    conversations += 1
                if internal_type == "event":
                    observations += 1

                created_dt = self._parse_datetime(raw_item.get("created_at"))
                if created_dt is not None and created_dt.date() == today:
                    today_count += 1

            # Rough estimate consistent with previous logic.
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

        except Exception as e:
            print(f"[get_memories_stats] failed: {e}")
            import traceback

            traceback.print_exc()
            return {
                "total_memories": 0,
                "conversations": 0,
                "observations": 0,
                "today_count": 0,
                "storage_size": "0 B",
            }
