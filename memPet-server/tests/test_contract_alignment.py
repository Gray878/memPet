"""前后端契约对齐测试。"""

from __future__ import annotations

from typing import Any

import pytest
from fastapi.testclient import TestClient

import app.main as main_module


class FakeLLMClient:
    async def chat(self, **_kwargs: Any) -> dict[str, str]:
        return {"content": "测试回复"}


class FakeService:
    def __init__(self) -> None:
        self._client = FakeLLMClient()

    async def memorize(self, **_kwargs: Any) -> dict[str, Any]:
        return {"stored": True}

    async def retrieve(self, **_kwargs: Any) -> dict[str, Any]:
        return {
            "items": [
                {"summary": "用户喜欢咖啡", "score": 0.91},
                {"summary": "用户周末会跑步", "score": 0.86},
            ],
            "categories": [],
            "resources": [],
        }

    def _get_llm_client(self) -> FakeLLMClient:
        return self._client


class FakeAdapter:
    def __init__(self) -> None:
        self.observation_buffer: list[dict[str, Any]] = []
        self.flush_called = False

    async def memorize_system_observation(
        self,
        _observation: dict[str, Any],
        _storage_dir: str,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        return {"stored": True, "user_id": user_id}

    async def retrieve_for_proactive(
        self,
        _context: dict[str, Any],
        limit: int = 5,
        user_id: str | None = None,
    ) -> dict[str, Any]:
        return {
            "items": [
                {"summary": "用户连续工作后喜欢短休息", "score": 0.88},
                {"summary": "用户在夜间工作会疲劳", "score": 0.81},
            ][:limit],
            "categories": [],
            "resources": [],
            "user_id": user_id,
        }

    async def add_observation(self, observation: dict[str, Any]) -> None:
        self.observation_buffer.append(observation)

    async def force_flush(self) -> None:
        self.flush_called = True
        self.observation_buffer = []


class FakeProactiveHelper:
    def __init__(self) -> None:
        self.reset_targets: list[str | None] = []

    def analyze_context(self, _context: dict[str, Any], check_cooldown: bool = True) -> list[dict[str, Any]]:
        if not check_cooldown:
            return [
                {
                    "type": "fatigue_reminder",
                    "priority": "medium",
                    "message": "检测到疲劳",
                    "reason": "连续工作 2 小时",
                    "action": "建议休息 10 分钟",
                }
            ]
        return [
            {
                "type": "break_suggestion",
                "priority": "medium",
                "message": "定时休息提醒",
                "reason": "持续专注中",
                "action": "建议站起来活动一下",
            }
        ]

    def format_suggestion_for_llm(
        self,
        suggestion: dict[str, Any],
        memories: list[dict[str, Any]],
        personality: str,
    ) -> str:
        return f"{personality}:{suggestion.get('message')}:{len(memories)}"

    def get_cooldown_status(self) -> dict[str, Any]:
        return {
            "fatigue_reminder": {
                "cooldown_seconds": 1800,
                "remaining_seconds": 0,
                "can_trigger": True,
                "last_triggered": None,
            }
        }

    def reset_cooldown(self, suggestion_type: str | None = None) -> None:
        self.reset_targets.append(suggestion_type)


@pytest.fixture
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.setattr(main_module, "service", FakeService())
    monkeypatch.setattr(main_module, "adapter", FakeAdapter())
    monkeypatch.setattr(main_module, "proactive_helper", FakeProactiveHelper())
    return TestClient(main_module.app)


@pytest.mark.parametrize(
    "payload",
    [
        {
            "type": "conversation",
            "messages": [
                {"role": "user", "content": "你好"},
                {"role": "assistant", "content": "你好呀"},
            ],
        },
        {
            "type": "conversation",
            "content": [
                {"role": "user", "content": "今天很忙"},
                {"role": "assistant", "content": "辛苦啦"},
            ],
        },
    ],
)
def test_memorize_supports_messages_and_content(client: TestClient, payload: dict[str, Any]) -> None:
    response = client.post("/memorize", json=payload)
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert "result" in body["data"]


def test_retrieve_contract_has_stable_items(client: TestClient) -> None:
    response = client.post(
        "/retrieve",
        json={"scenario": "conversation", "query": "我喜欢什么", "limit": 3},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert isinstance(body["data"]["items"], list)
    assert isinstance(body["data"]["result"]["items"], list)


def test_batch_and_cooldown_reset_endpoints(client: TestClient) -> None:
    observations = [
        {"type": "app_switch", "app": "VSCode", "duration": 1200},
        {"type": "idle_detected", "minutes": 35},
    ]
    batch_resp = client.post("/batch/observations", json={"observations": observations})
    assert batch_resp.status_code == 200
    assert batch_resp.json()["data"]["accepted"] == 2

    flush_resp = client.post("/batch/flush", json={})
    assert flush_resp.status_code == 200
    assert flush_resp.json()["data"]["flushed"] is True

    reset_resp = client.post("/proactive/cooldown/reset", json={"type": "fatigue_reminder"})
    assert reset_resp.status_code == 200
    assert reset_resp.json()["status"] == "success"
    assert "cooldowns" in reset_resp.json()["data"]


def test_chat_contract_alignment(client: TestClient) -> None:
    response = client.post(
        "/chat",
        json={
            "message": "你还记得我吗？",
            "history": [{"role": "user", "content": "我喜欢咖啡"}],
            "use_memory": True,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert body["data"]["response"] == body["response"]
    assert isinstance(body["data"]["memories_used"], int)
    assert isinstance(body["data"]["memory_used"], bool)


def test_proactive_quick_reads_items(client: TestClient) -> None:
    response = client.post(
        "/proactive/quick",
        json={
            "context": {"working_duration": 7200, "fatigue_level": "Tired"},
            "personality": "friendly",
            "limit": 2,
        },
    )
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "success"
    assert isinstance(body["data"]["memories"], list)
    assert body["data"]["message"]


def test_openapi_contains_new_contract_paths(client: TestClient) -> None:
    response = client.get("/openapi.json")
    assert response.status_code == 200
    paths = response.json().get("paths", {})
    assert "/batch/observations" in paths
    assert "/batch/flush" in paths
    assert "/proactive/cooldown/reset" in paths
