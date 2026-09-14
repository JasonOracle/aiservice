/**
 * [变更日志]
 * 修改时间：2026-09-14
 * AI模型：Gemini 系列
 * 修改内容：[将原客户端组件抽离为 ProductDetailClient，供 page.tsx 配合 generateStaticParams 静态导出]
 */
"use client";

import { useEffect, useState } from "react";
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

export default function ProductDetailClient({ id }: { id: string }) {
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
