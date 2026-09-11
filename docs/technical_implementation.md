# 技术实施文档 (Technical Implementation)

## 1. 系统架构与环境隔离
本系统采用**前后端分离**架构，前端注重现代 UI，后端专注硬核 AI 能力。系统严格区分本地开发环境与线上生产环境。

- **前端层 (Next.js)**: React Server Components + Client Components，使用 Tailwind CSS + shadcn/ui。负责聊天流的展示与二维码生成 (`qrcode.react`)。
- **核心 AI 后端层 (Python)**: 使用 **FastAPI** 框架。因为 Python 拥有最强大的 AI 生态，所有的核心 AI 逻辑（LangChain/LlamaIndex、**Mem0 Python SDK**）均在此处理。
- **模型接入**: 统一通过 Python 环境中的 `.env` 里的 `API_KEY` 进行第三方大模型调用。
- **数据与检索层 (环境隔离)**: 
  - *线上生产环境*: TiDB Serverless (MySQL 兼容 + Vector 扩展) 用于 RAG 和 Mem0 的底层存储。
  - *本地开发环境*: SQLite (关系型数据) + ChromaDB 本地版 (向量数据)

## 2. 数据库设计 (TiDB)
我们将在 TiDB 中创建两张核心表：

1. **`sessions` (会话表)**:
   - `id`: string (UUID)
   - `created_at`: timestamp
   - 存储跨端接力需要的会话基础信息。

2. **`knowledge_chunks` (知识库片段表)**:
   - `id`: bigint auto_increment
   - `content`: text (原始文本内容)
   - `embedding`: vector(1536) (存储 OpenAI 或其他模型生成的 1536 维向量)
   - `metadata`: json (来源、时间等元数据)

## 3. 核心 API 路由定义 (FastAPI 端)

- `POST /api/chat`: 
  - 接收 `{ messages, sessionId }`。
  - **Memory (Mem0)**: Python 后端根据 `sessionId` 向 Mem0 查询该用户的长期记忆。
  - **RAG**: Python 进行文本 Vector Embedding，在 TiDB 中通过 SQL 计算余弦相似度检索全局知识。
  - 构造 Prompt，调用模型并返回 Server-Sent Events (SSE) 数据流给 Next.js 前端。
  - 异步触发 Mem0 的 `add()` 方法更新记忆。

- `POST /api/admin/ingest`:
  - 接收知识库文本。
  - Python 调用 Embedding 模型将文本转为向量并存入 TiDB。

## 4. 状态管理
由于核心只涉及聊天列表，主要依赖 Vercel AI SDK 提供的 `useChat` hook 来管理消息队列、加载状态和输入流。
通过 URL 参数 (如 `?sessionId=xxx`) 实现跨端接力时读取云端历史的功能。
