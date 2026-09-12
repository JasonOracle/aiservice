/**
 * 商品网格（PC / 移动端共用）
 *
 * 列数策略：
 * - 移动端固定 2 列（与主流电商 App 一致）
 * - PC 端用 auto-fill 自适应，宽屏约 4-5 列
 */
"use client";

import type { Product } from "@/lib/products";
import ProductCard from "./ProductCard";

interface Props {
  products: Product[];
  onSelect?: (product: Product) => void;
  /** 两列模式（移动端） */
  twoColumn?: boolean;
  gap?: number;
}

export default function ProductGrid({ products, onSelect, twoColumn = false, gap = 14 }: Props) {
  return (
    <div
      style={
        twoColumn
          ? {
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: 10,
            }
          : {
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(216px, 1fr))",
              gap,
            }
      }
    >
      {products.map((p) => (
        <ProductCard key={p.id} product={p} onClick={onSelect} compact={twoColumn} />
      ))}
    </div>
  );
}
