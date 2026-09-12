/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[会话预览改用 previewText()——最近一条是纯图片消息时显示「[图片]」而非空白]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[进入客服列表时主动从后端同步一次会话与历史——保证换设备、换浏览器或清缓存后
 *           依然能看到完整沟通记录，而不是只显示本机 localStorage 里的内容]

 * 移动端「客服」Tab —— 会话列表
 *
 * 列表内容即 ChatProvider 中的会话集合：
 * - 默认一条「AI 客服」店铺会话；
 * - 每从商品详情页点一次「客服」，就会多出一条以商品名命名的会话；
 * - 挂载时会向后端拉取一次，补齐本机没有的历史会话。
 */
"use client";

import { useEffect } from "react";
import { Badge, Empty } from "antd-mobile";
import { RightOutline } from "antd-mobile-icons";
import { useChat } from "@/components/chat/ChatProvider";
import { formatConvTime, previewText } from "@/lib/chatStore";
import { BRAND } from "@/lib/theme";
import { getProduct } from "@/lib/products";

interface Props {
  onOpen: (convId: string) => void;
}

export default function ServiceList({ onOpen }: Props) {
  const { conversations, connectState, loadingConvId, refresh } = useChat();

  // 每次进入客服列表都对齐一次服务端记录（refresh 为稳定引用，仅挂载时触发）
  useEffect(() => {
    refresh();
  }, [refresh]);

  return (
    <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "2px 4px 6px",
        }}
      >
        <span style={{ fontSize: 13, color: BRAND.textSub }}>
          我的客服会话（{conversations.length}）
        </span>
        <span
          style={{
            fontSize: 11,
            color: connectState === "open" ? "#2E9E56" : BRAND.textSub,
          }}
        >
          {connectState === "open" ? "● 实时在线" : connectState === "connecting" ? "○ 连接中" : "○ 未连接"}
        </span>
      </div>

      {conversations.length === 0 && <Empty description="暂无会话" />}

      {conversations.map((conv) => {
        const last = conv.messages[conv.messages.length - 1];
        const product = conv.productId ? getProduct(conv.productId) : undefined;
        const accent = product?.accent ?? ["#FFA24D", "#E8480A"];
        const initial = conv.productId
          ? (product?.name ?? conv.title).replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "").slice(0, 1)
          : "AI";

        return (
          <div
            key={conv.id}
            onClick={() => onOpen(conv.id)}
            style={{
              display: "flex",
              gap: 12,
              alignItems: "center",
              background: "#fff",
              borderRadius: 14,
              padding: "13px 14px",
              border: `1px solid ${conv.unread > 0 ? "#FFD9BC" : BRAND.border}`,
              boxShadow: "0 1px 2px rgba(31,27,24,0.04)",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 12,
                background: `linear-gradient(135deg, ${accent[0]} 0%, ${accent[1]} 100%)`,
                color: "#fff",
                fontWeight: 700,
                fontSize: conv.productId ? 18 : 14,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              {initial}
            </div>

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 600,
                  color: BRAND.text,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {conv.title}
              </div>
              <div
                style={{
                  fontSize: 12,
                  color: BRAND.textSub,
                  marginTop: 3,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {loadingConvId === conv.id ? "AI 正在思考…" : previewText(last) || "开始对话"}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-end",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: 11, color: "#B4AAA2" }}>{formatConvTime(conv.lastActiveAt)}</span>
              {conv.unread > 0 ? (
                <Badge content={conv.unread} color={BRAND.price} />
              ) : (
                <RightOutline style={{ color: "#D8CFC7", fontSize: 12 }} />
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
