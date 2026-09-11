# AI Service MVP

[English](#english) | [中文](#中文)

---

<a name="english"></a>
## 🌐 English

**AI Service MVP** is an enterprise-grade, high-end AI customer service system built with a modern tech stack. It features cross-platform seamless transitions (PC/Mobile), long-term AI memory, and real-time agent monitoring.

### 🏗️ Architecture
The project is built as a Monorepo with three core independent modules:
- **`backend`**: The brain of the system. Built with `Python 3.11+` and `FastAPI`. It integrates **Mem0** for personalized long-term memory, local SQLite FTS5 for **RAG** (Retrieval-Augmented Generation), and WebSocket for real-time streaming.
- **`toc` (Customer Facing App)**: Built with `Next.js (App Router)`. It uses User-Agent sniffing for adaptive dual-tree rendering (`antd` for desktop, `antd-mobile` for mobile). Supports QR code generation for seamless PC-to-Mobile chat handover.
- **`tob` (Admin Console)**: Built with `Next.js` and `Ant Design X`. A dark-themed, high-end SaaS dashboard for monitoring real-time AI chats, managing the knowledge base, and manual agent intervention.

### 🚀 Quick Start (Docker)
```bash
# Start all services (Backend: 8080, ToC: 3000, ToB: 3001)
docker-compose up -d --build
```
- **ToC App**: `http://localhost:3000` (Login with phone: `13800000001`, password: `123456`)
- **ToB Admin**: `http://localhost:3001` (Admin pass: `admin123`)
- **API Docs**: `http://localhost:8080/docs`

---

<a name="中文"></a>
## 🇨🇳 中文

**AI Service MVP** 是一个企业级高定版 AI 客服系统。主打跨端无缝接力、AI 千人千面长期记忆以及全双工实时坐席监控。

### 🏗️ 核心架构
项目采用 Monorepo 结构，物理隔离为三个独立模块：
- **`backend` (Python 引擎)**：基于 `FastAPI` 构建。集成了 **Mem0** 实现用户的长期记忆，自带轻量级 **RAG** 向量检索库，并通过 WebSocket 实现流式输出与坐席广播。
- **`toc` (C端用户商城)**：基于 `Next.js (App Router)` 构建。采用双端异构渲染技术（PC端渲染宽屏布局，手机端渲染原生级 App 体验），支持 PC 端生成局域网二维码，手机扫码无缝接力对话。
- **`tob` (B端坐席后台)**：基于 `Next.js` 和最新的 `Ant Design X` 构建。提供深色模式 SaaS 级大盘，支持实时监控所有 AI 会话，并允许人工坐席随时插话介入。

### 🚀 极速部署 (Docker)
```bash
# 一键构建并启动 (后端: 8080, C端: 3000, B端: 3001)
docker-compose up -d --build
```
- **C端访问**: `http://localhost:3000` (使用种子用户登录，如手机号: `13800000001`, 密码: `123456`)
- **B端访问**: `http://localhost:3001` (管理密码: `admin123`)
- **接口文档**: `http://localhost:8080/docs`
