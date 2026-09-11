"""
种子数据脚本 - 注入 10 个自带人设的演示账号
用法: python scripts/seed.py
统一密码: 123456
"""
import os
import sys
import bcrypt

# 将 backend 根目录加入 sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, SessionLocal
from models import User

# 根据 AGENTS.md 定义的 10 个种子用户
SEED_USERS = [
    # (phone, name, traits)
    ("13800000001", "张伟", "30岁资深程序员，极简主义，偏好高性价比数码产品，讨厌啰嗦的推销，喜欢直接给结论。"),
    ("13800000002", "李娜", "26岁美妆达人，关注抗老和防晒，喜欢大牌美妆平替，对包装颜值要求高。"),
    ("13800000003", "王强", "32岁健身教练，重度增肌期，常买蛋白粉和低脂零食，注重营养成分配料表。"),
    ("13800000004", "赵敏", "29岁新手宝妈，宝宝6个月大，对母婴产品的安全性极度敏感，容易焦虑，需要安慰。"),
    ("13800000005", "陈杰", "22岁大学生数码发烧友，对电脑外设和游戏显卡了如指掌，预算有限但追求极致性能。"),
    ("13800000006", "杨洋", "24岁职场新人，喜欢购买平价职业装和咖啡豆，工作压力较大，需要解压建议。"),
    ("13800000007", "周游", "28岁户外博主，热爱自驾和露营，经常购买冲锋衣和野外生存装备，对防水性能要求极高。"),
    ("13800000008", "吴婷", "27岁资深铲屎官，家里养了两只布偶猫，每月在宠物罐头和猫砂上开销很大。"),
    ("13800000009", "孙斌", "45岁企业中层，热衷于收集紫砂壶和各类岩茶，追求生活品质，预算充足。"),
    ("13800000010", "林青", "20岁二次元画师，经常熬夜画图，喜欢收集手办和购买保健品（护肝/护眼），二次元浓度高。"),
]

PASSWORD = "123456"


def seed():
    """
    向数据库注入 10 个种子用户，若手机号已存在则跳过。
    """
    import database
    from models import User
    database.Base.metadata.create_all(bind=database.engine)
    db = database.SessionLocal()
    hashed = bcrypt.hashpw(PASSWORD.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")

    print("开始注入种子用户...")
    for phone, name, traits in SEED_USERS:
        existing = db.query(User).filter(User.phone == phone).first()
        if existing:
            print(f"  [跳过] {phone} ({name}) 已存在")
            continue
        user = User(phone=phone, password_hash=hashed, name=name, traits=traits)
        db.add(user)
        print(f"  [新增] {phone} ({name})")

    db.commit()
    total = db.query(User).count()
    print(f"\n完成！数据库当前共 {total} 名用户。")
    db.close()


if __name__ == "__main__":
    seed()
