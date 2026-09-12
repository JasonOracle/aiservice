/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[会话列表预览改用 previewText()——纯图片消息显示「[图片]」而不是空白，
 *           使最近一条是图片时用户也能一眼看出有新消息]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[弹窗打开时主动从后端同步一次会话与历史，保证 PC 端换浏览器、清缓存后
 *           也能看到完整沟通记录]

 * PC 端客服大弹窗
 *
 * 布局：900×620 的 antd Modal —— 左栏 280px 会话列表，右栏聊天界面。
 * 由商品详情页「联系客服」按钮、首页顶部「客服」入口共同调用。
 */
"use client";

import { useEffect } from "react";
import { Modal, Badge, Empty } from "antd";
import { RobotOutlined } from "@ant-design/icons";
import { useChat } from "@/components/chat/ChatProvider";
import { formatConvTime, previewText } from "@/lib/chatStore";
import { BRAND } from "@/lib/theme";
import { getProduct } from "@/lib/products";
import DesktopChat from "@/components/desktop/DesktopChat";

interface Props {
  open: boolean;
  onClose: () => void;
  /** 当前展示的会话 */
  activeConvId: string;
  onActiveChange: (convId: string) => void;
}

export default function PcChatModal({ open, onClose, activeConvId, onActiveChange }: Props) {
  const { conversations, connectState, refresh } = useChat();
  const active = conversations.find((c) => c.id === activeConvId);

  // 打开弹窗时对齐服务端记录（refresh 为稳定引用）
  useEffect(() => {
    if (open) refresh();
  }, [open, refresh]);

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      centered
      destroyOnHidden
      title={
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 26,
              height: 26,
              borderRadius: 8,
              background: BRAND.gradient,
              color: "#fff",
              fontWeight: 800,
              fontSize: 13,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            AI
          </span>
          <span style={{ fontWeight: 700, color: BRAND.text }}>AI 客服</span>
          <span style={{ fontSize: 12, color: BRAND.textSub, fontWeight: 400 }}>
            {connectState === "open" ? "· 实时在线" : "· 连接中"}
          </span>
        </div>
      }
      styles={{
        body: { padding: 0, height: 580, display: "flex", overflow: "hidden" },
      }}
    >
      {/* 左栏：会话列表 */}
      <div
        style={{
          width: 280,
          flexShrink: 0,
          borderRight: `1px solid ${BRAND.border}`,
          background: "#FBF8F5",
          display: "flex",
          flexDirection: "column",
          height: "100%",
        }}
      >
        <div
          style={{
            padding: "12px 16px",
            fontSize: 12,
            color: BRAND.textSub,
            borderBottom: `1px solid ${BRAND.border}`,
            flexShrink: 0,
          }}
        >
          已沟通过的客服（{conversations.length}）
        </div>

        <div style={{ flex: 1, overflowY: "auto", padding: 8 }}>
          {conversations.length === 0 && (
            <div style={{ paddingTop: 60 }}>
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="暂无会话" />
            </div>
          )}

          {conversations.map((conv) => {
            const selected = conv.id === activeConvId;
            const last = conv.messages[conv.messages.length - 1];
            const product = conv.productId ? getProduct(conv.productId) : undefined;
            const accent = product?.accent ?? ["#FFA24D", "#E8480A"];
            const initialLabel = conv.productId
              ? (product?.name ?? conv.title).replace(/[^\u4e00-\u9fffA-Za-z0-9]/g, "").slice(0, 1)
              : "AI";

            return (
              <div
                key={conv.id}
                onClick={() => onActiveChange(conv.id)}
                style={{
                  display: "flex",
                  gap: 10,
                  alignItems: "center",
                  padding: "10px 10px",
                  borderRadius: 10,
                  marginBottom: 4,
                  cursor: "pointer",
                  background: selected ? "#fff" : "transparent",
                  border: `1px solid ${selected ? "#FFD9BC" : "transparent"}`,
                  boxShadow: selected ? "0 2px 8px rgba(255,106,0,0.1)" : "none",
                  transition: "all .16s",
                }}
              >
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: `linear-gradient(135deg, ${accent[0]} 0%, ${accent[1]} 100%)`,
                    color: "#fff",
                    fontSize: conv.productId ? 16 : 12,
                    fontWeight: 700,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {initialLabel}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
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
                      fontSize: 11,
                      color: BRAND.textSub,
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {previewText(last) || "开始对话"}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "flex-end",
                    gap: 4,
                    flexShrink: 0,
                  }}
                >
                  <span style={{ fontSize: 10, color: "#B4AAA2" }}>
                    {formatConvTime(conv.lastActiveAt)}
                  </span>
                  {conv.unread > 0 && <Badge count={conv.unread} size="small" color={BRAND.price} />}
                </div>
              </div>
            );
          })}
        </div>

        <div
          style={{
            padding: "10px 16px",
            borderTop: `1px solid ${BRAND.border}`,
            fontSize: 11,
            color: BRAND.textSub,
            display: "flex",
            alignItems: "center",
            gap: 6,
            flexShrink: 0,
          }}
        >
          <RobotOutlined />
          输入「转人工客服」可请求人工接入
        </div>
      </div>

      {/* 右栏：聊天 */}
      <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex" }}>
        {active ? (
          <DesktopChat convId={active.id} title={active.title} subtitle={active.subtitle} />
        ) : (
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: BRAND.textSub,
              fontSize: 13,
            }}
          >
            请选择左侧会话
          </div>
        )}
      </div>
    </Modal>
  );
}
