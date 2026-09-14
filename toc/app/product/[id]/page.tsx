/**
 * [变更日志]
 * 修改时间：2026-09-14
 * AI模型：Gemini 系列
 * 修改内容：[增加 generateStaticParams() 预先导出 10 个预设商品详情页，满足 output: 'export' 静态导出规范以完美适配 Cloudflare Pages]
 */
import { PRODUCTS } from "@/lib/products";
import ProductDetailClient from "@/components/product/ProductDetailClient";

export async function generateStaticParams() {
  return PRODUCTS.map((p) => ({
    id: p.id,
  }));
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <ProductDetailClient id={id} />;
}

