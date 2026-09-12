/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[顶部导航栏精简——去掉右上角「客服」按钮与左侧返回箭头：
 *           「客服」入口已由底部 TabBar 承担，顶部重复冗余；返回箭头属于组件默认行为残留
 *           （antd-mobile 的 NavBar 判据是 `back !== null`，不传 `back` 时值仍为
 *           undefined，故会渲染出箭头，必须显式 back={null}）。首页与「客服」Tab 共用同一 NavBar，一处生效两页。]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[1. 修复致命 Bug：antd-mobile-icons 并不导出 CustomerServiceOutline，该导入导致模块解析失败、首页整页空白，改用已确认存在的 MessageOutline；2. 补齐 MessageOutline 的导入（此前仅在底部 TabBar 中使用，却漏了导入）]
 *
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[首页改为商品网格（原为 6 条极简列表）；底部 TabBar 由「首页/消息/我的」改为「首页/客服」；「客服」Tab 换为会话列表，点击进入 /chat 聊天页并支持未读红点]

 * 移动端视图（antd-mobile）
 * - 首页：品牌 Hero + 2 列商品网格，点商品进详情页
 * - 客服：会话列表，点会话进聊天页
 */
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { TabBar, NavBar, Badge } from "antd-mobile";
import { AppOutline, MessageOutline } from "antd-mobile-icons";
import { useChat } from "@/components/chat/ChatProvider";
import { PRODUCTS } from "@/lib/products";
import ProductGrid from "@/components/shop/ProductGrid";
import ServiceList from "@/components/shop/ServiceList";
import { BRAND } from "@/lib/theme";

export default function MobileView() {
  const router = useRouter();
  const [tab, setTab] = useState<string>("home");
  const { unreadTotal } = useChat();

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: BRAND.bg,
      }}
    >
      {/*
        顶部仅保留品牌标题，不再放「客服」按钮、也不显示返回箭头：
        - 「客服」入口已由底部 TabBar 承担（带未读红点），顶部重复放按钮属于冗余；
        - ⚠️ 必须显式写 back={null}：antd-mobile 的 NavBar 中 `back` 无默认值，
          其判断条件是 `back !== null`，因此不传时反而是 undefined，会渲染出一个返回箭头。
      */}
      <NavBar back={null} style={{ background: BRAND.gradient, color: "#fff" }}>
        <span style={{ color: "#fff", fontSize: 16, fontWeight: 700, letterSpacing: 0.5 }}>
          AI 商城
        </span>
      </NavBar>

      <div style={{ flex: 1, overflowY: "auto" }}>
        {tab === "home" ? (
          <>
            {/* 品牌 Hero */}
            <div
              style={{
                background: BRAND.gradient,
                padding: "4px 16px 22px",
                color: "#fff",
                borderBottomLeftRadius: 20,
                borderBottomRightRadius: 20,
              }}
            >
              <div style={{ fontSize: 19, fontWeight: 800, letterSpacing: 0.5 }}>
                AI 智能客服 · 10 家官方好店
              </div>
              <div style={{ fontSize: 12, opacity: 0.9, marginTop: 6, lineHeight: 1.6 }}>
                正品保障 · 48 小时发货 · 支持 7 天无理由退货
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                {["千人千面推荐", "知识库溯源", "一键转人工"].map((t) => (
                  <span
                    key={t}
                    style={{
                      fontSize: 11,
                      background: "rgba(255,255,255,0.22)",
                      border: "1px solid rgba(255,255,255,0.35)",
                      borderRadius: 999,
                      padding: "3px 10px",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div style={{ padding: "14px 12px 20px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 12,
                  paddingLeft: 2,
                }}
              >
                <span style={{ width: 3, height: 15, background: BRAND.gradient, borderRadius: 2 }} />
                <span style={{ fontSize: 16, fontWeight: 700, color: BRAND.text }}>
                  为你精选
                </span>
                <span style={{ fontSize: 12, color: BRAND.textSub }}>共 {PRODUCTS.length} 款</span>
              </div>
              <ProductGrid
                products={PRODUCTS}
                twoColumn
                onSelect={(p) => router.push(`/product/${p.id}`)}
              />
            </div>
          </>
        ) : (
          <ServiceList onOpen={(id) => router.push(`/chat?conv=${encodeURIComponent(id)}`)} />
        )}
      </div>

      <TabBar
        activeKey={tab}
        onChange={(k) => setTab(String(k))}
        style={{
          background: "#fff",
          borderTop: `1px solid ${BRAND.border}`,
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
      >
        <TabBar.Item key="home" icon={<AppOutline />} title="首页" />
        <TabBar.Item
          key="service"
          icon={<MessageOutline />}
          title="客服"
          badge={unreadTotal > 0 ? Badge.dot : null}
        />
      </TabBar>
    </div>
  );
}
