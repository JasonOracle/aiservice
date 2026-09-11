/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Gemini 系列
 * 修改内容：
 * 1. 移动端同步接入 WebSocket /ws/c/{user_id} 实时双向通信，实时接收人工客服消息
 * 2. 增加 agent 角色展示，与 AI 回复进行明确的视觉区分（增加人工客服绿标）
 * 3. 严格遵循副作用清理规范，在组件卸载时显式关闭 WebSocket
 */
"use client";
import { useState, useRef, useEffect } from "react";
import { NavBar, TextArea, Button, Tag } from "antd-mobile";
import { SendOutline, LeftOutline } from "antd-mobile-icons";
import { getAuthHeaders, API_URL, WS_URL } from "@/lib/api";

interface ChatMsg {
  role: "user" | "assistant" | "agent";
  content: string;
}

export default function MobileChat({ onBack }: { onBack: () => void }) {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "你好！我是 AI 客服，很高兴为您服务。请问有什么可以帮您？" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 挂载 WebSocket 实时监听人工客服消息下发
  useEffect(() => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("user_id") || "1";
    const wsUrl = WS_URL.replace("http://", "ws://");
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${wsUrl}/ws/c/${userId}`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "agent_reply") {
            setMessages((prev) => [
              ...prev,
              { role: "agent", content: data.content },
            ]);
          }
        } catch {
          // 容错
        }
      };
      wsRef.current = ws;
    } catch {
      // 容错
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, []);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...getAuthHeaders() },
        body: JSON.stringify({ message: text }),
      });
      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      } else {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: "抱歉，服务暂时不可用，请稍后再试或转接人工客服。" },
        ]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "网络错误，请检查连接后重试。" },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "#f5f5f9",
      }}
    >
      <NavBar
        left={<Button onClick={onBack} style={{ border: "none", background: "none" }}>
          <LeftOutline />
          返回
        </Button>}
        right={<span style={{ fontSize: 13, color: "#999" }}>AI 客服</span>}
        style={{ background: "#fff", borderBottom: "1px solid #f0f0f0" }}
      >
        AI 智能助手
      </NavBar>

      <div style={{ flex: 1, overflow: "auto", padding: 12, paddingBottom: 80 }}>
        {messages.map((m, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: m.role === "user" ? "flex-end" : "flex-start",
              marginBottom: 12,
            }}
          >
            {m.role === "agent" && (
              <div style={{ marginBottom: 4 }}>
                <Tag color="success">人工客服</Tag>
              </div>
            )}
            <div
              style={{
                maxWidth: "78%",
                padding: "10px 14px",
                borderRadius: 12,
                background: m.role === "user" ? "#1677ff" : "#fff",
                color: m.role === "user" ? "#fff" : "#333",
                fontSize: 14,
                lineHeight: 1.5,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ color: "#999", fontSize: 13, padding: "4px 0" }}>AI 正在思考…</div>
        )}
        <div ref={bottomRef} />
      </div>

      <div
        style={{
          position: "fixed",
          bottom: 0,
          left: 0,
          right: 0,
          background: "#fff",
          borderTop: "1px solid #f0f0f0",
          padding: "10px 12px",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
          display: "flex",
          gap: 8,
          alignItems: "flex-end",
        }}
      >
        <TextArea
          value={input}
          onChange={setInput}
          placeholder="输入您的问题…"
          rows={2}
          style={{ flex: 1, fontSize: 14, resize: "none", border: "none", outline: "none" }}
        />
        <Button
          color="primary"
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{ borderRadius: 8, height: 44, minWidth: 60 }}
        >
          <SendOutline />
        </Button>
      </div>
    </div>
  );
}
