# 🤖 AI Customer Service Full-Stack System (AI Service)

<div align="center">

> **"AI delivers efficiency, while humans assume responsibility."**  
> An enterprise-grade, closed-loop AI customer service platform built with **Next.js 16 + FastAPI + TiDB Cloud + Multimodal Vision + Full-Duplex WebSockets**.

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI%200.115-009688.svg?style=flat-square&logo=fastapi)](https://fastapi.tiangolo.com)
[![Next.js](https://img.shields.io/badge/Frontend-Next.js%2016%20(App%20Router)-black.svg?style=flat-square&logo=next.js)](https://nextjs.org)
[![Ant Design X](https://img.shields.io/badge/UI-Ant%20Design%20X%20%2F%20antd%206-1677ff.svg?style=flat-square)](https://x.ant.design)
[![TiDB Cloud](https://img.shields.io/badge/Database-TiDB%20Cloud%20Serverless-F32C42.svg?style=flat-square&logo=pingcap)](https://tidbcloud.com)
[![Render](https://img.shields.io/badge/Deploy-Render.com-46E3B7.svg?style=flat-square&logo=render)](https://render.com)
[![Cloudflare Pages](https://img.shields.io/badge/Deploy-Cloudflare%20Pages-F38020.svg?style=flat-square&logo=cloudflare)](https://pages.cloudflare.com)

[Live Demo](#-live-demo) • [Core Engineering Highlights](#-core-engineering-highlights--interview-deep-dive) • [System Architecture](#-system-architecture) • [Full Feature Tour](#-full-feature-tour--real-world-screenshots) • [Quick Start](#-quick-start-with-docker) • [中文文档](./README.md)

</div>

---

## 🌐 Live Demo

This system is fully deployed in a **cloud-native, serverless production architecture** with zero infrastructure cost:

| Service / Module | Live URL | Credentials / Notes | Platform |
| :--- | :--- | :--- | :--- |
| **🎧 B-End Agent Workbench** | [AI Customer Service - Admin Console](https://aiservice-tob.pages.dev/) | Admin Passcode: `admin123` | **Cloudflare Pages** |
| **🛍️ C-End Store WebApp** | [AI Store · Smart Service (Direct Product Chat)](https://aiservice-toc.pages.dev/product/keyboard-k8pro) | Account: `13800000001`, Pass: `123456` (or visit [Home](https://aiservice-toc.pages.dev)) | **Cloudflare Pages** |
| **⚡ Backend API & WebSocket Hub** | `https://aiservice-backend.onrender.com` | Swagger Interactive API: `/docs` | **Render (Singapore)** |
| **🗄️ Distributed Cloud Database** | `gateway01.ap-southeast-1.prod.aws.tidbcloud.com:4000` | 100% MySQL 8.0 Protocol Compatible, DB: `test` | **TiDB Cloud Serverless** |

---

## 💡 Why Build This System? (Engineering Philosophy)

Most open-source "AI customer service" repositories are merely simple wrappers around chat APIs. **In real e-commerce enterprise scenarios, raw chatbots inevitably fail due to critical flaws**:

1. **Hallucination and Legal Liability**: When customers inquire about warranty, return policies, or upload pictures of broken merchandise asking if it constitutes a product defect, an unconstrained LLM can make false promises that lead to customer disputes and severe business losses.
2. **Context Bleed Across Multiple Stores**: A customer frequently browses and asks about different products from different stores simultaneously. Grouping chats purely by `user_id` causes chaos for human agents.
3. **Superficial "Human Takeover"**: Many systems lack atomic state machine coordination. When a human agent steps in, the AI keeps answering concurrently, or the takeover state vanishes upon browser refresh.

**Our Core Axiom: `AI delivers efficiency, while humans assume responsibility.`**
* **Factual Queries**: Grounded in fine-tuned RAG knowledge chunks with source citations and multimodal Vision analysis.
* **Controversial & Dispute Queries**: The AI **strictly describes observable physical facts**, explicitly refuses to make liability determinations, **triggers an automatic human handoff, and atomically cuts off AI custody**, allowing human agents on the workbench to make the final authoritative call.

---

## 🏗️ System Architecture

The project is decoupled into two independent frontend applications and an asynchronous Python FastAPI communication backbone:

```
                          ┌───────────────────────────┐
                          │     Customers / Mobile    │
                          └─────────────┬─────────────┘
                                        │
                 ┌──────────────────────┴──────────────────────┐
                 │                                             │
                 ▼                                             ▼
  ┌───────────────────────────────┐             ┌───────────────────────────────┐
  │   C-End Store WebApp (toc)    │             │   B-End Agent Console (tob)   │
  │  Next.js 16 / React 19 / TS   │             │  Next.js 16 / React 19 / TS   │
  │  PC: antd v6 Immersive Modal  │             │  Ant Design X Native AI Bubble│
  │  Mobile: antd-mobile Native UI│             │  Multi-Agent Sync / Quick Chip│
  └──────────────┬────────────────┘             └──────────────┬────────────────┘
                 │ HTTP / REST                                 │ WebSocket /ws/agent
                 │ WebSocket /ws/c/{user_id}                   │ REST /api/conversations
                 └──────────────────────┬──────────────────────┘
                                        │
                                        ▼
  ┌─────────────────────────────────────────────────────────────────────────────┐
  │                       FastAPI Asynchronous Engine (backend)                 │
  │                                                                             │
  │  ┌─────────────────────────┐  ┌────────────────────────┐  ┌──────────────┐  │
  │  │ Full-Duplex WS Hub      │  │ Conversation & Message │  │ Image Store  │  │
  │  │ (Agent Broadcast / C-WS)│  │ Persistence Engine     │  │ & Base64 URL │  │
  │  └─────────────────────────┘  └────────────────────────┘  └──────────────┘  │
  │  ┌─────────────────────────┐  ┌────────────────────────┐  ┌──────────────┐  │
  │  │ Fine-Grained RAG Engine │  │ Two-Tier Custody State │  │ Dual-Source  │  │
  │  │ (FTS5 / Weighted Titles)│  │ Machine (Session > All)│  │ Handoff Det. │  │
  │  └─────────────────────────┘  └────────────────────────┘  └──────────────┘  │
  └──────────────────────┬───────────────────────────────┬──────────────────────┘
                         │                               │
                         ▼                               ▼
      ┌────────────────────────────────────┐   ┌────────────────────────────────┐
      │       TiDB Cloud Serverless        │   │     OpenAI-Compatible Vision   │
      │  users / conversations / messages  │   │  Dots / Qwen / GPT-4o Vision   │
      └────────────────────────────────────┘   └────────────────────────────────┘
```

---

## 🌟 Core Engineering Highlights & Interview Deep Dive

### 1. Multimodal Vision & Base64 In-Memory Tunneling
* **Engineering Pitfall**: During local development or private containerization, images reside on internal endpoints (e.g., `http://localhost:8080/uploads/...`). Passing relative or internal paths to public model gateways causes vision inference to fail immediately because public LLMs cannot connect back to a developer's private IP.
* **Solution**: An image abstraction layer in `chat_images.py` stores relative paths in the DB (guaranteeing historical image validity across domain/port changes). When calling vision models, images are read from disk in memory and converted to **Base64 Data URLs**, inlined into the standard OpenAI vision payload (`[{type: "text"}, {type: "image_url"}]`).
* **Prompt Safety Hard Rail**: Vision analysis distinguishes between factual inquiries (e.g., "what color is this?", "explain the label text") and liability claims (e.g., "the casing has a hairline crack, is this a defect? Can I get a full refund?"). For the latter, the AI objectively states observable physical facts, cites return policy conditions, and initiates an automatic human handoff.

### 2. Fine-Grained Chinese RAG with Strict Fallback Boundaries
* **Noise Filter & 3.0 Title Weight**: Chinese natural language queries often introduce stopwords ("怎么/么选/能不能"). We engineered a 2/3-gram tokenizer with function-word blacklists. Crucially, document titles receive a **3.0x multiplier weight**, ensuring that questions like "How to choose cat food?" never accidentally match "How to choose mechanical keyboard switches?".
* **Zero-Hallucination Fallback**: Document relevance threshold is enforced at `>= 0.30`. Queries falling below this score are strictly banned from model hallucination and route directly to standardized refusal and human referral.

### 3. Composite Session Keys & Deterministic Routing
* **Model Design**: Abandons conventional single-user session design in favor of a **composite primary key**:
  `id = "{user_id}::{session_key}"` (e.g., `1::product:keyboard-k8pro`).
* **Architectural Advantage**:
  - **Zero-Roundtrip Determinism**: Frontends and backends can independently compute conversation IDs without querying the database for primary keys first.
  - **Multi-Store Isolation**: If customer Alice consults "Keychron Store" and "Sunrise Coffee Store" at the same time, her interactions emerge as two distinct, isolated conversation cards on the human agent's workbench.

### 4. Two-Tier AI Custody State Machine
* **Problem**: In concurrent multi-session customer service, once an agent takes over, naive implementations suffer from race conditions where the AI continues answering.
* **Hierarchical Arbitration**:
  - **Global Switch**: Persisted in the `settings` table, controlling the entire store's AI bot.
  - **Session-Level Switch**: Stored in `conversations.ai_managed`, **session-level state overrides global defaults**.
* **Atomic Loop**: When a handoff intent is triggered, the system atomically sets `ai_managed = False`, updates `handoff_reason`, and broadcasts `ai_custody` over WebSockets. Subsequent customer messages bypass the LLM and route solely to the human workbench.

### 5. Never-Throw Fault Tolerance in Storage
* Write functions in `conversation_store.py` are deliberately designed never to throw unhandled exceptions. If the database experiences transient latency or connectivity drops, the message write failure degrades gracefully to an error log, **never interrupting the ongoing WebSocket stream or real-time delivery**.
* C-end clients perform reverse synchronization upon login while retaining newly entered, unsent conversation drafts locally.

---

## 🖼️ Full Feature Tour & Real-World Screenshots

### 1. C-End Desktop Mall (Next.js 16 + antd v6)
| Product Grid Showcase (10 Distinct Stores) | Product Detail & Specs Panel |
| :---: | :---: |
| ![PC Home](docs/screenshots/pc-01-home.png) | ![PC Product](docs/screenshots/pc-02-product.png) |

| Chat Modal with Vision Streaming | Image Upload Toolbar (Drag & Drop / Clipboard Paste) |
| :---: | :---: |
| ![PC Chat](docs/screenshots/pc-03-chat.png) | ![PC Upload](docs/screenshots/pc-05-plus-menu.png) |

### 2. C-End Mobile App Experience (antd-mobile v5)
| Native Dual-Column Feed | Mobile Sticky Action Bar | Multi-Store Session Directory |
| :---: | :---: | :---: |
| ![Mobile Home](docs/screenshots/m-01-home.png) | ![Mobile Product](docs/screenshots/m-02-product.png) | ![Service List](docs/screenshots/m-04-service-list.png) |

| Vision Chat Flow | Thumbnail Previews with Removal | Live Human Agent Indicator |
| :---: | :---: | :---: |
| ![Mobile Chat](docs/screenshots/m-05-chat.png) | ![Pending Images](docs/screenshots/m-07-pending-images.png) | ![Agent State](docs/screenshots/m-03-chat-page.png) |

### 3. B-End SaaS Agent Workbench (Ant Design X)
| Agent Console Overview & Quick Chips | Auto Handoff Alert & Custody Cutoff | Fullscreen Lightbox Inspection |
| :---: | :---: | :---: |
| ![Agent Overview](docs/screenshots/b-01-overview.png) | ![Handoff Alert](docs/screenshots/b-02-handoff.png) | ![Lightbox](docs/screenshots/b-03-image-preview.png) |

---

## 🚀 Quick Start with Docker

### 1. Configure Model Credentials
Create a `.env` file in the root directory (already git-ignored):
```env
XIAO_HONG_SHU_API_KEY=your-api-key-here
```

### 2. Launch Containers
```bash
docker compose up -d --build
```
Access endpoints:
* **C-End Mall**: `http://localhost:3000`
* **B-End Agent Console**: `http://localhost:3001`
* **Backend API Swagger**: `http://localhost:8080/docs`

### 3. Seed Knowledge Base (Idempotent)
```bash
docker compose exec -T backend python scripts/seed_kb.py
```

### 4. (Optional) Inject Realistic Multi-Session Demo Data
```bash
docker compose exec -T backend python scripts/seed_demo.py
```

---

## 👥 Seed Demo Test Accounts

The system seeds 10 realistic customer personas out of the box (Default password: `123456`):

| Phone Number | Name | Persona & Profile |
| :--- | :--- | :--- |
| `13800000001` | David (张伟) | Senior programmer, minimalist, prefers electronics, dislikes pushy sales |
| `13800000002` | Nana (李娜) | Beauty influencer, ingredient-conscious, seeks high-value dupes |
| `13800000003` | Alex (王强) | Fitness coach, bulking phase, monitors protein & nutritional tables |
| `13800000004` | Chloe (赵敏) | New mother, highly sensitive regarding baby product safety |
| `13800000005` | Jerry (陈杰) | Tech enthusiast, college student, performance-driven hardware gamer |
| `13800000006`~`10` | Others | Coffee connoisseur, outdoor camper, cat owner, tea master, anime artist |

* **B-End Console**: Access `http://localhost:3001` and enter passcode `admin123`.

---

## 📂 Repository Structure

```
aiservice/
├── backend/                      # FastAPI Backend Hub
│   ├── ai_engine.py              # LLM Core (Prompt Eng / Vision Assembly / Safety Rails)
│   ├── rag.py                    # RAG Engine (FTS5 / Stopwords Filter / 3x Title Weight)
│   ├── handoff.py                # Human Handoff Intent Detection
│   ├── conversation_store.py     # Persistence Layer (Never-Throw Architecture)
│   ├── chat_images.py            # Image Storage & Base64 Data URL Converter
│   ├── models.py / database.py   # SQLAlchemy Models & SQLite/TiDB Adapters
│   ├── routers/                  # Modular APIs (chat, ws, conversation, custody, upload, kb)
│   └── scripts/                  # seed.py, seed_kb.py, seed_demo.py
├── toc/                          # Customer-Facing Next.js 16 WebApp
│   ├── components/shop/          # Shop Components (ProductGrid, PcChatModal, ProductCard)
│   ├── components/chat/          # Chat Components (ChatComposer, ChatMessageList, ImagePreview)
│   ├── components/views/         # Adaptive Views (MobileView vs DesktopView)
│   └── lib/                      # Client APIs, chatStore, theme tokens
├── tob/                          # Agent Console (Next.js 16 + Ant Design X + antd 6)
│   ├── components/AgentPage.tsx  # Real-time WebSocket Monitoring & Custody Control
│   └── lib/api.ts                # Workbench REST & WebSocket Bindings
├── docs/                         # Architecture, Progress Tracking & Screenshots
├── product.md                    # Product Requirements Document (PRD)
├── technical_implementation.md   # Detailed Technical Specification & Architecture
├── testing.md                    # End-to-End Testing & Verification Strategy
├── render.yaml                   # Cloud-Native Render Web Service Blueprint
└── docker-compose.yml            # Docker Orchestration Configuration
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
