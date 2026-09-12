/**
 * 商品图组件（含降级兜底）
 *
 * 命名约定：商品图放在 `toc/public/products/`，命名为 `{商品id}`，
 * 后缀交替尝试 `.jpg` → `.png`（AI 生成图为 jpg，你自己补图用 png 也能识别）。
 * 两者都不存在或加载失败时，自动回退为「品牌渐变色块 + 商品名首字 + 品类名」占位图，
 * 因此补图不阻塞开发，也不会出现裂图。
 */
"use client";

import { useEffect, useMemo, useState } from "react";
import type { Product } from "@/lib/products";

interface Props {
  product: Product;
  /** 容器高度，默认铺满父容器 */
  height?: number | string;
  /** 圆角 */
  radius?: number;
  /** 占位图首字字号 */
  initialSize?: number;
}

export default function ProductImage({ product, height = "100%", radius = 0, initialSize = 44 }: Props) {
  // 候选路径：.jpg 优先，其次 .png
  const candidates = useMemo(() => {
    const base = product.image.replace(/\.(png|jpe?g|webp)$/i, "");
    return [`${base}.jpg`, `${base}.png`];
  }, [product.image]);

  const [idx, setIdx] = useState(0);
  useEffect(() => setIdx(0), [product.id]);

  const [from, to] = product.accent;
  const initial = product.name.replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "").slice(0, 1) || "商";
  const src = candidates[idx];
  const failed = !src;

  if (!failed) {
    return (
      // 商品图为运行时静态资源，使用原生 img 以便 onError 逐级降级
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={src}
        alt={product.name}
        onError={() => setIdx((i) => i + 1)}
        style={{
          width: "100%",
          height,
          objectFit: "cover",
          display: "block",
          borderRadius: radius,
        }}
      />
    );
  }

  return (
    <div
      style={{
        width: "100%",
        height,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 6,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* 右上角高光，避免纯色块显得廉价 */}
      <div
        style={{
          position: "absolute",
          top: -40,
          right: -40,
          width: 120,
          height: 120,
          borderRadius: "50%",
          background: "rgba(255,255,255,0.16)",
        }}
      />
      <div
        style={{
          fontSize: initialSize,
          fontWeight: 800,
          color: "rgba(255,255,255,0.94)",
          letterSpacing: 2,
          textShadow: "0 2px 12px rgba(0,0,0,0.18)",
        }}
      >
        {initial}
      </div>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.8)", letterSpacing: 1 }}>
        {product.category}
      </div>
    </div>
  );
}
