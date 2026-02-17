# memU 项目全文件深度解析文档

本文档详细列出了 memU 项目中每一个文件的作用，旨在帮助开发者深入理解项目架构，便于进行二次开发和裁剪（如制作桌面宠物）。

## 1. 根目录文件

### 1.1 配置与构建文件
| 文件名 | 作用 | 桌面宠物开发重要性 |
| :--- | :--- | :--- |
| `pyproject.toml` | **[核心配置]** Python 项目元数据、依赖管理（使用 maturin 构建系统）、开发工具配置（ruff/mypy/pytest）。定义了核心依赖如 openai、pydantic、sqlmodel 等。 | ⭐⭐⭐ 必需，需根据桌面宠物需求裁剪依赖 |
| `Cargo.toml` | Rust 项目配置，定义 Rust 扩展模块 `memu._core` 的构建参数。用于性能关键部分的优化。 | ⭐ 可选，如不需要 Rust 性能优化可移除 |
| `Cargo.lock` | Rust 依赖锁定文件，确保 Rust 依赖版本一致性。 | ⭐ 与 Cargo.toml 配套 |
| `setup.cfg` | setuptools 和 flake8 的配置文件，定义代码风格检查规则（行长度 120、忽略特定错误等）。 | ⭐ 开发辅助，生产环境可选 |
| `Makefile` | 开发快捷命令集合：`make install`（创建虚拟环境）、`make check`（代码检查）、`make test`（运行测试）。 | ⭐⭐ 开发便利工具 |
| `MANIFEST.in` | 指定打包时包含的非 Python 文件（如文档、资源文件）。 | ⭐ 打包发布时需要 |
| `uv.lock` | uv 包管理器的依赖锁定文件，确保所有开发者使用相同版本的依赖。 | ⭐⭐ 推荐保留以保证环境一致性 |

### 1.2 文档与规范文件
| 文件名 | 作用 |
| :--- | :--- |
| `README.md` | 项目主页说明文档，包含快速开始、功能介绍、使用示例。 |
| `CHANGELOG.md` | 版本更新日志，记录每个版本的新增功能、修复和变更。 |
| `CONTRIBUTING.md` | 开源贡献指南，说明如何提交 PR、代码规范、测试要求等。 |
| `LICENSE.txt` | Apache 2.0 开源许可证，允许商业使用和修改。 |

### 1.3 开发工具配置
| 文件名 | 作用 |
| :--- | :--- |
| `.gitignore` | Git 版本控制忽略规则（忽略 `__pycache__`、`.venv`、构建产物等）。 |
| `.pre-commit-config.yaml` | Git 提交前自动执行的检查钩子（代码格式化、Lint、类型检查），使用 ruff 和 mypy。 |
| `.python-version` | 指定项目使用的 Python 版本（3.13），用于 pyenv 等版本管理工具。 |

## 2. 核心源码 (`src/memu/`)
这是项目的核心逻辑所在，采用分层架构设计。

### 2.1 根包 (`src/memu/`)
| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `__init__.py` | 包入口文件 | 导出 `_rust_entry()` 函数用于测试 Rust 扩展是否正常加载。 |
| `_core.pyi` | Rust 扩展类型提示 | 为 Rust 编译的 `_core` 模块提供 Python 类型提示，帮助 IDE 和类型检查器理解 Rust 函数签名。 |
| `lib.rs` | Rust 源码入口 | Rust 扩展模块的主文件，使用 PyO3 绑定 Python。当前实现了 `hello_from_bin()` 示例函数。 |

### 2.2 应用服务层 (`src/memu/app/`)
**作用**：对外提供统一的 API，整合存储、检索和业务逻辑。
| 文件名 | 作用 |
| :--- | :--- |
| `__init__.py` | 模块导出。 |
| `service.py` | **[核心]** `MemoryService` 类。系统的总入口，继承了 Memorize, Retrieve, CRUD 等能力。 |
| `memorize.py` | **[核心]** `MemorizeMixin`。实现“记忆”逻辑，负责将输入（对话/文档）转化为结构化记忆。 |
| `retrieve.py` | **[核心]** `RetrieveMixin`。实现“回忆”逻辑，负责根据 Context 检索相关记忆。 |
| `crud.py` | `CRUDMixin`。提供基础的增删改查方法。 |
| `settings.py` | **[配置]** 系统配置类（UserConfig, DatabaseConfig, LLMConfig 等）。 |
| `patch.py` | 处理记忆类别的更新（Patch）逻辑。 |

### 2.3 数据库层 (`src/memu/database/`)
**作用**：定义数据模型和数据库操作接口，支持多种后端（SQLite/Postgres/InMemory）。采用 Repository 模式实现数据访问层。

#### 2.3.1 核心文件
| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `factory.py` | **[数据库工厂]** | `build_database()` 函数根据配置创建对应的数据库实例。支持 "inmemory"、"postgres"、"sqlite" 三种 provider。使用懒加载避免不必要的依赖。 |
| `interfaces.py` | **[抽象接口]** | 定义 `Database`、`Repository` 等抽象基类。规定了所有数据库实现必须遵循的接口契约（如 `get_by_id()`、`create()`、`update()` 等）。 |
| `models.py` | **[数据模型]** | 定义通用的 Pydantic 数据模型：`MemoryItem`（记忆项）、`MemoryCategory`（记忆类别）、`CategoryItem`（类别-项关联）、`Resource`（资源）等。这些模型在所有数据库后端间共享。 |
| `state.py` | **[状态管理]** | 管理数据库连接状态、会话生命周期等。 |

#### 2.3.2 通用 Repository (`repositories/`)
**作用**：定义跨数据库的通用数据访问逻辑基类。
| 文件名 | 作用 |
| :--- | :--- |
| `memory_item.py` | `MemoryItemRepository` 基类，定义记忆项的通用操作接口。 |
| `memory_category.py` | `MemoryCategoryRepository` 基类，定义记忆类别的通用操作接口。 |
| `category_item.py` | `CategoryItemRepository` 基类，定义类别-项关联的通用操作接口。 |
| `resource.py` | `ResourceRepository` 基类，定义资源（文件、图片等）的通用操作接口。 |

#### 2.3.3 SQLite 实现 (`src/memu/database/sqlite/`) - 桌面宠物推荐
**作用**：轻量级本地文件数据库，无需额外服务器，适合桌面应用。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `sqlite.py` | **[数据库初始化]** | `build_sqlite_database()` 函数创建 SQLite 数据库实例。处理数据库文件路径、连接池配置。自动创建表结构。 | ⭐⭐⭐ 必需 |
| `models.py` | **[ORM 模型]** | 使用 SQLModel 定义 SQLite 表模型：`MemoryItemModel`、`MemoryCategoryModel`、`CategoryItemModel`、`ResourceModel`。映射到实际数据库表。 | ⭐⭐⭐ 必需 |
| `schema.py` | **[表结构定义]** | 定义数据库表的详细结构（字段类型、索引、外键约束等）。包含向量字段的特殊处理（存储为 BLOB）。 | ⭐⭐⭐ 必需 |
| `session.py` | **[会话管理]** | 管理 SQLite 数据库会话的创建、提交、回滚。提供上下文管理器确保连接正确关闭。 | ⭐⭐⭐ 必需 |
| `repositories/` | **[具体实现]** | 实现 SQLite 特定的 Repository：`SQLiteMemoryItemRepo`、`SQLiteMemoryCategoryRepo` 等。包含 SQL 查询优化和 SQLite 特性支持。 | ⭐⭐⭐ 必需 |

#### 2.3.4 Postgres 实现 (`src/memu/database/postgres/`) - 桌面宠物可移除
**作用**：企业级服务器端数据库实现，支持 pgvector 扩展进行高效向量检索。桌面宠物开发可完全移除此目录。

| 文件名 | 作用 | 桌面宠物重要性 |
| :--- | :--- | :--- |
| `postgres.py` | Postgres 连接管理，支持连接池、SSL 等企业特性。 | ❌ 可移除 |
| `models.py` | Postgres 的 ORM 模型，使用 pgvector 的 Vector 类型。 | ❌ 可移除 |
| `schema.py` | Postgres 表结构，包含 GiST/IVFFlat 索引优化。 | ❌ 可移除 |
| `session.py` | Postgres 会话管理。 | ❌ 可移除 |
| `migration.py` | 使用 Alembic 进行数据库版本迁移。 | ❌ 可移除 |
| `migrations/` | 存储 Alembic 迁移脚本的目录。 | ❌ 可移除 |
| `repositories/` | Postgres 特定的 Repository 实现。 | ❌ 可移除 |

#### 2.3.5 内存实现 (`src/memu/database/inmemory/`)
**作用**：纯内存存储，用于测试、演示或临时会话。数据不持久化，进程结束后丢失。

| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `repo.py` | 内存 Repository 实现 | 使用 Python 字典和列表存储数据，实现与其他数据库相同的接口。 |
| `models.py` | 内存数据模型 | 简化的数据模型，直接使用 Pydantic 模型而非 ORM。 |
| `state.py` | 内存状态管理 | 管理内存中的数据状态，提供简单的事务模拟。 |
| `vector.py` | 向量检索实现 | 使用 numpy 实现简单的余弦相似度检索，无需外部向量数据库。 |
| `repositories/` | 具体 Repository | 实现内存版本的各类 Repository，使用字典作为存储后端。 |

### 2.4 LLM 层 (`src/memu/llm/`) - 桌面宠物核心
**作用**：封装大语言模型调用，支持多种 LLM 提供商。这是桌面宠物与 AI 交互的关键层。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `openai_sdk.py` | **[主要客户端]** OpenAI SDK 封装 | 基于官方 `openai` Python SDK 的封装，支持 Chat Completions API。处理流式响应、错误重试、超时控制。兼容 OpenAI 和其他兼容 API（如 Azure OpenAI、本地模型等）。 | ⭐⭐⭐ 必需 |
| `wrapper.py` | **[客户端包装器]** 拦截器支持 | `LLMClientWrapper` 类提供拦截器机制，可在 LLM 调用前后插入自定义逻辑（如日志记录、成本统计、内容过滤）。`LLMInterceptorRegistry` 管理所有拦截器。 | ⭐⭐ 重要，用于监控和扩展 |
| `http_client.py` | **[HTTP 客户端]** 通用 HTTP 封装 | 使用 `httpx` 实现的异步 HTTP 客户端，支持自定义 headers、超时、代理。用于不使用官方 SDK 的 LLM 提供商。 | ⭐⭐ 备用方案 |
| `lazyllm_client.py` | **[LazyLLM 集成]** LazyLLM 框架支持 | 集成 LazyLLM 框架的客户端实现，支持 LazyLLM 的模型管理和调用方式。 | ⭐ 可选，仅在使用 LazyLLM 时需要 |

#### LLM Backends (`backends/`) - 多厂商支持
**作用**：适配不同 LLM 提供商的 API 差异，统一调用接口。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `base.py` | **[基类]** Backend 抽象基类 | 定义所有 Backend 必须实现的接口：`create_completion()`、`create_embedding()` 等。规范化不同提供商的 API 调用。 | ⭐⭐⭐ 必需 |
| `openai.py` | **[OpenAI]** OpenAI 官方 API | 支持 GPT-4、GPT-3.5 等模型。最常用的 Backend，兼容性最好。 | ⭐⭐⭐ 推荐 |
| `doubao.py` | **[豆包]** 字节跳动豆包模型 | 适配豆包（Doubao）模型的 API，处理其特定的请求格式和响应结构。 | ⭐ 可选 |
| `grok.py` | **[Grok]** xAI Grok 模型 | 适配 Grok 模型的 API，支持 Grok 的特殊功能。 | ⭐ 可选 |
| `openrouter.py` | **[OpenRouter]** OpenRouter 聚合服务 | 通过 OpenRouter 访问多种模型（Claude、Llama、Mistral 等）。一个 API key 访问多个模型。 | ⭐⭐ 推荐，灵活性高 |

### 2.5 Embedding 层 (`src/memu/embedding/`) - 向量化核心
**作用**：将文本转换为向量表示，用于语义检索和相似度计算。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `openai_sdk.py` | **[主要实现]** OpenAI Embedding API | 使用 OpenAI 的 `text-embedding-3-small` 或 `text-embedding-ada-002` 模型生成向量。支持批量处理、自动分块。 | ⭐⭐⭐ 必需 |
| `http_client.py` | **[HTTP 实现]** 通用 HTTP Embedding | 使用 HTTP 请求调用 Embedding API，适用于不使用官方 SDK 的场景。 | ⭐⭐ 备用方案 |
| `backends/base.py` | **[基类]** Embedding Backend 抽象 | 定义 Embedding Backend 的统一接口。 | ⭐⭐⭐ 必需 |
| `backends/openai.py` | **[OpenAI]** OpenAI Embedding 适配器 | OpenAI 官方 Embedding API 的具体实现。 | ⭐⭐⭐ 推荐 |
| `backends/doubao.py` | **[豆包]** 豆包 Embedding 适配器 | 字节跳动豆包的 Embedding API 适配。 | ⭐ 可选 |

### 2.6 提示词模板 (`src/memu/prompts/`) - AI 行为定义
**作用**：定义发给 LLM 的指令，决定 AI 的智能行为。这是桌面宠物"个性"和"智能"的核心。

#### 2.6.1 记忆类型提取 (`memory_type/`) - 定义记忆分类
**作用**：从对话中提取不同类型的结构化记忆。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `profile.py` | **[用户画像]** Profile 提取 | 提取用户的基本信息、性格特征、偏好等长期稳定的特质。Prompt 强调提取"用户"相关信息，过滤助手的建议。包含详细的提取规则和示例。 | ⭐⭐⭐ 必需 |
| `knowledge.py` | **[知识]** Knowledge 提取 | 提取用户分享的知识、事实、概念等信息性内容。 | ⭐⭐⭐ 必需 |
| `skill.py` | **[技能]** Skill 提取 | 提取用户掌握的技能、能力、专长等。 | ⭐⭐ 重要 |
| `event.py` | **[事件]** Event 提取 | 提取用户经历的事件、活动、经历等时间相关的记忆。 | ⭐⭐ 重要 |
| `behavior.py` | **[行为习惯]** Behavior 提取 | 提取用户的行为模式、习惯、日常规律等。 | ⭐⭐ 重要 |
| `tool.py` | **[工具]** Tool 相关 | 提取用户使用的工具、软件、平台等信息。 | ⭐ 可选 |

#### 2.6.2 检索相关 (`retrieve/`) - 智能检索
**作用**：优化记忆检索的准确性和相关性。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `query_rewriter.py` | **[查询重写]** 消除歧义 | 将用户的模糊查询（包含代词、省略等）重写为明确的完整查询。分析对话历史，解析引用关系。 | ⭐⭐⭐ 必需 |
| `judger.py` | **[相关性判断]** 结果过滤 | 判断检索到的记忆是否真正相关，过滤无关结果。 | ⭐⭐ 重要 |
| `llm_category_ranker.py` | **[类别排序]** 类别优先级 | 对记忆类别进行相关性排序，优先检索最相关的类别。 | ⭐⭐ 重要 |
| `llm_item_ranker.py` | **[项目排序]** 记忆项排序 | 对检索到的记忆项进行精细排序，返回最相关的结果。 | ⭐⭐ 重要 |
| `llm_resource_ranker.py` | **[资源排序]** 资源优先级 | 对资源（文件、图片等）进行排序。 | ⭐ 可选 |
| `pre_retrieval_decision.py` | **[检索决策]** 是否需要检索 | 判断当前查询是否需要检索记忆，避免不必要的检索操作。 | ⭐⭐ 优化性能 |
| `query_rewriter_judger.py` | **[重写判断]** 是否需要重写 | 判断查询是否需要重写，避免不必要的重写操作。 | ⭐ 优化性能 |

#### 2.6.3 预处理 (`preprocess/`) - 多模态理解
**作用**：将不同格式的输入转换为统一的文本表示。

| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `conversation.py` | **[对话预处理]** 对话格式化 | 将对话历史格式化为适合记忆提取的文本格式。处理多轮对话、角色标识等。 |
| `document.py` | **[文档预处理]** 文档理解 | 处理文档类输入（PDF、Markdown 等），提取关键信息。 |
| `image.py` | **[图片理解]** 视觉内容描述 | 使用视觉模型（如 GPT-4V）理解图片内容，生成文本描述。 |
| `audio.py` | **[音频理解]** 语音转文本 | 处理音频输入，转录为文本或提取音频特征。 |
| `video.py` | **[视频理解]** 视频内容分析 | 处理视频输入，提取关键帧和内容描述。 |

#### 2.6.4 类别处理 (`category_*/`) - 记忆组织
**作用**：管理和维护记忆类别的元数据。

| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `category_patch/category.py` | **[增量更新]** 类别补丁 | 当新记忆加入时，生成类别的增量更新内容，避免重新生成整个摘要。 |
| `category_summary/category.py` | **[摘要生成]** 类别摘要 | 为记忆类别生成简洁的摘要，帮助快速理解类别内容。 |
| `category_summary/category_with_refs.py` | **[带引用摘要]** 引用式摘要 | 生成包含具体记忆项引用的详细摘要。 |

### 2.7 工作流 (`src/memu/workflow/`) - 流程编排
**作用**：管理复杂的异步任务流程，实现可扩展的处理管线。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `pipeline.py` | **[管线管理]** Pipeline 定义 | `PipelineManager` 类管理所有工作流管线。支持管线注册、版本控制、动态修改。可以在运行时插入、删除、配置步骤。 | ⭐⭐⭐ 必需 |
| `runner.py` | **[执行引擎]** Workflow Runner | `WorkflowRunner` 执行工作流，支持同步/异步执行。处理步骤间的数据传递、错误处理、超时控制。`resolve_workflow_runner()` 根据配置选择执行器。 | ⭐⭐⭐ 必需 |
| `step.py` | **[步骤定义]** Workflow Step | `WorkflowStep` 定义单个处理步骤。包含步骤 ID、输入/输出键、执行函数、配置参数。`WorkflowState` 管理步骤间共享的状态数据。 | ⭐⭐⭐ 必需 |
| `interceptor.py` | **[拦截器]** Workflow Interceptor | `WorkflowInterceptorRegistry` 管理工作流拦截器。可在步骤执行前后插入自定义逻辑（如日志、监控、调试）。 | ⭐⭐ 重要，用于扩展 |

### 2.8 其他辅助模块

#### 2.8.1 Blob 存储 (`src/memu/blob/`)
**作用**：管理二进制文件（图片、音频、视频等）的存储。

| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `local_fs.py` | **[本地文件系统]** LocalFS 实现 | 使用本地文件系统存储二进制文件。提供文件上传、下载、删除等操作。自动管理文件路径和元数据。 |

#### 2.8.2 客户端封装 (`src/memu/client/`)
**作用**：提供额外的客户端封装层。

| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `openai_wrapper.py` | **[OpenAI 包装器]** 兼容层 | 提供与 OpenAI 官方客户端兼容的接口，方便从其他项目迁移。 |

#### 2.8.3 外部集成 (`src/memu/integrations/`)
**作用**：与外部框架和工具的集成。

| 文件名 | 作用 | 详细说明 | 桌面宠物重要性 |
| :--- | :--- | :--- | :--- |
| `langgraph.py` | **[LangGraph 集成]** LangGraph 工具 | 将 memU 封装为 LangGraph 工具，可在 LangGraph 工作流中使用。提供 `memorize_tool` 和 `retrieve_tool`。 | ⭐ 可选，仅在使用 LangGraph 时需要 |

#### 2.8.4 工具函数 (`src/memu/utils/`)
**作用**：通用工具函数集合。

| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `conversation.py` | **[对话工具]** 格式转换 | 对话格式转换工具，支持多种对话格式（OpenAI、Anthropic、自定义等）之间的转换。 |
| `references.py` | **[引用处理]** 引用解析 | 处理记忆项之间的引用关系，解析引用链接。 |
| `tool.py` | **[通用工具]** 辅助函数 | 各种通用辅助函数（字符串处理、时间处理等）。 |
| `video.py` | **[视频工具]** 视频处理 | 视频文件处理工具（提取帧、转码等）。 |

## 3. 示例代码 (`examples/`) - 学习和参考

### 3.1 核心示例
| 文件名 | 作用 | 详细说明 | 桌面宠物参考价值 |
| :--- | :--- | :--- | :--- |
| `getting_started_robust.py` | **[入门示例]** 基础使用 | 展示如何初始化 `MemoryService`、配置数据库和 LLM、执行基本的记忆和检索操作。包含完整的错误处理和配置示例。 | ⭐⭐⭐ 必读 |
| `example_1_conversation_memory.py` | **[对话记忆]** 对话场景 | 演示如何从对话中提取和存储记忆，以及如何在后续对话中检索相关记忆。 | ⭐⭐⭐ 必读 |
| `example_2_skill_extraction.py` | **[技能提取]** 技能记忆 | 专注于从对话中提取用户技能信息的示例。 | ⭐⭐ 参考 |
| `example_3_multimodal_memory.py` | **[多模态]** 图片/音频 | 展示如何处理多模态输入（图片、音频），将其转换为记忆。 | ⭐⭐ 参考 |
| `example_4_openrouter_memory.py` | **[OpenRouter]** 多模型支持 | 演示如何使用 OpenRouter 访问多种 LLM 模型。 | ⭐⭐ 参考 |
| `example_5_with_lazyllm_client.py` | **[LazyLLM]** LazyLLM 集成 | 展示如何使用 LazyLLM 框架。 | ⭐ 可选 |

### 3.2 高级示例

#### 3.2.1 Proactive 主动交互 (`proactive/`) - 桌面宠物核心参考
**作用**：展示 AI 主动性交互的完整实现，这是桌面宠物的关键特性。

| 文件名 | 作用 | 详细说明 | 桌面宠物参考价值 |
| :--- | :--- | :--- | :--- |
| `proactive.py` | **[主程序]** 主动交互循环 | 实现了一个完整的主动交互循环：<br>1. 用户输入或 AI 主动发起<br>2. 调用 Claude Agent SDK 进行对话<br>3. 后台异步记忆化（`trigger_memorize()`）<br>4. 检查待办事项（`_get_todos()`）<br>5. AI 主动提醒或继续对话<br>包含记忆化阈值控制（`N_MESSAGES_MEMORIZE`）和后台任务管理。 | ⭐⭐⭐ 必读，桌面宠物核心逻辑 |
| `memory/config.py` | **[配置]** 记忆服务配置 | 定义记忆服务的配置参数（数据库路径、LLM 配置、记忆类别等）。 | ⭐⭐⭐ 必读 |
| `memory/local/memorize.py` | **[本地记忆]** 记忆化实现 | 实现本地版本的记忆化逻辑，将对话存储到本地数据库。 | ⭐⭐⭐ 必读 |
| `memory/local/tools.py` | **[工具函数]** 待办事项管理 | 实现 `_get_todos()` 函数，从记忆中提取待办事项。展示如何基于记忆实现主动提醒功能。 | ⭐⭐⭐ 必读，主动性关键 |
| `memory/platform/` | **[平台版本]** 云端记忆 | 平台版本的记忆实现（使用云端 API）。 | ⭐ 可选，桌面版不需要 |

#### 3.2.2 LangGraph 集成 (`langgraph_demo.py`)
**作用**：展示如何将 memU 集成到 LangGraph 工作流中。

| 文件名 | 作用 | 桌面宠物参考价值 |
| :--- | :--- | :--- |
| `langgraph_demo.py` | LangGraph 工作流示例 | 演示 memU 作为 LangGraph 节点的使用方式。 | ⭐ 可选，仅在使用 LangGraph 时参考 |

#### 3.2.3 Sealos 助手 (`sealos-assistant/`) - 完整应用参考
**作用**：一个基于 Sealos 平台的完整 AI 助手应用，可作为桌面宠物的架构参考。

| 文件名 | 作用 | 详细说明 |
| :--- | :--- | :--- |
| `main.py` | **[主应用]** FastAPI 服务 | 使用 FastAPI 构建的 Web 服务，提供 REST API 接口。展示如何将 memU 封装为服务。 |
| `entrypoint.sh` | **[启动脚本]** 容器入口 | Docker 容器的启动脚本。 |
| `requirements.txt` | **[依赖]** Python 依赖 | 应用所需的 Python 包列表。 |
| `README.md` | **[文档]** 部署说明 | Sealos 平台部署指南。 |

### 3.3 测试示例
| 文件名 | 作用 |
| :--- | :--- |
| `test_nebius_provider.py` | Nebius 提供商测试示例。 |
| `sealos_support_agent.py` | Sealos 支持代理示例。 |

### 3.4 资源文件 (`resources/`)
**作用**：示例代码使用的测试数据。

| 目录 | 内容 |
| :--- | :--- |
| `conversations/` | 示例对话 JSON 文件（`conv1.json`、`conv2.json`、`conv3.json`）。 |
| `docs/` | 示例文档文件（`doc1.txt`、`doc2.txt`）。 |
| `images/` | 示例图片文件（`image1.png`）。 |
| `logs/` | 示例日志文件（`log1.txt`、`log2.txt`、`log3.txt`）。 |

## 4. 测试代码 (`tests/`) - 质量保证

### 4.1 核心测试
| 文件名 | 作用 | 测试内容 |
| :--- | :--- | :--- |
| `test_sqlite.py` | **[SQLite 测试]** 数据库测试 | 测试 SQLite 数据库的所有操作：创建、读取、更新、删除、查询、向量检索等。 |
| `test_postgres.py` | **[Postgres 测试]** Postgres 数据库测试 | 测试 Postgres 数据库功能（需要 Postgres 环境）。 |
| `test_inmemory.py` | **[内存测试]** 内存数据库测试 | 测试内存数据库的功能。 |
| `test_client_wrapper.py` | **[客户端测试]** LLM 客户端包装器测试 | 测试 LLM 客户端的拦截器、错误处理等功能。 |
| `test_lazyllm.py` | **[LazyLLM 测试]** LazyLLM 集成测试 | 测试 LazyLLM 客户端的功能。 |
| `test_openrouter.py` | **[OpenRouter 测试]** OpenRouter 集成测试 | 测试 OpenRouter 后端的功能。 |
| `test_references.py` | **[引用测试]** 引用处理测试 | 测试记忆项引用关系的处理。 |
| `test_salience.py` | **[显著性测试]** 记忆显著性测试 | 测试记忆项显著性评分和排序。 |
| `test_tool_memory.py` | **[工具记忆测试]** 工具相关记忆测试 | 测试工具使用记忆的提取和存储。 |
| `rust_entry_test.py` | **[Rust 测试]** Rust 扩展测试 | 测试 Rust 扩展模块是否正常加载。 |

### 4.2 集成测试
| 目录/文件 | 作用 |
| :--- | :--- |
| `integrations/test_langgraph.py` | 测试 LangGraph 集成功能。 |
| `llm/test_grok_provider.py` | 测试 Grok LLM 提供商。 |
| `utils/test_conversation.py` | 测试对话格式转换工具。 |

### 4.3 测试资源
| 目录 | 内容 |
| :--- | :--- |
| `example/example_conversation.json` | 测试用的示例对话数据。 |

## 5. 文档与资源 (`docs/`, `assets/`, `readme/`)

### 5.1 技术文档 (`docs/`)
| 文件名 | 作用 | 内容 |
| :--- | :--- | :--- |
| `sqlite.md` | **[SQLite 文档]** SQLite 使用说明 | SQLite 数据库的配置、使用、优化指南。 |
| `langgraph_integration.md` | **[LangGraph 文档]** LangGraph 集成指南 | 如何将 memU 集成到 LangGraph 工作流。 |
| `sealos-devbox-guide.md` | **[Sealos 文档]** Sealos Devbox 指南 | 在 Sealos Devbox 中开发和部署 memU 应用。 |
| `sealos_use_case.md` | **[Sealos 案例]** Sealos 使用案例 | Sealos 平台上的实际应用案例。 |
| `providers/grok.md` | **[Grok 文档]** Grok 提供商文档 | Grok LLM 的配置和使用说明。 |
| `integrations/grok.md` | **[Grok 集成]** Grok 集成指南 | Grok 模型的集成步骤。 |
| `tutorials/getting_started.md` | **[教程]** 入门教程 | 从零开始使用 memU 的完整教程。 |
| `HACKATHON_*.md` | **[黑客松]** 黑客松相关文档 | 黑客松活动的问题草稿和创意组合。 |

### 5.2 静态资源 (`assets/`)
| 目录/文件 | 内容 |
| :--- | :--- |
| `banner.png` | 项目横幅图片。 |
| `benchmark.png` | 性能基准测试图表。 |
| `memorize.png` | 记忆化流程示意图。 |
| `retrieve.png` | 检索流程示意图。 |
| `structure.png` | 项目架构图。 |
| `memUbot.png` | memU 机器人 Logo。 |
| `qrcode.png` | 项目二维码（可能是微信群或官网）。 |
| `star.gif` | GitHub Star 动画。 |
| `partners/` | 合作伙伴 Logo（Buddie、Bytebase、Jazz、LazyLLM、OpenAgents、XRoute）。 |
| `usecase/` | 应用场景图片（AI 伴侣、AI 创作、AI 教育、AI IP、AI 机器人、AI 角色扮演、AI 治疗）。 |

### 5.3 多语言 README (`readme/`)
| 文件名 | 语言 |
| :--- | :--- |
| `README_en.md` | 英文版 README。 |
| `README_zh.md` | 中文版 README。 |
| `README_ja.md` | 日文版 README。 |
| `README_ko.md` | 韩文版 README。 |
| `README_es.md` | 西班牙文版 README。 |
| `README_fr.md` | 法文版 README。 |

## 6. CI/CD 与 GitHub 配置 (`.github/`)

### 6.1 GitHub Actions (`workflows/`)
**作用**：自动化测试、构建、发布流程。

可能包含的工作流：
- 代码质量检查（Lint、类型检查）
- 自动化测试（单元测试、集成测试）
- 构建和发布（PyPI 发布、Docker 镜像构建）
- 文档生成和部署

### 6.2 Issue 模板 (`ISSUE_TEMPLATE/`)
**作用**：规范化 GitHub Issue 的提交格式。

可能包含的模板：
- Bug 报告模板
- 功能请求模板
- 问题反馈模板

---

## 7. 桌面宠物开发裁剪指南

### 7.1 必需保留的模块
以下模块是桌面宠物的核心，必须保留：

1. **应用服务层** (`src/memu/app/`)
   - 所有文件都需要保留
   - 这是与 memU 交互的主要接口

2. **SQLite 数据库** (`src/memu/database/sqlite/`)
   - 轻量级本地存储，适合桌面应用
   - 保留所有文件

3. **数据库核心** (`src/memu/database/`)
   - `factory.py`、`interfaces.py`、`models.py`、`state.py`
   - `repositories/` 目录

4. **LLM 层** (`src/memu/llm/`)
   - 保留 `openai_sdk.py`、`wrapper.py`
   - `backends/` 中至少保留 `base.py` 和 `openai.py`
   - 可选保留 `openrouter.py`（支持多模型）

5. **Embedding 层** (`src/memu/embedding/`)
   - 保留 `openai_sdk.py`
   - `backends/` 中保留 `base.py` 和 `openai.py`

6. **Prompts 层** (`src/memu/prompts/`)
   - 所有 Prompt 文件都建议保留
   - 这些定义了 AI 的行为和智能

7. **工作流层** (`src/memu/workflow/`)
   - 所有文件都需要保留
   - 管理记忆化和检索的流程

8. **工具模块** (`src/memu/utils/`)
   - 保留所有文件

9. **Blob 存储** (`src/memu/blob/`)
   - 保留 `local_fs.py`

### 7.2 可以移除的模块
以下模块对桌面宠物不是必需的，可以安全移除：

1. **Postgres 数据库** (`src/memu/database/postgres/`)
   - 完全移除，桌面应用不需要

2. **内存数据库** (`src/memu/database/inmemory/`)
   - 可选移除，除非需要临时会话功能

3. **LazyLLM 客户端** (`src/memu/llm/lazyllm_client.py`)
   - 如果不使用 LazyLLM 框架，可以移除

4. **额外的 LLM Backends**
   - `backends/doubao.py`、`backends/grok.py`
   - 根据实际使用的模型决定是否保留

5. **LangGraph 集成** (`src/memu/integrations/langgraph.py`)
   - 如果不使用 LangGraph，可以移除

6. **Sealos 相关示例** (`examples/sealos-assistant/`)
   - 云平台相关，桌面应用不需要

7. **Rust 扩展** (`lib.rs`、`Cargo.toml`、`Cargo.lock`)
   - 如果不需要性能优化，可以移除
   - 移除后需要修改 `pyproject.toml` 的构建配置

### 7.3 依赖裁剪建议
在 `pyproject.toml` 中，可以移除以下可选依赖：

```toml
# 移除 Postgres 相关
[project.optional-dependencies]
postgres = [...]  # 整个section可以删除

# 移除 LangGraph 相关（如果不使用）
langgraph = [...]  # 整个section可以删除

# 移除 Claude 相关（如果不使用）
claude = [...]  # 整个section可以删除
```

核心依赖保留：
- `openai` - LLM 和 Embedding
- `pydantic` - 数据验证
- `sqlmodel` - SQLite ORM
- `httpx` - HTTP 客户端
- `numpy` - 向量计算

### 7.4 桌面宠物开发建议

1. **从 Proactive 示例开始**
   - `examples/proactive/proactive.py` 是最佳参考
   - 实现了主动交互循环和后台记忆化

2. **关键功能实现**
   - 对话记忆：使用 `MemoryService.memorize()`
   - 记忆检索：使用 `MemoryService.retrieve()`
   - 主动提醒：参考 `_get_todos()` 实现

3. **UI 集成建议**
   - 使用 PyQt/PySide 或 Electron 构建桌面界面
   - 后台运行 memU 服务
   - 异步处理记忆化，避免阻塞 UI

4. **性能优化**
   - 使用 SQLite 的 WAL 模式提高并发性能
   - 批量处理记忆化请求
   - 缓存常用的检索结果

5. **配置管理**
   - 将配置文件放在用户目录（如 `~/.memu_pet/`）
   - 支持多用户配置
   - 提供配置 UI 方便用户修改 LLM API Key 等

---

## 总结

memU 是一个高度模块化的 AI 记忆管理框架，采用分层架构设计：

- **应用层**：提供统一的 API 接口
- **数据层**：支持多种数据库后端
- **LLM 层**：封装多种大语言模型
- **Prompt 层**：定义 AI 行为
- **工作流层**：管理复杂流程

对于桌面宠物开发，核心是保留 SQLite 数据库、OpenAI LLM/Embedding、完整的 Prompt 系统和工作流管理。参考 `examples/proactive/` 示例可以快速实现主动交互功能。

项目的模块化设计使得裁剪和定制非常方便，你可以根据实际需求选择保留或移除特定模块。
