/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[输入区支持发图——onSend 透传图片相对路径列表给 ChatProvider；
 *           顺带修复 NavBar 传了不存在的 `backIcon` 属性（antd-mobile 实为 `backArrow`），
 *           使返回箭头按设计正常显示]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[顶部标题栏展示会话接待态——该会话已被人工接手（AI 托管关闭）时提示「人工客服接待中」，
 *           让客户知道当前由真人服务、不必重复追问]

 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[重构为「按会话 ID 渲染」的移动端聊天界面——消息与会话状态统一由 ChatProvider 管理（localStorage 持久化 + 时间戳），WebSocket 连接上收到全局避免重复建连；新增顶部会话标题/副标题与消息时间戳展示]

 * 移动端聊天界面（/chat 页面主体）
 * - 由商品详情页「客服」按钮或「客服」Tab 的会话列表进入
 * - 返回按钮交由上层处理（详情页进入时返回上一页）
 */
"use client";

import { useEffect } from "react";
import { NavBar } from "antd-mobile";
import { LeftOutline } from "antd-mobile-icons";
import { useChat } from "@/components/chat/ChatProvider";
import ChatMessageList from "@/components/chat/ChatMessageList";
import ChatComposer from "@/components/chat/ChatComposer";
import { BRAND } from "@/lib/theme";

interface Props {
  convId: string;
  title?: string;
  subtitle?: string;
  onBack?: () => void;
}

export default function MobileChat({ convId, title, subtitle, onBack }: Props) {
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
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#F7F4F1" }}>
      <NavBar
        back={onBack ? "返回" : null}
        onBack={onBack}
        backArrow={onBack ? <LeftOutline /> : undefined}
        right={
          <span style={{ fontSize: 11, color: connectState === "open" ? "#2E9E56" : BRAND.textSub }}>
            {connectState === "open" ? "● 已连接" : connectState === "connecting" ? "○ 连接中" : "○ 未连接"}
          </span>
        }
        style={{ background: BRAND.gradient, color: "#fff" }}
      >
        <div style={{ color: "#fff", fontSize: 15, fontWeight: 600, lineHeight: 1.25 }}>
          {title || conv?.title || "AI 客服"}
          <div style={{ fontSize: 11, fontWeight: 400, color: "rgba(255,255,255,0.85)" }}>
            {subtitle || conv?.subtitle || "AI 商城 · 官方客服"}
            {aiManaged === false ? "（人工客服接待中）" : ""}
          </div>
        </div>
      </NavBar>

      <ChatMessageList
        messages={conv?.messages ?? []}
        loading={loadingConvId === convId}
        variant="mobile"
      />

      <ChatComposer
        variant="mobile"
        onSend={(text, images) => send(convId, text, images)}
        disabled={loadingConvId === convId}
      />
    </div>
  );
}
