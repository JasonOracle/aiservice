/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[修复 NavBar 传了不存在的 `backIcon` 属性（antd-mobile 的返回箭头实为 `backArrow`），
 *           原先该属性会被静默忽略、返回箭头按默认样式渲染]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[修复致命 Bug：底部「客服」按钮仍在渲染未导入的 CustomerServiceOutline（undefined 标识符），导致移动端商品详情页整页白屏崩溃；改用已导入的 MessageOutline]

 * 商品详情页 · 移动端版式
 *
 * 交互（拼多多逻辑）：
 * 底部固定操作栏放「客服」→ push 到 /chat?productId=xxx，
 * 聊天页的返回正好回到本详情页。
 */
"use client";

import { useRouter } from "next/navigation";
import { NavBar, Button } from "antd-mobile";
import { LeftOutline, StarFill, MessageOutline } from "antd-mobile-icons";
import type { Product } from "@/lib/products";
import { formatSales } from "@/lib/products";
import { BRAND } from "@/lib/theme";
import ProductImage from "@/components/shop/ProductImage";

interface Props {
  product: Product;
}

export default function MobileProductDetail({ product }: Props) {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100dvh", background: BRAND.bg, paddingBottom: 72 }}>
      <NavBar
        back="返回"
        backArrow={<LeftOutline />}
        onBack={() => router.back()}
        style={{ background: BRAND.gradient, color: "#fff", position: "sticky", top: 0, zIndex: 10 }}
      >
        <span style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>商品详情</span>
      </NavBar>

      <ProductImage product={product} height={340} initialSize={80} />

      {/* 价格区 */}
      <div
        style={{
          padding: "14px 14px 16px",
          background: BRAND.gradient,
          color: "#fff",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontSize: 14, fontWeight: 700 }}>¥</span>
          <span style={{ fontSize: 32, fontWeight: 800, lineHeight: 1, letterSpacing: -1 }}>
            {product.price}
          </span>
          <span style={{ fontSize: 12, opacity: 0.75, textDecoration: "line-through" }}>
            ¥{product.originalPrice}
          </span>
        </div>
        <div style={{ fontSize: 12, opacity: 0.92, marginTop: 6 }}>
          已售 {formatSales(product.sales)} · 评分 {product.rating.toFixed(1)}
        </div>
      </div>

      {/* 标题 / 店铺 */}
      <div style={{ background: "#fff", padding: "14px", marginTop: 8 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: BRAND.text, lineHeight: 1.45 }}>
          {product.name}
        </div>
        <div style={{ fontSize: 13, color: BRAND.textSub, marginTop: 6 }}>{product.subtitle}</div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
          {product.tags.map((t) => (
            <span
              key={t}
              style={{
                fontSize: 11,
                color: BRAND.primary,
                background: BRAND.primarySoft,
                border: "1px solid #FFE0C4",
                borderRadius: 6,
                padding: "2px 8px",
              }}
            >
              {t}
            </span>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            marginTop: 12,
            paddingTop: 12,
            borderTop: `1px solid ${BRAND.border}`,
            fontSize: 13,
            color: BRAND.text,
          }}
        >
          <StarFill style={{ color: BRAND.primary }} />
          <span style={{ fontWeight: 600 }}>{product.store}</span>
          <span style={{ color: BRAND.textSub, fontSize: 12 }}>· 官方店铺</span>
        </div>
      </div>

      {/* 卖点 */}
      <div style={{ background: "#fff", padding: "14px", marginTop: 8 }}>
        <SectionTitle>推荐理由</SectionTitle>
        {product.highlights.map((h) => (
          <div
            key={h}
            style={{
              display: "flex",
              gap: 8,
              fontSize: 13,
              color: "#4A423D",
              lineHeight: 1.65,
              marginTop: 8,
            }}
          >
            <span style={{ color: BRAND.primary, flexShrink: 0 }}>·</span>
            <span>{h}</span>
          </div>
        ))}
      </div>

      {/* 参数表 */}
      <div style={{ background: "#fff", padding: "14px", marginTop: 8 }}>
        <SectionTitle>规格参数</SectionTitle>
        <div style={{ marginTop: 10, borderRadius: 10, overflow: "hidden" }}>
          {product.specs.map((s, i) => (
            <div
              key={s.label}
              style={{
                display: "flex",
                fontSize: 13,
                background: i % 2 === 0 ? "#FBF7F3" : "#fff",
              }}
            >
              <div style={{ width: 92, padding: "9px 12px", color: BRAND.textSub, flexShrink: 0 }}>
                {s.label}
              </div>
              <div style={{ padding: "9px 12px", color: BRAND.text, flex: 1 }}>{s.value}</div>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "16px 14px 8px",
          fontSize: 12,
          color: BRAND.textSub,
          textAlign: "center",
        }}
      >
        商品参数、优惠与售后问题，可直接点下方「客服」咨询
      </div>

      {/* 底部固定操作栏 */}
      <div
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          background: "#fff",
          borderTop: `1px solid ${BRAND.border}`,
          padding: "8px 12px",
          paddingBottom: "calc(8px + env(safe-area-inset-bottom))",
          display: "flex",
          gap: 10,
          alignItems: "center",
          zIndex: 20,
        }}
      >
        <Button
          onClick={() => router.push(`/chat?productId=${product.id}`)}
          style={{
            flexShrink: 0,
            height: 44,
            padding: "0 16px",
            borderRadius: 10,
            border: `1px solid ${BRAND.primary}`,
            color: BRAND.primary,
            background: "#fff",
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          <MessageOutline />
          客服
        </Button>
        <Button
          block
          style={{
            height: 44,
            borderRadius: 10,
            background: BRAND.gradient,
            border: "none",
            color: "#fff",
            fontWeight: 700,
            fontSize: 15,
            boxShadow: "0 4px 14px rgba(255,106,0,0.28)",
          }}
        >
          立即购买
        </Button>
      </div>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <span style={{ width: 3, height: 14, background: BRAND.gradient, borderRadius: 2 }} />
      <span style={{ fontSize: 15, fontWeight: 700, color: BRAND.text }}>{children}</span>
    </div>
  );
}
