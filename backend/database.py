"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增 ensure_schema() 轻量结构升级——SQLite 没有迁移工具，
          Base.metadata.create_all 只会建新表、不会给已有表补列，
          因此「conversations.ai_managed」这类后加的列需在启动时幂等补齐]

数据库连接与会话
- 默认使用本地 SQLite（backend/data/app.db）；若配置 TIDB_URL 则切换 TiDB
- ensure_schema(): 启动时补齐后加字段，保证老库无需手工改表
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv
import os

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BACKEND_DIR, ".env"), override=True)

# 始终使用本地 SQLite（MVP 模式）；若设置 TIDB_URL 则切换到 TiDB
TIDB_URL = os.getenv("TIDB_URL")

if TIDB_URL:
    engine = create_engine(TIDB_URL)
else:
    db_path = os.path.join(BACKEND_DIR, "data", "app.db")
    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    engine = create_engine(f"sqlite:///{db_path}", connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def ensure_schema():
    """
    轻量级结构升级（幂等）

    SQLite 无迁移框架，`create_all` 仅建新表、不会为已存在的表补列。
    这里显式检查并补齐后加的列，使老数据库无需手工改表即可平滑升级。

    现有补列项：
    - `conversations.ai_managed`：会话级 AI 托管覆盖（见 models.Conversation）
    - `messages.images`：消息附带的图片地址列表（JSON 数组字符串，见 models.Message）
    """
    from sqlalchemy import inspect, text

    # 需要补齐的列：{表名: {列名: 列定义}}
    pending_columns = {
        "conversations": {"ai_managed": "BOOLEAN"},
        # 消息附带的图片地址列表（JSON 数组字符串），支持「文字+图片」「纯图片」消息
        "messages": {"images": "TEXT"},
    }

    try:
        inspector = inspect(engine)
        table_names = set(inspector.get_table_names())
        for table, columns in pending_columns.items():
            if table not in table_names:
                continue
            existing = {c["name"] for c in inspector.get_columns(table)}
            for column, ddl in columns.items():
                if column in existing:
                    continue
                with engine.begin() as conn:
                    conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {column} {ddl}"))
                print(f"[Schema] 已补充列 {table}.{column}")
    except Exception as e:
        # 结构升级失败不阻断启动：业务侧对缺失字段已做容错
        print(f"[Warning] 结构升级失败: {type(e).__name__}: {e}")
