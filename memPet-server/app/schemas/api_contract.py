from __future__ import annotations

from typing import Any, Generic, Literal, TypeVar

from pydantic import BaseModel, Field, model_validator

TData = TypeVar("TData")


class ApiEnvelope(BaseModel, Generic[TData]):
    status: Literal["success", "error"] = "success"
    data: TData | None = None
    error: str | None = None


class MemorizeRequest(BaseModel):
    type: Literal["conversation", "system_observation"] = "conversation"
    messages: list[dict[str, Any]] | None = None
    content: list[dict[str, Any]] | None = None
    observation: dict[str, Any] | None = None
    user_id: str | None = None

    @model_validator(mode="after")
    def _normalize(self) -> "MemorizeRequest":
        if self.type == "conversation" and self.messages is None and self.content is not None:
            self.messages = self.content
        return self


class RetrieveRequest(BaseModel):
    scenario: Literal["conversation", "proactive"] = "conversation"
    query: str | None = None
    context: dict[str, Any] = Field(default_factory=dict)
    limit: int = 5
    user_id: str | None = None


class ProactiveAnalyzeRequest(BaseModel):
    context: dict[str, Any] = Field(default_factory=dict)
    skip_cooldown: bool = False


class ProactiveGenerateRequest(BaseModel):
    suggestion: dict[str, Any] = Field(default_factory=dict)
    context: dict[str, Any] = Field(default_factory=dict)
    personality: str = "friendly"
    limit: int = 3


class ProactiveQuickRequest(BaseModel):
    context: dict[str, Any] = Field(default_factory=dict)
    personality: str = "friendly"
    limit: int = 3


class ProactiveCooldownResetRequest(BaseModel):
    type: str | None = None


class BatchObservationsRequest(BaseModel):
    observations: list[dict[str, Any]] = Field(default_factory=list)


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, Any]] = Field(default_factory=list)
    personality: str = "friendly"
    temperature: float = 0.7
    max_tokens: int = 2000
    retrieve_memories: bool = True
    use_memory: bool | None = None

    @model_validator(mode="after")
    def _compat_use_memory(self) -> "ChatRequest":
        if self.use_memory is not None:
            self.retrieve_memories = self.use_memory
        return self


class ChatStreamRequest(ChatRequest):
    pass


class RootData(BaseModel):
    message: str
    version: str
    server_status: str


class HealthData(BaseModel):
    server_status: str
    version: str
    database: str | None = None
    llm: str | None = None


class MemorizeData(BaseModel):
    result: dict[str, Any] = Field(default_factory=dict)


class RetrieveResultData(BaseModel):
    items: list[dict[str, Any]] = Field(default_factory=list)
    categories: list[dict[str, Any]] = Field(default_factory=list)
    resources: list[dict[str, Any]] = Field(default_factory=list)


class RetrieveData(BaseModel):
    result: RetrieveResultData = Field(default_factory=RetrieveResultData)
    items: list[dict[str, Any]] = Field(default_factory=list)


class BatchObservationsData(BaseModel):
    accepted: int = 0
    buffered: int = 0


class BatchFlushData(BaseModel):
    flushed: bool = False


class ProactiveAnalyzeData(BaseModel):
    suggestions: list[dict[str, Any]] = Field(default_factory=list)


class ProactiveGenerateData(BaseModel):
    message: str
    memories: list[dict[str, Any]] = Field(default_factory=list)
    prompt: str


class ProactiveQuickData(BaseModel):
    message: str | None = None
    suggestion: dict[str, Any] | None = None
    memories: list[dict[str, Any]] = Field(default_factory=list)


class CooldownData(BaseModel):
    cooldowns: dict[str, Any] = Field(default_factory=dict)


class CooldownResetData(BaseModel):
    type: str | None = None
    cooldowns: dict[str, Any] = Field(default_factory=dict)


class ChatData(BaseModel):
    response: str
    memories_used: int
    memory_used: bool
