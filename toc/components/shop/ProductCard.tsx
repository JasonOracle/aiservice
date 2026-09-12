/**
 * 商品卡片
 *
 * 视觉要点（对齐主流电商）：
 * - 1:1 商品图，卡片 hover 上浮 + 橙色光晕
 * - 标题两行截断，价格用橙红加粗、划线价灰色删除线
 * - 店铺名与销量置于底部，信息密度贴近真实电商列表
 */
"use client";

import { useState } from "react";
import type { Product } from "@/lib/products";
import { formatSales } from "@/lib/products";
import { BRAND } from "@/lib/theme";
import ProductImage from "./ProductImage";

interface Props {
  product: Product;
  onClick?: (product: Product) => void;
  /** 移动端两列布局下缩小内边距 */
  compact?: boolean;
}

export default function ProductCard({ product, onClick, compact = false }: Props) {
  const [hover, setHover] = useState(false);

  return (
    <div
      onClick={() => onClick?.(product)}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: BRAND.surface,
        borderRadius: 14,
        overflow: "hidden",
        cursor: "pointer",
        border: `1px solid ${hover ? "#FFD9BC" : BRAND.border}`,
        boxShadow: hover ? BRAND.shadowHover : BRAND.shadow,
        transform: hover ? "translateY(-4px)" : "translateY(0)",
        transition: "all .22s cubic-bezier(.2,.8,.2,1)",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
    >
      <div style={{ position: "relative", paddingTop: "100%" }}>
        <div style={{ position: "absolute", inset: 0 }}>
          <ProductImage product={product} initialSize={compact ? 34 : 44} />
        </div>
        {product.tags[0] && (
          <span
            style={{
              position: "absolute",
              left: 8,
              top: 8,
              background: BRAND.gradient,
              color: "#fff",
              fontSize: 11,
              fontWeight: 600,
              padding: "2px 8px",
              borderRadius: 999,
              boxShadow: "0 2px 8px rgba(255,106,0,0.32)",
            }}
          >
            {product.tags[0]}
          </span>
        )}
      </div>

      <div
        style={{
          padding: compact ? "8px 10px 10px" : "12px 14px 14px",
          display: "flex",
          flexDirection: "column",
          gap: 6,
          flex: 1,
        }}
      >
        <div
          style={{
            fontSize: compact ? 13 : 14,
            fontWeight: 600,
            color: BRAND.text,
            lineHeight: 1.4,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
            minHeight: compact ? 36 : 39,
          }}
        >
          {product.name}
        </div>

        {!compact && (
          <div
            style={{
              fontSize: 12,
              color: BRAND.textSub,
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {product.subtitle}
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: "auto" }}>
          <span style={{ color: BRAND.price, fontSize: compact ? 11 : 12, fontWeight: 700 }}>¥</span>
          <span
            style={{
              color: BRAND.price,
              fontSize: compact ? 17 : 20,
              fontWeight: 800,
              lineHeight: 1,
              letterSpacing: -0.5,
            }}
          >
            {product.price}
          </span>
          <span
            style={{
              color: "#C4BAB2",
              fontSize: 11,
              textDecoration: "line-through",
            }}
          >
            ¥{product.originalPrice}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: 11,
            color: BRAND.textSub,
            gap: 6,
          }}
        >
          <span
            style={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: "62%",
            }}
          >
            {product.store}
          </span>
          <span style={{ flexShrink: 0 }}>{formatSales(product.sales)}人已购</span>
        </div>
      </div>
    </div>
  );
}
