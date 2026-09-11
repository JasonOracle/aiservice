// 实时坐席监控 - 接收 C 端对话流，支持人工介入
"use client";
import { useState, useRef, useEffect } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Input,
  Space,
  Badge,
  Tag,
  Switch,
  List,
  Avatar,
} from "antd";
import {
  UserOutlined,
  RobotOutlined,
  SendOutlined,
  MessageOutlined,
} from "@ant-design/icons";
import { Bubble, Conversations } from "@ant-design/x";
import type { ConversationItemType } from "@ant-design/x";
import { WS_URL } from "@/lib/api";

interface ChatMsg {
  key: string;
  role: "user" | "assistant";
  content: string;
  user_id?: string;
}

const CONVERSATIONS: ConversationItemType[] = [
  { key: "conv-1", label: "张伟 · 13800000001" },
  { key: "conv-2", label: "李娜 · 13800000002" },
  { key: "conv-3", label: "陈杰 · 13800000005" },
];

export default function AgentPage() {
  const [activeConv, setActiveConv] = useState<string>("conv-1");
  const [messages, setMessages] = useState<ChatMsg[]>([
    { key: "1", role: "user", content: "你好，我想问一下机械键盘 K8 Pro 的轴体是什么？", user_id: "13800000001" },
    { key: "2", role: "assistant", content: "K8 Pro 搭载 Gasket 结构，热插拔轴，支持 51 键无冲突。", user_id: "13800000001" },
    { key: "3", role: "user", content: "有什么性价比高的降噪耳机推荐吗？", user_id: "13800000002" },
  ]);
  const [input, setInput] = useState("");
  const [aiManaged, setAiManaged] = useState(true);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket 连接（Phase 4 后端实现）
  useEffect(() => {
    const wsUrl = WS_URL.replace("ws://", "ws://").replace("http://", "ws://");
    try {
      const ws = new WebSocket(`${wsUrl}/ws/agent`);
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat_stream") {
            setMessages((prev) => [
              ...prev,
              { key: Date.now().toString(), role: "user", content: data.content, user_id: data.user_id },
            ]);
          }
        } catch {
          // 忽略非 JSON 消息
        }
      };
      ws.onclose = () => {
        // 可重连逻辑
      };
      wsRef.current = ws;
    } catch {
      // WebSocket 不可用时静默处理
    }

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    setMessages((prev) => [
      ...prev,
      { key: Date.now().toString(), role: "assistant", content: text },
    ]);
    // 广播到 C 端（Phase 4 实现）
    wsRef.current?.send(
      JSON.stringify({ type: "agent_message", content: text, conv_id: activeConv })
    );
  };

  const activeConvLabel = CONVERSATIONS.find((c) => c.key === activeConv)?.label ?? "";

  return (
    <div>
      {/* Hero 区域 */}
      <div
        style={{
          background: "linear-gradient(135deg, #2e1a1a 0%, #1f0f2e 100%)",
          borderRadius: 12,
          padding: "32px 24px",
          marginBottom: 20,
          border: "1px solid #4e2a2a",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
              实时坐席监控
            </Typography.Title>
            <Typography.Text style={{ color: "rgba(255,255,255,0.5)" }}>
              监听 C 端对话流，随时人工介入回复
            </Typography.Text>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <Badge status={aiManaged ? "success" : "warning"} text="AI 托管" />
            <Switch
              checked={aiManaged}
              onChange={setAiManaged}
              checkedChildren="AI"
              unCheckedChildren="人工"
              style={{ background: aiManaged ? "#1677ff" : undefined }}
            />
          </div>
        </div>
      </div>

      <Row gutter={16}>
        {/* 左侧会话列表 */}
        <Col xs={24} md={6}>
          <Card
            style={{ background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 12 }}
            bodyStyle={{ padding: 12 }}
          >
            <Conversations
              items={CONVERSATIONS}
              activeKey={activeConv}
              onActiveChange={(key) => setActiveConv(key as string)}
              style={{ maxHeight: 400, overflow: "auto" }}
            />
          </Card>
        </Col>

        {/* 右侧聊天流 */}
        <Col xs={24} md={18}>
          <Card
            title={
              <span style={{ color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
                <MessageOutlined />
                {activeConvLabel}
              </span>
            }
            style={{ background: "#1f1f1f", border: "1px solid #2a2a2a", borderRadius: 12, minHeight: 480 }}
            bodyStyle={{ padding: 0 }}
          >
            <div
              style={{
                maxHeight: 420,
                overflow: "auto",
                padding: "16px",
                display: "flex",
                flexDirection: "column",
                gap: 12,
              }}
            >
              {messages.map((m) => (
                <Bubble
                  key={m.key}
                  content={m.content}
                  placement={m.role === "user" ? "start" : "end"}
                  avatar={
                    m.role === "user" ? (
                      <Avatar icon={<UserOutlined />} style={{ background: "#52c41a" }} />
                    ) : (
                      <Avatar icon={<RobotOutlined />} style={{ background: "#1677ff" }} />
                    )
                  }
                  variant={m.role === "user" ? "filled" : "outlined"}
                  style={{
                    background: m.role === "user" ? "#2a3a2a" : "#1a2a3e",
                    color: "#fff",
                    borderRadius: 12,
                   }}
                />
              ))}
            </div>

            {!aiManaged && (
              <div
                style={{
                  padding: "12px 16px",
                  borderTop: "1px solid #2a2a2a",
                  display: "flex",
                  gap: 8,
                }}
              >
                <Input.TextArea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="人工介入回复…"
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  style={{
                    flex: 1,
                    background: "#141414",
                    border: "1px solid #2a2a2a",
                    color: "#fff",
                  }}
                  onPressEnter={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                />
                <Button
                  type="primary"
                  icon={<SendOutlined />}
                  onClick={handleSend}
                  disabled={!input.trim()}
                >
                  发送
                </Button>
              </div>
            )}
          </Card>
        </Col>
      </Row>
    </div>
  );
}
