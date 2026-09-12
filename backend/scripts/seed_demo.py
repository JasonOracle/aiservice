"""
[变更日志]
修改时间：2026-09-12
AI模型：Deepseek-V4.1-Flash
修改内容：[新增文件——演示会话数据注入脚本。库里原有会话全部集中在同一个测试账号名下，
          无法体现「多客户 × 多店铺 × 多商品」的会话模型，也不利于截图演示。
          本脚本补充 8 位客户的 9 条会话，覆盖三种接待状态：
          ① AI 托管正常应答 ② 待接入（红标）③ 已人工接管（AI 托管自动关闭）。
          幂等：先按 conv_id 删除旧的演示会话与消息，再重新插入，可安全重复执行。]

演示会话数据注入脚本

用途：
- 为演示 / 截图准备一批「像真实运营中」的客服会话；
- 与 scripts/seed_kb.py 并列，同样保证幂等（重复执行不会产生重复数据）。

执行：
    docker compose exec -T backend python scripts/seed_demo.py

依赖素材：
- 演示图片取自 C 端商品图（toc/public/products/*.jpg），需先 docker cp 到容器内
  `/app/_demo_images/`；脚本会按需把它们复制进 uploads 目录。
  素材缺失时脚本仍会插入会话，只是图片字段留空，不会中断。
"""
import json
import os
import shutil
import sys
import time

# scripts/ 目录下执行时，项目根目录（backend）不在 sys.path 中，
# 需手动加入才能 import database / models（与 seed_kb.py 处理方式一致）
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import SessionLocal
from models import Conversation, Message, User

# 演示图片：容器内素材目录 → 上传目录（从toc/public/products 拷入）
DEMO_IMAGE_SRC = "/app/_demo_images"
UPLOAD_DIR = os.path.join("/app", "uploads", "chat", time.strftime("%Y-%m"))
# 图片访问路径（相对路径，前端用 mediaUrl() 拼域名）
IMG_PREFIX = f"/uploads/chat/{time.strftime('%Y-%m')}"

# 要用到的演示图片（文件名 → 上传后的文件名）
DEMO_IMAGES = {
    "skincare-niacin.jpg": "demo-skincare.jpg",
    "catfood-freeze.jpg": "demo-catfood.jpg",
    "diaper-baby.jpg": "demo-diaper.jpg",
    "jacket-goretex.jpg": "demo-jacket.jpg",
    "tea-dahongpao.jpg": "demo-tea.jpg",
    "protein-whey.jpg": "demo-protein.jpg",
}


def prepare_images() -> dict:
    """
    把演示图片复制进 uploads 目录。

    返回: {上传后的文件名: 相对访问路径}
    """
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    result = {}
    for src_name, dst_name in DEMO_IMAGES.items():
        src = os.path.join(DEMO_IMAGE_SRC, src_name)
        dst = os.path.join(UPLOAD_DIR, dst_name)
        try:
            if os.path.exists(src):
                shutil.copyfile(src, dst)
                result[dst_name] = f"{IMG_PREFIX}/{dst_name}"
            elif os.path.exists(dst):
                # 素材目录不在，但 uploads 里已有历史副本
                result[dst_name] = f"{IMG_PREFIX}/{dst_name}"
        except Exception as e:
            print(f"[Warning] 准备演示图片失败 {src_name}: {type(e).__name__}: {e}")
    return result


# fmt: off
DEMO_CONVERSATIONS = [
    {
        # 李娜 · 美妆护肤：纯 AI 托管应答 + 客户发来实物图
        "phone": "13800000002",
        "session_key": "product:skincare-niacin",
        "product_id": "skincare-niacin",
        "product_name": "烟酰胺精华液 30ml",
        "store_name": "雅诗芳研",
        "handoff_reason": None,
        "ai_managed": None,
        "minutes_ago": 8,
        "messages": [
            ("user", "你好，这款精华敏感肌可以用吗？", None),
            ("assistant", "您好，可以的。这款精华采用 5% 烟酰胺浓度为公认有效且温和的区间，"
                          "配方中不含酒精、香精、色素，敏感肌也能日常使用。\n"
                          "建议首次使用时先在耳后或下颌小范围试用 2-3 天，无不适再全脸使用。", None),
            ("user", "收到货了，帮我看看包装上的日期，是不是新的？", "demo-skincare.jpg"),
            ("assistant", "图片已收到。从您拍的照片来看，瓶身批号清晰、塑封完好，"
                          "属于正常出厂状态。\n"
                          "本品未开封保质期为 3 年，开封后建议在 6 个月内用完以保证活性。", None),
            ("user", "那多久能见效？", None),
            ("assistant", "肤色提亮属于渐进改善，一般持续使用 4 周左右能看到肤色均匀度变化，"
                          "8 周效果更明显。期间务必做好日间防晒，否则会影响提亮效果。", None),
        ],
    },
    {
        # 王强 · 运动营养：AI 依据说明书回答成分问题 + 客户发图
        "phone": "13800000003",
        "session_key": "product:protein-whey",
        "product_id": "protein-whey",
        "product_name": "乳清蛋白粉 2kg",
        "store_name": "燃力健身官方店",
        "handoff_reason": None,
        "ai_managed": None,
        "minutes_ago": 42,
        "messages": [
            ("user", "这罐蛋白粉一勺大概多少蛋白？", "demo-protein.jpg"),
            ("assistant", "您好，按标准勺取 30g 粉计算，约含蛋白质 24g、碳水 3g、脂肪 1.5g。\n"
                          "整罐 2kg 约 66 份，按训练日每天 1-2 份计算，可用 1-2 个月。", None),
            ("user", "水温有要求吗？我用开水冲总是结块", None),
            ("assistant", "建议用常温水或 40℃ 以下温水冲泡，开水会使蛋白变性结块。\n"
                          "推荐比例：30g 粉配 200ml 水，摇摇杯摇 10 秒即可完全溶解。", None),
        ],
    },
    {
        # 赵敏 · 母婴：**客户主动要求人工** → 待接入红标 + AI 托管自动关闭
        "phone": "13800000004",
        "session_key": "product:diaper-baby",
        "product_id": "diaper-baby",
        "product_name": "婴儿纸尿裤 L 码 3 包装",
        "store_name": "贝贝安心",
        "handoff_reason": "user",
        "ai_managed": False,
        "minutes_ago": 3,
        "messages": [
            ("user", "宝宝用完有点红，是不是质量问题啊", "demo-diaper.jpg"),
            ("assistant", "图片我看到了，能看出宝宝臀部有局部泛红。\n"
                          "不过是否属于质量问题需要人工核实后才能判定，"
                          "我帮您转接人工客服处理，请您稍等。", None),
            ("user", "好的，麻烦快点，帮我看看还能不能用", None),
        ],
    },
    {
        # 陈杰 · 电脑外设：另一位客户咨询同一商品（体现多客户并行）
        "phone": "13800000005",
        "session_key": "product:keyboard-k8pro",
        "product_id": "keyboard-k8pro",
        "product_name": "机械键盘 K8 Pro 三模",
        "store_name": "极客方舟旗舰店",
        "handoff_reason": None,
        "ai_managed": None,
        "minutes_ago": 26,
        "messages": [
            ("user", "K8 Pro 支持换轴吗？我想自己换成静音轴", None),
            ("assistant", "支持的。K8 Pro 采用全键热插拔轴座，换轴无需焊接，"
                          "拔下旧轴、对准孔位插入新轴即可。\n"
                          "兼容市面上主流的三脚/五脚 MX 结构轴体，静音轴可以直接替换。", None),
        ],
    },
    {
        # 杨洋 · 店铺总客服会话（非商品会话）
        "phone": "13800000006",
        "session_key": "store",
        "product_id": None,
        "product_name": None,
        "store_name": None,
        "handoff_reason": None,
        "ai_managed": None,
        "minutes_ago": 63,
        "messages": [
            ("user", "你好，我想问下退货流程", None),
            ("assistant", "您好，平台支持 7 天无理由退换。流程是：\n"
                          "1) 在「我的订单」提交退货申请；\n"
                          "2) 审核通过后按短信地址寄回；\n"
                          "3) 仓库签收后 1-3 个工作日退款到原支付账户。", None),
        ],
    },
    {
        # 周游 · 户外装备：**已人工接管**（AI 托管关闭、红标已清除）
        "phone": "13800000007",
        "session_key": "product:jacket-goretex",
        "product_id": "jacket-goretex",
        "product_name": "GORE-TEX 三合一冲锋衣",
        "store_name": "山野猎人户外",
        "handoff_reason": None,
        "ai_managed": False,
        "minutes_ago": 15,
        "messages": [
            ("user", "下雨穿这件够不够？", "demo-jacket.jpg"),
            ("assistant", "您好，这款采用 GORE-TEX 三层压胶面料，防水指数 20000mm，"
                          "中到大雨可长时间抵御。\n"
                          "如果是持续暴雨或长时间涉水场景，建议配合雨裤使用。", None),
            ("user", "那给我推荐个尺码，我 178、78kg", None),
            ("agent", "您好，我是人工客服小周。按您 178cm / 78kg 的身材，建议选择 XL 码，"
                      "内部还能套一件抓绒或轻薄羽绒。\n"
                      "已为您备注，下单后可随时联系我们改尺码一次。", None),
            ("user", "好的，谢谢", None),
            ("agent", "不客气～祝您户外活动愉快，有任何问题随时联系我。", None),
        ],
    },
    {
        # 吴婷 · 宠物用品：**AI 兜底转人工** → 待接入（ai_fallback）
        "phone": "13800000008",
        "session_key": "product:catfood-freeze",
        "product_id": "catfood-freeze",
        "product_name": "冻干双拼猫粮 2kg",
        "store_name": "毛球优选",
        "handoff_reason": "ai_fallback",
        "ai_managed": False,
        "minutes_ago": 5,
        "messages": [
            ("user", "猫吃了之后软便，是不是粮有问题？", "demo-catfood.jpg"),
            ("assistant", "图片我看到了，能看出猫粮颗粒完整、无明显异物。\n"
                          "不过软便成因较多（换粮应激、喂食量、肠胃敏感等），"
                          "是否属于粮本身的问题需要人工进一步核实，我帮您转接人工客服。", None),
        ],
    },
    {
        # 孙斌 · 茶叶：AI 识图答复（读礼盒图）
        "phone": "13800000009",
        "session_key": "product:tea-dahongpao",
        "product_id": "tea-dahongpao",
        "product_name": "武夷正岩大红袍礼盒",
        "store_name": "茗山堂",
        "handoff_reason": None,
        "ai_managed": None,
        "minutes_ago": 96,
        "messages": [
            ("user", "我买来送人的，帮我看看这个礼盒", "demo-tea.jpg"),
            ("assistant", "图片已收到。从照片来看是实木礼盒配手提袋的包装形式，"
                          "内含 8g × 20 泡独立小包装，作为商务或长辈馈赠比较体面。\n"
                          "礼盒为三层结构：外箱 + 实木盒 + 内衬，运输中不易磕碰。", None),
            ("user", "能放多久？", None),
            ("assistant", "岩茶在避光、密封、干燥条件下可长期存放，本款未开封建议 3 年内饮用。\n"
                          "中足火工艺退火充分，存放半年后茶汤会更醇厚。", None),
        ],
    },
    {
        # 林青 · 二次元周边：AI 正常应答（预售/发货问题）
        "phone": "13800000010",
        "session_key": "product:figure-limited",
        "product_id": "figure-limited",
        "product_name": "限定款手办 1/8 比例",
        "store_name": "次元工坊",
        "handoff_reason": None,
        "ai_managed": None,
        "minutes_ago": 130,
        "messages": [
            ("user", "手办运输途中摔坏了怎么办？", None),
            ("assistant", "请您放心，我们采用彩盒 + 珍珠棉 + 防撞外箱三层包装，运输破损包赔。\n"
                          "如签收时发现破损，请拍照留存并在 48 小时内联系客服，我们会安排补发或退款。", None),
        ],
    },
]
# fmt: on


def seed() -> None:
    images = prepare_images()
    db = SessionLocal()
    now = int(time.time() * 1000)

    created_convs = 0
    created_msgs = 0
    skipped = 0

    try:
        for item in DEMO_CONVERSATIONS:
            user = db.query(User).filter(User.phone == item["phone"]).first()
            if user is None:
                print(f"[Skip] 用户不存在: {item['phone']}")
                skipped += 1
                continue

            conv_id = f"{user.id}::{item['session_key']}"

            # 幂等：清掉旧演示数据（先消息后会话）
            db.query(Message).filter(Message.conversation_id == conv_id).delete()
            db.query(Conversation).filter(Conversation.id == conv_id).delete()

            start = now - item["minutes_ago"] * 60 * 1000
            last_role, last_content, last_at = None, "", start

            for i, (role, content, img_key) in enumerate(item["messages"]):
                at = start + i * 45 * 1000  # 每条间隔 45 秒，避免时间重叠
                images_field = None
                if img_key and img_key in images:
                    images_field = json.dumps([images[img_key]], ensure_ascii=False)

                db.add(
                    Message(
                        conversation_id=conv_id,
                        role=role,
                        content=content,
                        images=images_field,
                        created_at=at,
                    )
                )
                created_msgs += 1
                last_role, last_content, last_at = role, content, at

            db.add(
                Conversation(
                    id=conv_id,
                    user_id=user.id,
                    session_key=item["session_key"],
                    product_id=item["product_id"],
                    product_name=item["product_name"],
                    store_name=item["store_name"],
                    last_message=last_content,
                    last_role=last_role,
                    last_active_at=last_at,
                    handoff_reason=item["handoff_reason"],
                    handoff_at=(last_at if item["handoff_reason"] else None),
                    ai_managed=item["ai_managed"],
                )
            )
            created_convs += 1

        db.commit()
        print(
            f"演示数据注入完成：会话 {created_convs} 条，消息 {created_msgs} 条"
            + (f"，跳过 {skipped} 条（用户不存在）" if skipped else "")
        )
        print(f"演示图片：{len(images)}/{len(DEMO_IMAGES)} 张可用")
    except Exception as e:
        db.rollback()
        print(f"[Error] 注入失败: {type(e).__name__}: {e}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
