# memU-server: 桌面宠物专用版

memU-server 是为 memPet 桌面宠物应用定制的后端服务，基于 memU 核心框架，提供记忆存储、检索和主动推理功能。

本版本针对桌面宠物场景进行了优化，支持：
- 自定义记忆分类（工作习惯、情感状态、互动历史等）
- 系统观察记录（应用切换、疲劳检测、空闲检测等）
- 主动推理分析（基于上下文生成建议）
- 批量处理优化（高频监控数据）

---

## 快速开始

### 1. 环境要求

- Python 3.13+
- [uv](https://docs.astral.sh/uv/) 包管理器
- PostgreSQL 数据库（推荐使用 Docker）

### 2. 配置

复制 `.env.example` 为 `.env` 并配置：

```env
# 通义千问 API 配置（推荐，便宜）
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://dashscope.aliyuncs.com/compatible-mode/v1
DEFAULT_LLM_MODEL=qwen-plus
# DEFAULT_EMBED_MODEL=text-embedding-v3

# 或：硅基流动（OpenAI 兼容）
# OPENAI_API_KEY=sk-xxx
# OPENAI_BASE_URL=https://api.siliconflow.cn/v1
# DEFAULT_LLM_MODEL=Qwen/Qwen3-8B
# DEFAULT_EMBED_MODEL=BAAI/bge-large-zh-v1.5

# 数据库配置
DATABASE_URL=postgresql+psycopg://postgres:postgres@localhost:5432/memu
```

### 3. 启动数据库

使用 Docker Compose：

```bash
docker compose up -d postgres
```

### 4. 启动服务

```bash
# 开发模式
uv run fastapi dev app/main.py

# 生产模式
uv run fastapi run app/main.py
```

服务运行在 `http://127.0.0.1:8000`

### 5. 测试

```bash
# 简单测试
python tests/test_simple.py

# 完整测试（包括分类和识别）
python tests/test_classification.py
```

---

## 核心功能

### 1. 桌面宠物适配

#### 自定义记忆分类

- 工作习惯：工作模式、时长、常用应用
- 情感状态：情绪变化、压力水平、疲劳度
- 互动历史：与宠物的对话、反馈、互动记录
- 日常行为：作息时间、活动模式、休息习惯
- 兴趣爱好：兴趣、爱好、娱乐活动

#### 系统观察类型

- `app_switch`：应用切换
- `fatigue_detected`：疲劳检测
- `idle_detected`：空闲检测
- `work_session_end`：工作会话结束
- `late_night_work`：深夜工作
- `break_taken`：休息记录

### 2. 主动推理

- 上下文分析：根据工作时长、疲劳度等生成建议
- 冷却时间管理：避免频繁打扰用户
- 多种性格支持：友好型、活力型、专业型、傲娇型
- 优先级排序：高、中、低优先级建议

### 3. 批量优化

- 缓冲区机制：避免频繁写入
- 数据聚合：过滤短暂记录，合并相似数据
- 自动刷新：每 5 分钟或缓冲区满 10 条时批量存储

---

## API 接口

详细接口文档请查看 [接口文档.md](./docs/接口文档.md)

### 基础接口

- `GET /`：健康检查

### 记忆管理

- `POST /memorize`：存储对话和系统观察
- `POST /retrieve`：检索记忆（对话/主动推理场景）

### 主动推理

- `POST /proactive/analyze`：分析上下文生成建议
- `POST /proactive/generate`：生成自然语言消息
- `GET /proactive/cooldown`：获取冷却状态
- `POST /proactive/cooldown/reset`：重置冷却时间

### 批量处理

- `POST /batch/observations`：批量添加观察记录
- `POST /batch/flush`：强制刷新缓冲区

---

## 项目结构

```
memU-server/
├── app/
│   ├── main.py                    # FastAPI 应用入口
│   ├── database.py                # 数据库配置
│   └── services/
│       ├── memory_adapter.py      # 桌面宠物适配器
│       └── proactive_helper.py    # 主动推理辅助器
├── tests/                         # 测试文件
│   ├── test_simple.py            # 简单测试
│   ├── test_classification.py    # 分类测试
│   └── test_adapter.py           # 适配器测试
├── data/                          # 数据存储目录
├── .env                           # 环境变量配置
├── docker-compose.yml             # Docker 配置
├── 接口文档.md                     # API 参考文档
├── DESKTOP_PET_ADAPTER.md         # 适配器使用指南
└── README.md                      # 本文件
```

---

## 文档

- [接口文档](./docs/接口文档.md) - 完整的 API 接口说明
- [快速启动指南](./docs/快速启动.md) - 中文快速启动说明
- [测试指南](./docs/测试指南.md) - 如何测试 memU-server

---

## 与 Electron 集成

memU-server 作为 HTTP API 服务，需要在 Electron 主进程中调用：

```typescript
// Electron 主进程
import axios from 'axios';

const BASE_URL = 'http://localhost:8000';

// 存储对话记忆
async function memorizeConversation(content) {
  const response = await axios.post(`${BASE_URL}/memorize`, {
    type: 'conversation',
    content
  });
  return response.data;
}

// 存储系统观察
async function memorizeObservation(observation) {
  const response = await axios.post(`${BASE_URL}/memorize`, {
    type: 'system_observation',
    observation
  });
  return response.data;
}

// 主动推理分析
async function analyzeContext(context) {
  const response = await axios.post(`${BASE_URL}/proactive/analyze`, {
    context
  });
  return response.data;
}
```

---

## 开发状态

### 已完成

- FastAPI 服务器
- 通义千问 API 集成
- PostgreSQL 数据库支持
- 桌面宠物适配层
- 主动推理系统
- 批量处理优化
- 完整的 API 接口
- 测试脚本

### 待完成（在 Electron 中实现）

- 实际的系统监控（活动窗口检测）
- 空闲时间检测
- 工作时长统计
- 监控循环（每 30 秒）

---

## 技术栈

- FastAPI - Web 框架
- memU - 记忆引擎核心库
- PostgreSQL - 数据库
- 通义千问 - LLM API
- Docker - 容器化部署

---

## 许可证

AGPL-3.0 License

---

**文档版本：** v1.0 (桌面宠物专用版)  
**更新时间：** 2026-02-15
