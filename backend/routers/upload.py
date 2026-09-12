"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[修复「B 端坐席台发图恒定失败」——上传鉴权改为**可选**（get_current_user_optional）：
          C 端带 JWT 时照常识别用户；B 端坐席台用口令登录、不持有 JWT，
          原先强制 Bearer 鉴权导致其上传必然 401（实测复现，前端显示「上传失败」）。
          同时把体积上限与格式白名单的校验维持在落盘之前]

[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增文件——聊天图片上传路由 POST /api/upload：
          单次上传一张（前端逐张上传，便于逐张展示上传进度与失败重试）；
          只做格式与体积校验（压缩已在浏览器端完成），落盘后返回相对访问路径。

聊天图片上传路由：/api/upload
- POST /api/upload  上传一张聊天图片（multipart/form-data，字段名 file）
- 返回 { url, size }，其中 url 为相对路径（如 /uploads/chat/2026-09/xxx.jpg），
  前端按各自的 API 域名拼接后即可访问
"""
from typing import Optional

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from auth import get_current_user_optional
from chat_images import ALLOWED_EXT, MAX_IMAGE_BYTES, normalize_ext, save_chat_image
from models import User

router = APIRouter()


@router.post("/upload")
async def upload_chat_image(
    file: UploadFile = File(...),
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """
    上传一张聊天图片

    鉴权说明（可选鉴权）：
    - C 端客户：携带 Bearer Token，能识别上传者；
    - B 端坐席台：用口令登录、不持有 JWT，允许匿名上传（与其它坐席台接口一致）。
      ⚠️ 演示期权宜设计，上线前须为坐席台补登录后收紧。

    参数:
    - file: 图片文件（前端已压缩；支持 jpg / png / webp / gif）
    返回:
    - { url: 相对访问路径, size: 字节数 }
    错误:
    - 400 格式不支持 / 内容为空；413 体积超限；500 落盘失败
    """
    ext = normalize_ext(file.filename or "")
    if not ext:
        raise HTTPException(status_code=400, detail="仅支持 jpg / png / webp / gif 格式的图片")

    data = await file.read()
    if not data:
        raise HTTPException(status_code=400, detail="图片内容为空")
    if len(data) > MAX_IMAGE_BYTES:
        raise HTTPException(status_code=413, detail="图片过大，请压缩后重试")

    try:
        url = save_chat_image(data, ext)
    except Exception as e:
        print(f"[Error] 保存聊天图片失败 {type(e).__name__}: {e}")
        raise HTTPException(status_code=500, detail="图片保存失败，请重试")

    return {"url": url, "size": len(data)}
