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
