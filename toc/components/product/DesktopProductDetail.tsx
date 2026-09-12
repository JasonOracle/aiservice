/**
 * 商品详情页 · PC 端版式
 *
 * 交互（淘宝网页版逻辑）：
 * 右侧信息区的「联系客服」不跳页，而是打开 900×620 的大弹窗（含左会话列表 + 右聊天）。
 */
"use client";

import { useRouter } from "next/navigation";
import { Button, Tag, Divider, Rate } from "antd";
import {
  CustomerServiceOutlined,
  LeftOutlined,
  HomeOutlined,
  ShoppingCartOutlined,
  SafetyCertificateOutlined,
} from "@ant-design/icons";
import type { Product } from "@/lib/products";
import { formatSales } from "@/lib/products";
import { BRAND } from "@/lib/theme";
import ProductImage from "@/components/shop/ProductImage";

interface Props {
  product: Product;
  onOpenChat: (product: Product) => void;
}

export default function DesktopProductDetail({ product, onOpenChat }: Props) {
  const router = useRouter();

  return (
    <div style={{ minHeight: "100vh", background: BRAND.bg }}>
      {/* 顶部导航 */}
      <div
        style={{
          height: 60,
          background: "#fff",
          borderBottom: `1px solid ${BRAND.border}`,
          display: "flex",
          alignItems: "center",
          padding: "0 32px",
          gap: 16,
          position: "sticky",
          top: 0,
          zIndex: 20,
        }}
      >
        <div
          onClick={() => router.push("/")}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
          }}
        >
          <span
            style={{
              width: 30,
              height: 30,
              borderRadius: 9,
              background: BRAND.gradient,
              color: "#fff",
              fontWeight: 800,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 15,
            }}
          >
            AI
          </span>
          <span style={{ fontSize: 17, fontWeight: 700, color: BRAND.text }}>AI 商城</span>
        </div>

        <Divider type="vertical" style={{ height: 22 }} />
        <Button type="text" icon={<LeftOutlined />} onClick={() => router.back()}>
          返回
        </Button>

        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 10 }}>
          <Button
            type="text"
            icon={<HomeOutlined />}
            onClick={() => router.push("/")}
          >
            首页
          </Button>
          <Button
            type="primary"
            icon={<CustomerServiceOutlined />}
            onClick={() => onOpenChat(product)}
            style={{
              background: BRAND.gradient,
              border: "none",
              borderRadius: 9,
              fontWeight: 600,
            }}
          >
            客服
          </Button>
        </div>
      </div>

      <div
        style={{
          maxWidth: 1180,
          margin: "0 auto",
          padding: "24px 32px 48px",
          display: "flex",
          gap: 32,
          alignItems: "flex-start",
        }}
      >
        {/* 左：商品图 */}
        <div
          style={{
            width: 460,
            flexShrink: 0,
            background: "#fff",
            borderRadius: 16,
            overflow: "hidden",
            boxShadow: BRAND.shadow,
            position: "sticky",
            top: 84,
          }}
        >
          <ProductImage product={product} height={460} initialSize={92} />
        </div>

        {/* 右：信息区 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
            {product.tags.map((t) => (
              <Tag
                key={t}
                style={{
                  background: BRAND.primarySoft,
                  color: BRAND.primary,
                  border: "1px solid #FFE0C4",
                  borderRadius: 6,
                  fontWeight: 500,
                }}
              >
                {t}
              </Tag>
            ))}
          </div>

          <h1 style={{ fontSize: 24, fontWeight: 700, color: BRAND.text, margin: "0 0 8px", lineHeight: 1.4 }}>
            {product.name}
          </h1>
          <div style={{ fontSize: 14, color: BRAND.textSub, marginBottom: 12 }}>{product.subtitle}</div>

          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
            <Rate disabled allowHalf defaultValue={product.rating} style={{ fontSize: 14 }} />
            <span style={{ fontSize: 13, color: BRAND.textSub }}>
              {product.rating.toFixed(1)} 分 · {formatSales(product.sales)}人已购
            </span>
          </div>

          {/* 价格卡 */}
          <div
            style={{
              background: "linear-gradient(135deg, #FFF3E8 0%, #FFE9D6 100%)",
              border: "1px solid #FFDCC0",
              borderRadius: 14,
              padding: "18px 22px",
              display: "flex",
              alignItems: "baseline",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 14, color: BRAND.price, fontWeight: 700 }}>¥</span>
            <span style={{ fontSize: 40, fontWeight: 800, color: BRAND.price, lineHeight: 1 }}>
              {product.price}
            </span>
            <span style={{ fontSize: 13, color: "#B9A99C", textDecoration: "line-through" }}>
              划线价 ¥{product.originalPrice}
            </span>
            <span
              style={{
                marginLeft: "auto",
                fontSize: 12,
                color: BRAND.primary,
                background: "#fff",
                border: "1px solid #FFD9BC",
                borderRadius: 999,
                padding: "3px 10px",
                fontWeight: 600,
              }}
            >
              到手价
            </span>
          </div>

          {/* 店铺 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 18,
              fontSize: 14,
              color: BRAND.text,
            }}
          >
            <SafetyCertificateOutlined style={{ color: BRAND.primary }} />
            <span style={{ fontWeight: 600 }}>{product.store}</span>
            <span style={{ fontSize: 12, color: BRAND.textSub }}>官方店铺 · 正品保障</span>
          </div>

          {/* 卖点 */}
          <div style={{ marginTop: 20 }}>
            {product.highlights.map((h) => (
              <div
                key={h}
                style={{
                  display: "flex",
                  gap: 8,
                  fontSize: 14,
                  color: "#4A423D",
                  lineHeight: 1.7,
                  marginBottom: 6,
                }}
              >
                <span style={{ color: BRAND.primary, flexShrink: 0 }}>·</span>
                <span>{h}</span>
              </div>
            ))}
          </div>

          {/* 操作按钮 */}
          <div style={{ display: "flex", gap: 12, marginTop: 26 }}>
            <Button
              size="large"
              icon={<CustomerServiceOutlined />}
              onClick={() => onOpenChat(product)}
              style={{
                height: 48,
                padding: "0 26px",
                borderRadius: 12,
                border: `1px solid ${BRAND.primary}`,
                color: BRAND.primary,
                background: "#fff",
                fontWeight: 600,
                fontSize: 15,
              }}
            >
              联系客服
            </Button>
            <Button
              type="primary"
              size="large"
              icon={<ShoppingCartOutlined />}
              style={{
                height: 48,
                padding: "0 34px",
                borderRadius: 12,
                background: BRAND.gradient,
                border: "none",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: "0 6px 18px rgba(255,106,0,0.28)",
              }}
            >
              立即购买
            </Button>
          </div>
        </div>
      </div>

      {/* 规格参数 */}
      <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 32px 60px" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            padding: "22px 26px",
            boxShadow: BRAND.shadow,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
            <span style={{ width: 3, height: 16, background: BRAND.gradient, borderRadius: 2 }} />
            <span style={{ fontSize: 17, fontWeight: 700, color: BRAND.text }}>规格参数</span>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
              gap: "0 24px",
            }}
          >
            {product.specs.map((s) => (
              <div
                key={s.label}
                style={{
                  display: "flex",
                  fontSize: 14,
                  padding: "11px 0",
                  borderBottom: `1px dashed ${BRAND.border}`,
                }}
              >
                <span style={{ width: 96, color: BRAND.textSub, flexShrink: 0 }}>{s.label}</span>
                <span style={{ color: BRAND.text }}>{s.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
