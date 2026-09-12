"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增文件——聊天图片的「存储 / 地址转换」工具层：
          1) save_chat_image() 把前端压缩后的图片字节落盘到 UPLOAD_DIR/chat/YYYY-MM/，
             返回**相对访问路径**（如 /uploads/chat/2026-09/xxx.jpg），
             不存绝对 URL，避免换域名/端口后历史图片全部失效；
          2) to_data_url() 把相对路径读盘转成 base64 data URL —— 这是 AI 识图的**必要**一步：
             模型网关在公网，无法回连 http://localhost:8080/uploads/...，
             直接把本机地址当 image_url 传过去模型是取不到图的（实测 data URL 可用）；
          3) parse_images() / serialize_images() 供接口层与 DB 层共用，
             统一「JSON 字符串 ↔ 地址列表」的转换并容错脏数据]

聊天图片工具层（不依赖 FastAPI，便于 ai_engine 等模块直接复用）
- 存储：UPLOAD_DIR 环境变量（容器内 /app/uploads），本地裸跑默认 backend/uploads
- 静态访问：main.py 将 UPLOAD_DIR 挂载到 URL_PREFIX（/uploads）
"""
import base64
import json
import mimetypes
import os
import uuid
from datetime import datetime
from typing import Optional

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
DEFAULT_UPLOAD_DIR = os.path.join(BACKEND_DIR, "uploads")

# 静态访问前缀，必须与 main.py 中 app.mount("/uploads", ...) 保持一致
URL_PREFIX = "/uploads"

# 允许的图片扩展名 → MIME 类型
ALLOWED_EXT = {
    "jpg": "image/jpeg",
    "jpeg": "image/jpeg",
    "png": "image/png",
    "webp": "image/webp",
    "gif": "image/gif",
}

# 单张图片体积上限（前端已压缩，正常远小于此值；此处仅防滥用）
MAX_IMAGE_BYTES = 5 * 1024 * 1024

# 前端单条消息最多可带图片数（与前端交互保持一致）
MAX_IMAGES_PER_MESSAGE = 3


def upload_root() -> str:
    """
    上传根目录

    注意在**函数内**读取环境变量（而非模块级常量）：
    保证 load_dotenv 已由 database / ai_engine 先行执行，避免读不到容器注入的 UPLOAD_DIR。
    """
    return os.getenv("UPLOAD_DIR") or DEFAULT_UPLOAD_DIR


def ensure_upload_root() -> str:
    """确保上传根目录存在并返回之（首次启动时自动创建）"""
    root = upload_root()
    os.makedirs(root, exist_ok=True)
    return root


def normalize_ext(raw: str) -> str:
    """把扩展名/文件名统一规整成受支持的形式（jpeg → jpg；无法识别时返回空串）"""
    ext = (raw or "").lower().strip()
    if "." in ext:
        ext = ext.rsplit(".", 1)[-1]
    ext = ext.lstrip(".")
    if ext == "jpeg":
        ext = "jpg"
    return ext if ext in ALLOWED_EXT else ""


def save_chat_image(data: bytes, ext: str) -> str:
    """
    保存一张聊天图片，返回相对访问路径（如 `/uploads/chat/2026-09/ab12cd.jpg`）

    参数:
    - data: 图片字节（前端已压缩）
    - ext:  扩展名（jpg / png / webp / gif，jpeg 会规整为 jpg）
    异常:
    - 扩展名不受支持 / 落盘失败时抛出，由调用方（上传接口）转成 HTTP 错误
    """
    safe_ext = normalize_ext(ext)
    if not safe_ext:
        raise ValueError(f"不支持的图片格式: {ext}")

    root = ensure_upload_root()
    folder = datetime.now().strftime("%Y-%m")
    dir_path = os.path.join(root, "chat", folder)
    os.makedirs(dir_path, exist_ok=True)

    filename = f"{uuid.uuid4().hex}.{safe_ext}"
    with open(os.path.join(dir_path, filename), "wb") as f:
        f.write(data)

    # 统一用正斜杠拼接 URL（Windows 下 os.path.join 会产生反斜杠，不能直接进 URL）
    return f"{URL_PREFIX}/chat/{folder}/{filename}"


def to_data_url(rel_url: str) -> Optional[str]:
    """
    图片路径 → base64 data URL，供 AI 识图使用

    ★ 为什么必须转 base64：
      模型网关（Dots）位于公网，**无法回连 http://localhost:8080/uploads/...**，
      因此不能把本机相对地址直接作为 image_url 传给模型。
      实测该网关支持 `data:image/jpeg;base64,...` 形式（见工作日志的探针结论）。

    返回:
    - 成功: `data:{mime};base64,{...}`
    - 已是 http(s)/data URL: 原样返回
    - 文件缺失或读取失败: None（调用方应跳过该图，不影响其余图片与文字）
    """
    if not rel_url:
        return None
    if rel_url.startswith(("http://", "https://", "data:")):
        return rel_url

    rel = rel_url
    if rel.startswith(URL_PREFIX + "/"):
        rel = rel[len(URL_PREFIX) + 1 :]
    path = os.path.join(upload_root(), rel.replace("/", os.sep))

    if not os.path.isfile(path):
        print(f"[Warning] 图片文件不存在，已跳过识图: {path}")
        return None

    ext = normalize_ext(os.path.splitext(path)[1])
    mime = ALLOWED_EXT.get(ext) or mimetypes.guess_type(path)[0] or "image/jpeg"
    try:
        with open(path, "rb") as f:
            b64 = base64.b64encode(f.read()).decode()
        return f"data:{mime};base64,{b64}"
    except Exception as e:
        print(f"[Warning] 图片转 base64 失败: {type(e).__name__}: {e}")
        return None


def parse_images(raw) -> list:
    """
    DB 中的 JSON 字符串 → 图片地址列表

    容错设计：空值、非法 JSON、非数组一律返回空列表，绝不抛异常
    （图片属于附加信息，解析失败不应影响消息正文的展示）。
    """
    if not raw:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw if x]
    try:
        val = json.loads(raw)
        if isinstance(val, list):
            return [str(x) for x in val if x]
    except Exception:
        pass
    return []


def serialize_images(images) -> Optional[str]:
    """图片地址列表 → DB 存储用的 JSON 字符串（无图片时返回 None）"""
    lst = [str(u) for u in (images or []) if u]
    return json.dumps(lst, ensure_ascii=False) if lst else None
