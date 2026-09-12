/**
 * 聊天消息列表（PC / 移动端共用）
 *
 * 特性：
 * - 每条消息带时间戳，但相邻 5 分钟内不重复显示，避免每行都挂时间很吵；
 *   （完整时间是「记录在数据里」的，只是展示上做了收敛）
 * - 三种角色视觉区分：用户（橙色气泡，右）/ AI（白底气泡，左）/ 人工客服（绿标）
 * - system 角色渲染为居中的系统提示条（如「已为您转接人工客服」）
 * - 消息可携带图片：单图按比例展示、多图网格排布，点击弹出全屏大图预览；
 *   纯图片消息不再套气泡底色，图片直接贴边展示更干净
 */
"use client";

import { useEffect, useRef, useState } from "react";
import { type ChatMsg, formatMsgTime, shouldShowTime } from "@/lib/chatStore";
import { BRAND } from "@/lib/theme";
import ChatImageGrid from "@/components/chat/ChatImageGrid";
import ImagePreview from "@/components/chat/ImagePreview";

interface Props {
  messages: ChatMsg[];
  loading?: boolean;
  variant?: "mobile" | "desktop";
  /** 空态文案 */
  emptyText?: string;
}

const AVATAR: Record<string, { text: string; bg: string }> = {
  assistant: { text: "AI", bg: BRAND.gradient },
  agent: { text: "人", bg: "linear-gradient(135deg,#6BD08A,#2E9E56)" },
};

export default function ChatMessageList({
  messages,
  loading = false,
  variant = "desktop",
  emptyText = "还没有消息，说点什么吧",
}: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);
  const isMobile = variant === "mobile";
  /** 大图预览状态：index 为 -1 表示关闭 */
  const [preview, setPreview] = useState<{ images: string[]; index: number }>({
    images: [],
    index: -1,
  });

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, loading]);

  return (
    <div
      style={{
        flex: 1,
        overflowY: "auto",
        padding: isMobile ? "12px 12px 16px" : "20px 24px",
        background: isMobile ? "#F7F4F1" : "#FAF8F6",
        display: "flex",
        flexDirection: "column",
        gap: isMobile ? 10 : 14,
      }}
    >
      {messages.length === 0 && !loading && (
        <div style={{ margin: "auto", color: BRAND.textSub, fontSize: 13 }}>{emptyText}</div>
      )}

      {messages.map((m, i) => {
        const prev = messages[i - 1];
        const showTime = shouldShowTime(m.createdAt, prev?.createdAt);
        const avatar = AVATAR[m.role];
        const hasImages = !!m.images && m.images.length > 0;
        const hasText = !!m.content && m.content.trim().length > 0;
        // 纯图片消息：不套气泡底色，图片直接贴着放，视觉更干净
        const bubbleless = hasImages && !hasText;

        return (
          <div key={m.id}>
            {showTime && (
              <div
                style={{
                  textAlign: "center",
                  fontSize: 11,
                  color: "#B4AAA2",
                  margin: "2px 0 6px",
                }}
              >
                {formatMsgTime(m.createdAt)}
              </div>
            )}

            {m.role === "system" ? (
              <div style={{ display: "flex", justifyContent: "center", padding: "2px 0" }}>
                <span
                  style={{
                    fontSize: 12,
                    color: "#8A6A3A",
                    background: "#FFF6E8",
                    border: "1px solid #FFE2B8",
                    borderRadius: 999,
                    padding: "3px 12px",
                  }}
                >
                  {m.content}
                </span>
              </div>
            ) : (
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: m.role === "user" ? "flex-end" : "flex-start",
                  alignItems: "flex-start",
                }}
              >
                {avatar && (
                  <div
                    style={{
                      width: isMobile ? 28 : 34,
                      height: isMobile ? 28 : 34,
                      borderRadius: 10,
                      background: avatar.bg,
                      color: "#fff",
                      fontSize: isMobile ? 11 : 12,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginTop: 2,
                    }}
                  >
                    {avatar.text}
                  </div>
                )}

                <div style={{ maxWidth: isMobile ? "76%" : "70%", minWidth: 0 }}>
                  {m.role === "agent" && (
                    <div style={{ fontSize: 11, color: "#2E9E56", fontWeight: 600, marginBottom: 3 }}>
                      人工客服
                    </div>
                  )}
                  <div
                    style={{
                      padding: bubbleless ? 0 : isMobile ? "9px 12px" : "10px 14px",
                      borderRadius: m.role === "user" ? "14px 14px 4px 14px" : "14px 14px 14px 4px",
                      background: bubbleless
                        ? "transparent"
                        : m.role === "user"
                          ? BRAND.gradient
                          : "#FFFFFF",
                      color: m.role === "user" ? "#fff" : BRAND.text,
                      fontSize: isMobile ? 14 : 14,
                      lineHeight: 1.62,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      // 纯图片消息去掉气泡底色/阴影/描边，避免橙底包着照片显得脏
                      boxShadow: bubbleless
                        ? "none"
                        : m.role === "user"
                          ? "0 4px 12px rgba(255,106,0,0.22)"
                          : "0 1px 2px rgba(31,27,24,0.05), 0 4px 12px rgba(31,27,24,0.05)",
                      border: bubbleless
                        ? "none"
                        : m.role === "agent"
                          ? "1px solid #D6F0DE"
                          : "none",
                    }}
                  >
                    {hasImages && (
                      <ChatImageGrid
                        images={m.images!}
                        mine={m.role === "user"}
                        size={isMobile ? 100 : 112}
                        onPreview={(idx) => setPreview({ images: m.images!, index: idx })}
                      />
                    )}
                    {/* 文字与图片共存时，文字排在图片下方并留出间距 */}
                    {hasText && (
                      <div style={{ marginTop: hasImages ? 8 : 0 }}>{m.content}</div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {loading && (
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <div
            style={{
              width: isMobile ? 28 : 34,
              height: isMobile ? 28 : 34,
              borderRadius: 10,
              background: BRAND.gradient,
              color: "#fff",
              fontSize: isMobile ? 11 : 12,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            AI
          </div>
          <div
            style={{
              padding: "10px 14px",
              borderRadius: "14px 14px 14px 4px",
              background: "#fff",
              color: BRAND.textSub,
              fontSize: 13,
              boxShadow: "0 1px 2px rgba(31,27,24,0.05)",
            }}
          >
            AI 正在思考…
          </div>
        </div>
      )}

      <div ref={bottomRef} />

      {/* 全屏大图预览（点击消息里的缩略图触发） */}
      <ImagePreview
        images={preview.images}
        index={preview.index}
        onClose={() => setPreview({ images: [], index: -1 })}
      />
    </div>
  );
}
