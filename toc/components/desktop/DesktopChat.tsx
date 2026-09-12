/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[输入区支持发图——onSend 透传图片相对路径列表给 ChatProvider；
 *           顺带修复 Tag 未从 antd 导入的问题（「人工接待中」标签原先会运行时报错）]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[重构为「按会话 ID 渲染」的 PC 聊天面板——原三栏实现与 PcChatModal 职责重叠，现收敛为「头部 + 消息列表 + 输入区」三个复用件（ChatMessageList / ChatComposer），并由 ChatProvider 统一管理持久化与 WebSocket]

 * PC 端聊天面板（作为 PcChatModal 右栏使用）
 */
"use client";

import { useEffect } from "react";
import { Avatar, Badge, Tag } from "antd";
import { RobotOutlined, CustomerServiceOutlined } from "@ant-design/icons";
import { useChat } from "@/components/chat/ChatProvider";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatComposer from "@/components/chat/ChatComposer";
import { BRAND } from "@/lib/theme";

interface Props {
  convId: string;
  title?: string;
  subtitle?: string;
}

export default function DesktopChat({ convId, title, subtitle }: Props) {
  const { conversations, setActiveConvId, send, loadingConvId, markRead, connectState, aiManagedOf } =
    useChat();
  const conv = conversations.find((c) => c.id === convId);
  /** 该会话是否仍由 AI 托管；false 表示已转人工接待 */
  const aiManaged = aiManagedOf(convId);

  useEffect(() => {
    setActiveConvId(convId);
    markRead(convId);
  }, [convId, setActiveConvId, markRead]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100%" }}>
      {/* 头部：会话身份 + 连接状态 */}
      <div
        style={{
          height: 56,
          flexShrink: 0,
          padding: "0 18px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          borderBottom: `1px solid ${BRAND.border}`,
          background: "#fff",
        }}
      >
        <Avatar
          icon={<CustomerServiceOutlined />}
          style={{ background: BRAND.gradient }}
          size={32}
        />
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
            {title || conv?.title || "AI 客服"}
          </div>
          <div style={{ fontSize: 11, color: BRAND.textSub }}>
            {subtitle || conv?.subtitle || "AI 商城 · 官方客服"}
          </div>
        </div>
        {aiManaged === false && (
          <Tag color="orange" style={{ marginInlineEnd: 0 }}>
            人工接待中
          </Tag>
        )}
        <Badge
          status={connectState === "open" ? "success" : "default"}
          text={<span style={{ fontSize: 11, color: BRAND.textSub }}>在线</span>}
        />
        <Avatar icon={<RobotOutlined />} size={24} style={{ background: "#FFF1E6", color: BRAND.primary }} />
      </div>

      <ChatMessageList messages={conv?.messages ?? []} loading={loadingConvId === convId} variant="desktop" />

      <ChatComposer
        variant="desktop"
        onSend={(text, images) => send(convId, text, images)}
        disabled={loadingConvId === convId}
      />
    </div>
  );
}
