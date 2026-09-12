/**
 * 商品详情页路由 /product/[id]
 *
 * 双端异构渲染：
 * - 移动端 → MobileProductDetail（底部固定「客服」按钮，push 到 /chat）
 * - PC 端  → DesktopProductDetail（「联系客服」打开大弹窗 PcChatModal）
 */
"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button, Spin } from "antd";
import { getProduct } from "@/lib/products";
import { useDevice } from "@/lib/useDevice";
import { useChat } from "@/components/chat/ChatProvider";
import { STORE_CONV_ID, createProductConversation, productConvId } from "@/lib/chatStore";
import MobileProductDetail from "@/components/product/MobileProductDetail";
import DesktopProductDetail from "@/components/product/DesktopProductDetail";
import PcChatModal from "@/components/shop/PcChatModal";
import { BRAND } from "@/lib/theme";
import type { Product } from "@/lib/products";

export default function ProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const device = useDevice();
  const { ready, ensureConversation } = useChat();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConvId, setChatConvId] = useState<string>(STORE_CONV_ID);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem("token")) {
      router.replace("/login");
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [router]);

  const product = getProduct(id);

  /** PC 端：为该商品打开客服大弹窗 */
  const openProductChat = (p: Product) => {
    ensureConversation(createProductConversation(p.id, p.name, p.store));
    setChatConvId(productConvId(p.id));
    setChatOpen(true);
  };

  if (!ready || !authorized) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: BRAND.bg,
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (!product) {
    return (
      <div
        style={{
          height: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 16,
          background: BRAND.bg,
        }}
      >
        <div style={{ fontSize: 16, color: BRAND.text }}>商品不存在或已下架</div>
        <Button type="primary" onClick={() => router.push("/")} style={{ background: BRAND.gradient, border: "none" }}>
          返回首页
        </Button>
      </div>
    );
  }

  if (device === "mobile") {
    return <MobileProductDetail product={product} />;
  }

  return (
    <>
      <DesktopProductDetail product={product} onOpenChat={openProductChat} />
      <PcChatModal
        open={chatOpen}
        onClose={() => setChatOpen(false)}
        activeConvId={chatConvId}
        onActiveChange={setChatConvId}
      />
    </>
  );
}
