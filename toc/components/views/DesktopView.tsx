/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[首页由「左侧 Sider + 空白首页」改为「顶部导航 + 商品网格」；客服入口改为 900×620 大弹窗（左会话列表 + 右聊天）；保留手机扫码与退出登录能力]

 * PC 端视图
 * - 顶部导航：Logo / 客服 / 扫码继续 / 退出登录
 * - 主区：品牌 Hero + 响应式商品网格
 */
"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Typography, Modal, Badge } from "antd";
import {
  CustomerServiceOutlined,
  QrcodeOutlined,
  LogoutOutlined,
  SafetyCertificateOutlined,
  ThunderboltOutlined,
  SwapOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/components/hooks/useAuth";
import { getLocalIP } from "@/lib/api";
import { useChat } from "@/components/chat/ChatProvider";
import { PRODUCTS } from "@/lib/products";
import type { Product } from "@/lib/products";
import ProductGrid from "@/components/shop/ProductGrid";
import PcChatModal from "@/components/shop/PcChatModal";
import { STORE_CONV_ID, createStoreConversation } from "@/lib/chatStore";
import { BRAND } from "@/lib/theme";

export default function DesktopView() {
  const router = useRouter();
  const { logout } = useAuth();
  const { ensureConversation, unreadTotal } = useChat();

  const [chatOpen, setChatOpen] = useState(false);
  const [chatConvId, setChatConvId] = useState<string>(STORE_CONV_ID);
  const [qrOpen, setQrOpen] = useState(false);
  const [localIP, setLocalIP] = useState("localhost");

  useEffect(() => {
    getLocalIP()
      .then(setLocalIP)
      .catch(() => {});
  }, []);

  /** 打开默认 AI 客服会话（顶部「客服」入口） */
  const openStoreChat = useCallback(() => {
    ensureConversation(createStoreConversation());
    setChatConvId(STORE_CONV_ID);
    setChatOpen(true);
  }, [ensureConversation]);

  /** 退出登录：清 token 并回到登录页 */
  const handleLogout = useCallback(() => {
    logout();
    router.replace("/login");
  }, [logout, router]);

  /** 商品卡片点击 → 进详情页（详情页内再唤起客服弹窗） */
  const openProduct = useCallback(
    (p: Product) => {
      router.push(`/product/${p.id}`);
    },
    [router],
  );

  const qrUrl = `http://${localIP}:3000?session_id=abc123`;

  const features = [
    { icon: <SafetyCertificateOutlined />, title: "正品保障", desc: "10 家官方店铺直发" },
    { icon: <ThunderboltOutlined />, title: "48h 发货", desc: "现货极速出库" },
    { icon: <SwapOutlined />, title: "7 天无理由", desc: "不影响二次销售可退" },
  ];

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg }}>
      {/* 顶部导航 */}
      <div
        style={{
          height: 64,
          background: "#fff",
          borderBottom: `1px solid ${BRAND.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 40px",
          gap: 18,
          position: "sticky",
          top: 0,
          zIndex: 100,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: BRAND.gradient,
              color: "#fff",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
              boxShadow: "0 4px 12px rgba(255,106,0,0.3)",
            }}
          >
            AI
          </span>
          <span style={{ fontSize: 18, fontWeight: 800, color: BRAND.text, letterSpacing: 0.5 }}>
            AI 商城
          </span>
        </div>

        <Typography.Text style={{ color: BRAND.textSub, fontSize: 13 }}>
          10 家官方好店 · 正品保障
        </Typography.Text>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Button type="text" icon={<QrcodeOutlined />} onClick={() => setQrOpen(true)}>
            手机端继续
          </Button>
          <Button type="text" icon={<LogoutOutlined />} danger onClick={handleLogout}>
            退出登录
          </Button>
          <Badge count={unreadTotal} size="small" offset={[-4, 4]} color={BRAND.price}>
            <Button
              type="primary"
              icon={<CustomerServiceOutlined />}
              onClick={openStoreChat}
              style={{
                background: BRAND.gradient,
                border: "none",
                borderRadius: 9,
                fontWeight: 600,
                boxShadow: "0 4px 12px rgba(255,106,0,0.24)",
              }}
            >
              客服
            </Button>
          </Badge>
        </div>
      </div>

      {/* Hero */}
      <div
        style={{
          background: BRAND.gradient,
          color: "#fff",
          padding: "46px 40px 52px",
        }}
      >
        <div style={{ maxWidth: 1180, margin: "0 auto" }}>
          <div style={{ fontSize: 34, fontWeight: 800, letterSpacing: 1, lineHeight: 1.25 }}>
            AI 智能客服商城
          </div>
          <div style={{ fontSize: 15, opacity: 0.92, marginTop: 10, maxWidth: 620, lineHeight: 1.7 }}>
            基于 RAG 知识库检索与 Mem0 长期记忆，每位顾客都能得到「千人千面」的专属导购与售后解答。
          </div>

          <div style={{ display: "flex", gap: 14, marginTop: 26, flexWrap: "wrap" }}>
            {features.map((f) => (
              <div
                key={f.title}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  background: "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.3)",
                  borderRadius: 12,
                  padding: "10px 16px",
                  backdropFilter: "blur(6px)",
                }}
              >
                <span style={{ fontSize: 18 }}>{f.icon}</span>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700 }}>{f.title}</div>
                  <div style={{ fontSize: 11, opacity: 0.85 }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 商品网格 */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "32px 40px 60px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <span style={{ width: 3, height: 18, background: BRAND.gradient, borderRadius: 2 }} />
          <span style={{ fontSize: 20, fontWeight: 700, color: BRAND.text }}>全部商品</span>
          <span style={{ fontSize: 13, color: BRAND.textSub }}>共 {PRODUCTS.length} 款好物</span>
        </div>

        <ProductGrid products={PRODUCTS} onSelect={openProduct} gap={18} />
      </div>

      {/* 客服大弹窗 */}
      <PcChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        activeConvId={chatConvId}
        onActiveChange={setChatConvId}
      />

      {/* 手机扫码继续 */}
      <Modal
        open={qrOpen}
        onCancel={() => setQrOpen(false)}
        footer={null}
        width={330}
        centered
        title="手机扫码继续"
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 12,
            padding: "8px 0 4px",
          }}
        >
          <QRCodeSVG value={qrUrl} size={190} style={{ border: `1px solid ${BRAND.border}`, borderRadius: 10 }} />
          <Typography.Text type="secondary" style={{ fontSize: 12, textAlign: "center" }}>
            {qrUrl}
          </Typography.Text>
        </div>
      </Modal>
    </div>
  );
}
