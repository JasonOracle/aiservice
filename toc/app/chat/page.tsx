/**
 * 移动端客服聊天页 /chat
 *
 * 入口与参数：
 * - 商品详情页「客服」→ /chat?productId=xxx
 *   会自动创建（或复用）该商品的会话，并按商品名设置标题；
 * - 「客服」Tab 的会话列表 → /chat?conv=xxx
 * - 直接访问 /chat → 默认 AI 客服会话
 *
 * 「返回」使用 router.back()，因此从商品详情页进来时正好回到该详情页。
 */
"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Spin } from "antd";
import MobileChat from "@/components/mobile/MobileChat";
import { useChat } from "@/components/chat/ChatProvider";
import {
  STORE_CONV_ID,
  createProductConversation,
  createStoreConversation,
  productConvId,
} from "@/lib/chatStore";
import { getProduct } from "@/lib/products";
import { BRAND } from "@/lib/theme";

function ChatPageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { ready, ensureConversation } = useChat();

  const [authorized, setAuthorized] = useState<boolean | null>(null);
  const [convId, setConvId] = useState<string | null>(null);

  const convParam = searchParams.get("conv");
  const productIdParam = searchParams.get("productId");

  // 登录守卫
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.localStorage.getItem("token")) {
      router.replace("/login");
      setAuthorized(false);
      return;
    }
    setAuthorized(true);
  }, [router]);

  // 解析目标会话
  useEffect(() => {
    if (!ready || !authorized) return;

    if (convParam) {
      setConvId(convParam);
      return;
    }

    if (productIdParam) {
      const product = getProduct(productIdParam);
      if (product) {
        ensureConversation(createProductConversation(product.id, product.name, product.store));
        setConvId(productConvId(product.id));
        return;
      }
    }

    ensureConversation(createStoreConversation());
    setConvId(STORE_CONV_ID);
  }, [ready, authorized, convParam, productIdParam, ensureConversation]);

  if (!ready || !convId) {
    return (
      <div
        style={{
          height: "100dvh",
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

  return <MobileChat convId={convId} onBack={() => router.back()} />;
}

export default function ChatPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            height: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: BRAND.bg,
          }}
        >
          <Spin size="large" />
        </div>
      }
    >
      <ChatPageInner />
    </Suspense>
  );
}
