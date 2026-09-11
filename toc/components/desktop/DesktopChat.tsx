// PC 端 AI 聊天区：类 ChatGPT 的居中对话流
"use client";
import { useState, useRef, useEffect } from "react";
import { Button, Input, Space, Typography, Avatar, Spin } from "antd";
import { SendOutlined, RobotOutlined } from "@ant-design/icons";
import { API_URL, getAuthHeaders } from "@/lib/api";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

export default function DesktopChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "你好！我是 AI 客服，很高兴为您服务。请问有什么可以帮您？" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

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
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data.reply },
        ]);
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
    <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
      {/* 聊天消息区 */}
      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "24px 32px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {messages.map((m, i) => (
          <div
            key={i}
            style={{ display: "flex", gap: 10, justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}
          >
            {m.role === "assistant" && (
              <Avatar
                icon={<RobotOutlined />}
                style={{ background: "#1677ff", flexShrink: 0 }}
                size={36}
              />
            )}
            <div
              style={{
                maxWidth: "70%",
                padding: "10px 14px",
                borderRadius: 12,
                background: m.role === "user" ? "#1677ff" : "#fff",
                color: m.role === "user" ? "#fff" : "#333",
                fontSize: 14,
                lineHeight: 1.6,
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
              }}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Avatar icon={<RobotOutlined />} style={{ background: "#1677ff", flexShrink: 0 }} size={36} />
            <div
              style={{
                padding: "10px 14px",
                borderRadius: 12,
                background: "#fff",
                boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
                display: "flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <Spin size="small" />
              <Typography.Text type="secondary">AI 正在思考…</Typography.Text>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* 输入框 */}
      <div
        style={{
          padding: "16px 32px",
          background: "#fff",
          borderTop: "1px solid #f0f0f0",
        }}
      >
        <Space.Compact style={{ width: "100%" }}>
          <Input.TextArea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="输入您的问题，Enter 发送"
            autoSize={{ minRows: 1, maxRows: 4 }}
            style={{ flex: 1, fontSize: 14 }}
            onPressEnter={(e) => {
              if (!e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            disabled={!input.trim() || loading}
            style={{ height: "auto" }}
          />
        </Space.Compact>
      </div>
    </div>
  );
}
