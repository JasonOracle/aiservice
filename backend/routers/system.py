"""
系统信息路由：/api/machine-ip
- 返回本机局域网 IP，供 C 端生成跨端接力二维码
"""
import socket
from fastapi import APIRouter
from pydantic import BaseModel

router = APIRouter()


class MachineIP(BaseModel):
    ip: str


def get_lan_ip() -> str:
    """
    获取本机局域网 IP 地址
    通过 UDP socket 连接到 8.8.8.8（不实际发包）获取本机 IP
    """
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.settimeout(1)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "localhost"


@router.get("/machine-ip", response_model=MachineIP)
def machine_ip():
    """
    返回本机局域网 IP
    - 用于 PC 端生成手机扫码接力二维码
    - 返回: { ip: "192.168.x.x" }
    """
    return MachineIP(ip=get_lan_ip())


@router.get("/users")
def get_users():
    """返回全部种子用户列表供 B 端坐席显示"""
    from database import SessionLocal
    from models import User
    db = SessionLocal()
    try:
        users = db.query(User).all()
        return [
            {
                "id": u.id,
                "phone": u.phone,
                "name": u.name or f"用户{u.phone[-4:]}",
                "traits": u.traits or "",
            }
            for u in users
        ]
    finally:
        db.close()
