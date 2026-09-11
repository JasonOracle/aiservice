/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Gemini 系列
 * 修改内容：
 * 1. 接入 WebSocket /ws/c/{user_id} 实时双向通信，实时接收 B 端人工客服发送的 agent_reply 消息
 * 2. 增加人工客服回复展示（区分 AI 机器人与绿色人工客服头像及标签）
 * 3. 严格遵循副作用清理规范，在组件卸载时显式关闭 WebSocket 避免连接泄露
 */
"use client";
import { useState, useRef, useEffect } from "react";
import { Button, Input, Space, Typography, Avatar, Spin, Tag } from "antd";
import { SendOutlined, RobotOutlined, CustomerServiceOutlined } from "@ant-design/icons";
import { API_URL, WS_URL, getAuthHeaders } from "@/lib/api";

interface ChatMsg {
  role: "user" | "assistant" | "agent";
  content: string;
}

export default function DesktopChat() {
  const [messages, setMessages] = useState<ChatMsg[]>([
    { role: "assistant", content: "你好！我是 AI 客服，很高兴为您服务。请问有什么可以帮您？" },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // 挂载 WebSocket 实时监听人工客服消息下发
  useEffect(() => {
    if (typeof window === "undefined") return;
    const userId = localStorage.getItem("user_id") || "1";
    const wsUrl = WS_URL.replace("http://", "ws://");
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${wsUrl}/ws/c/${userId}`);
      ws.onopen = () => {
        console.log(`[C-WS] WebSocket 连接成功，用户ID: ${userId}`);
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "agent_reply") {
            setMessages((prev) => [
              ...prev,
              { role: "agent", content: data.content },
            ]);
          }
        } catch (e) {
          console.error("[C-WS] 解析消息失败:", e);
        }
      };
      wsRef.current = ws;
    } catch (e) {
      console.error("[C-WS] 连接创建失败:", e);
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
            style={{
              display: "flex",
              gap: 10,
              justifyContent: m.role === "user" ? "flex-end" : "flex-start",
            }}
          >
            {m.role === "assistant" && (
              <Avatar
                icon={<RobotOutlined />}
                style={{ background: "#1677ff", flexShrink: 0 }}
                size={36}
              />
            )}
            {m.role === "agent" && (
              <Avatar
                icon={<CustomerServiceOutlined />}
                style={{ background: "#52c41a", flexShrink: 0 }}
                size={36}
              />
            )}
            <div style={{ maxWidth: "70%" }}>
              {m.role === "agent" && (
                <div style={{ marginBottom: 4 }}>
                  <Tag color="green">人工客服</Tag>
                </div>
              )}
              <div
                style={{
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
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <Avatar
              icon={<RobotOutlined />}
              style={{ background: "#1677ff", flexShrink: 0 }}
              size={36}
            />
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
