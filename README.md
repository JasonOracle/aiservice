# AI 客服 MVP

## 快速启动

### 前置条件
- Python 3.11+
- Node.js 18+
- pnpm 9+
- Docker (可选，用于容器化部署)

### 本地开发

```bash
# 1. 启动后端
cd backend
pip install -r requirements.txt
python scripts/seed.py     # 注入 10 个种子用户
python scripts/seed_kb.py  # 注入 RAG 知识库文档
uvicorn main:app --port 8001 --reload

# 2. 启动 C 端
cd toc
pnpm install
pnpm run dev               # http://localhost:3000

# 3. 启动 B 端
cd tob
pnpm install
pnpm run dev -p 3001       # http://localhost:3001
```

### Docker 一键部署

```bash
docker-compose up -d
# backend: http://localhost:8000/docs
# toc:     http://localhost:3000
# tob:     http://localhost:3001
```

## 架构

```
┌─────────────┐     ┌─────────────┐     ┌──────────────────┐
│  toc (3000)  │────▶│  backend     │◀───│  tob (3001)      │
│  C端商城     │     │  FastAPI    │     │  B端管理后台     │
│  Next.js     │     │  8000/8001  │     │  Ant Design X   │
│  antd-mobile │     │  SQLite     │     │  Next.js         │
└─────────────┘     │  RAG + Mem0 │     └──────────────────┘
                    └─────────────┘
                        WebSocket
                    /ws/c/{user_id}
                    /ws/agent
```

## 演示账号

| 手机号 | 姓名 | 密码 |
|:---|:---|:---|
| 13800000001 | 张伟 | 123456 |
| 13800000002 | 李娜 | 123456 |
| 13800000003 | 王强 | 123456 |
| 13800000004 | 赵敏 | 123456 |
| 13800000005 | 陈杰 | 123456 |
| 13800000006 | 杨洋 | 123456 |
| 13800000007 | 周游 | 123456 |
| 13800000008 | 吴婷 | 123456 |
| 13800000009 | 孙斌 | 123456 |
| 13800000010 | 林青 | 123456 |

## 核心功能

- **C端**：双端异构渲染（移动端 antd-mobile / PC 端 antd），扫码跨端接力
- **B端**：知识库大盘、模型中心、实时坐席监控（WebSocket）
- **AI 引擎**：SQLite FTS5 RAG + Mem0 记忆 + OpenAI LLM 调用
- **安全线**：RAG 检索不到内容时明确告知并转人工，严禁幻觉
