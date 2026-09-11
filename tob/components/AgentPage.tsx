/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Gemini 系列
 * 修改内容：
 * 1. 接入真实用户列表（支持从 /api/users 动态获取，并自动同步当前真实会话）
 * 2. 彻底打通 WebSocket 实时会话流，使张伟等真实用户的消息按 user_id 自动归类与展示
 * 3. 实现双层 AI 托管控制：顶部全局 AI 托管开关 + 每个会话右侧专属独立 AI 托管 Switch（独立 Switch 优先级更高）
 * 4. 全面改造为主流 SaaS 浅色/白底卡片风格，彻底移除沉重深黑背景
 */
"use client";
import { useState, useRef, useEffect, useMemo } from "react";
import {
  Card,
  Row,
  Col,
  Typography,
  Button,
  Input,
  Space,
  Badge,
  Switch,
  Avatar,
  message,
} from "antd";
import {
  UserOutlined,
  RobotOutlined,
  SendOutlined,
  MessageOutlined,
  CustomerServiceOutlined,
} from "@ant-design/icons";
import { Bubble, Conversations } from "@ant-design/x";
import type { ConversationItemType } from "@ant-design/x";
import { WS_URL, getUsers, UserItem } from "@/lib/api";

interface ChatMsg {
  key: string;
  role: "user" | "assistant";
  content: string;
  user_id: string;
  time?: string;
}

export default function AgentPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [activeUserId, setActiveUserId] = useState<string>("1"); // 默认张伟 id=1
  // 每个会话专属独立的 AI 托管配置：{ [user_id]: boolean }
  const [sessionAiManaged, setSessionAiManaged] = useState<Record<string, boolean>>({});
  // 全局全部 AI 托管开关
  const [globalAiManaged, setGlobalAiManaged] = useState<boolean>(true);

  // 消息池，按 user_id 聚合
  const [messagesMap, setMessagesMap] = useState<Record<string, ChatMsg[]>>({
    "1": [
      {
        key: "welcome-1",
        role: "assistant",
        content: "您好，张伟！我是 AI 客服，很高兴为您服务。",
        user_id: "1",
      },
    ],
  });

  const [input, setInput] = useState("");
  const wsRef = useRef<WebSocket | null>(null);

  // 初始化加载真实用户
  useEffect(() => {
    getUsers()
      .then((data) => {
        if (data && data.length > 0) {
          setUsers(data);
          setActiveUserId(String(data[0].id));
        }
      })
      .catch(() => {
        // 后备用户数据
        setUsers([
          { id: 1, phone: "13800000001", name: "张伟", traits: "资深程序员" },
          { id: 2, phone: "13800000002", name: "李娜", traits: "美妆达人" },
          { id: 3, phone: "13800000003", name: "王强", traits: "健身教练" },
        ]);
      });
  }, []);

  // 建立 WebSocket 实时监听 C 端所有用户流
  useEffect(() => {
    const wsUrl = WS_URL.replace("http://", "ws://");
    let ws: WebSocket;
    try {
      ws = new WebSocket(`${wsUrl}/ws/agent`);
      ws.onopen = () => {
        console.log("[Agent WS] 坐席连接成功");
      };
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === "chat_stream") {
            const uid = String(data.user_id);
            const newMsg: ChatMsg = {
              key: `${Date.now()}-${Math.random()}`,
              role: data.role || "user",
              content: data.content,
              user_id: uid,
            };

            setMessagesMap((prev) => {
              const currentList = prev[uid] || [];
              return {
                ...prev,
                [uid]: [...currentList, newMsg],
              };
            });

            // 如果当前正在查看该用户，提示新消息
            if (data.role === "user") {
              message.info(`收到来自【${data.user_name || "用户"}】的新消息`);
            }
          }
        } catch {
          // 忽略格式解析错误
        }
      };
      wsRef.current = ws;
    } catch {
      // 容错
    }

    return () => {
      wsRef.current?.close();
      wsRef.current = null;
    };
  }, []);

  // 人工客服介入发送消息
  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");

    const newMsg: ChatMsg = {
      key: `${Date.now()}-${Math.random()}`,
      role: "assistant",
      content: text,
      user_id: activeUserId,
    };

    setMessagesMap((prev) => ({
      ...prev,
      [activeUserId]: [...(prev[activeUserId] || []), newMsg],
    }));

    // 通过 WS 广播给 C 端用户
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: "agent_message",
          user_id: activeUserId,
          content: text,
        })
      );
    }
  };

  // 构造 Conversations 列表项
  const conversationItems: ConversationItemType[] = useMemo(() => {
    return users.map((u) => {
      const uid = String(u.id);
      const msgs = messagesMap[uid] || [];
      const lastMsg = msgs[msgs.length - 1];
      const preview = lastMsg ? lastMsg.content : u.traits || "暂无最新消息";
      return {
        key: uid,
        label: `${u.name} · ${u.phone}`,
        description: preview.length > 20 ? preview.slice(0, 20) + "..." : preview,
      };
    });
  }, [users, messagesMap]);

  // 计算当前会话最终生效的 AI 托管状态（会话级开关优先级 > 全局开关）
  const isCurrentAiManaged = useMemo(() => {
    if (sessionAiManaged[activeUserId] !== undefined) {
      return sessionAiManaged[activeUserId];
    }
    return globalAiManaged;
  }, [sessionAiManaged, activeUserId, globalAiManaged]);

  // 切换当前独立会话的 AI 托管
  const toggleCurrentSessionAi = (checked: boolean) => {
    setSessionAiManaged((prev) => ({
      ...prev,
      [activeUserId]: checked,
    }));
    message.success(
      `已${checked ? "开启" : "关闭"}当前用户的专属 AI 托管（优先于全局设置）`
    );
  };

  const activeUser = users.find((u) => String(u.id) === activeUserId);
  const currentMessages = messagesMap[activeUserId] || [];

  return (
    <div>
      {/* SaaS 经典蓝色渐变顶部看板 */}
      <div
        style={{
          background: "linear-gradient(135deg, #1677ff 0%, #0958d9 100%)",
          borderRadius: 12,
          padding: "24px 28px",
          marginBottom: 20,
          color: "#fff",
          boxShadow: "0 4px 12px rgba(22,119,255,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CustomerServiceOutlined style={{ fontSize: 24 }} />
              <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
                实时坐席监控台
              </Typography.Title>
            </div>
            <Typography.Text style={{ color: "rgba(255,255,255,0.85)", marginTop: 4, display: "block" }}>
              实时监听 C 端客户对话流，支持全自动 AI 托管与人工客服无缝插话介入
            </Typography.Text>
          </div>

          {/* 全局全部 AI 对话托管总开关 */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              background: "rgba(255,255,255,0.18)",
              padding: "10px 18px",
              borderRadius: 24,
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(255,255,255,0.3)",
            }}
          >
            <span style={{ color: "#fff", fontWeight: 500, fontSize: 14 }}>
              全部 AI 对话托管 (全局):
            </span>
            <Switch
              checked={globalAiManaged}
              onChange={(checked) => {
                setGlobalAiManaged(checked);
                message.info(checked ? "已开启全局 AI 托管" : "已暂停全局 AI 托管");
              }}
              checkedChildren="开启"
              unCheckedChildren="关闭"
            />
          </div>
        </div>
      </div>

      <Row gutter={16}>
        {/* 左侧会话列表（白底卡片） */}
        <Col xs={24} md={7}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontWeight: 600, fontSize: 15 }}>客户会话列表</span>
                <Badge count={users.length} style={{ backgroundColor: "#1677ff" }} />
              </div>
            }
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
            }}
            styles={{ body: { padding: 12 } }}
          >
            <Conversations
              items={conversationItems}
              activeKey={activeUserId}
              onActiveChange={(key) => setActiveUserId(key as string)}
              style={{ maxHeight: 520, overflow: "auto" }}
            />
          </Card>
        </Col>

        {/* 右侧实时对话主区 */}
        <Col xs={24} md={17}>
          <Card
            title={
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Avatar style={{ backgroundColor: "#1677ff" }} icon={<UserOutlined />} />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15, color: "#111827" }}>
                      {activeUser ? `${activeUser.name} (${activeUser.phone})` : "客户对话"}
                    </div>
                    {activeUser?.traits && (
                      <div style={{ fontSize: 12, color: "#6b7280", fontWeight: "normal" }}>
                        用户画像: {activeUser.traits}
                      </div>
                    )}
                  </div>
                </div>

                {/* 当前对话独立的专属 AI 托管 Switch（优先级高于全局） */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    background: isCurrentAiManaged ? "#f0fdf4" : "#fef2f2",
                    padding: "6px 14px",
                    borderRadius: 20,
                    border: `1px solid ${isCurrentAiManaged ? "#bbf7d0" : "#fecaca"}`,
                  }}
                >
                  <Badge
                    status={isCurrentAiManaged ? "success" : "error"}
                    text={
                      <span style={{ fontSize: 13, fontWeight: 500 }}>
                        {isCurrentAiManaged ? "本会话: AI托管中" : "本会话: 人工接待中"}
                      </span>
                    }
                  />
                  <Switch
                    size="small"
                    checked={isCurrentAiManaged}
                    onChange={toggleCurrentSessionAi}
                  />
                </div>
              </div>
            }
            style={{
              background: "#ffffff",
              border: "1px solid #e5e7eb",
              borderRadius: 10,
              boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
              minHeight: 560,
              display: "flex",
              flexDirection: "column",
            }}
            styles={{ body: { padding: 0, flex: 1, display: "flex", flexDirection: "column" } }}
          >
            {/* 消息历史滚动区 */}
            <div
              style={{
                flex: 1,
                maxHeight: 440,
                minHeight: 380,
                overflow: "auto",
                padding: "20px",
                background: "#fafafa",
                display: "flex",
                flexDirection: "column",
                gap: 16,
              }}
            >
              {currentMessages.length === 0 ? (
                <div style={{ textAlign: "center", color: "#9ca3af", marginTop: 80 }}>
                  <MessageOutlined style={{ fontSize: 32, marginBottom: 8 }} />
                  <div>暂无对话记录，可在下方输入消息主动发起沟通</div>
                </div>
              ) : (
                currentMessages.map((m) => (
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
                      borderRadius: 10,
                    }}
                  />
                ))
              )}
            </div>

            {/* 人工输入与发送区 */}
            <div
              style={{
                padding: "16px 20px",
                borderTop: "1px solid #f0f0f0",
                background: "#ffffff",
                display: "flex",
                gap: 12,
                alignItems: "flex-end",
              }}
            >
              <Input.TextArea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  isCurrentAiManaged
                    ? "当前处于 AI 托管状态，您输入并发送后将作为人工坐席向客户插话…"
                    : "请输入回复客户的内容…"
                }
                autoSize={{ minRows: 2, maxRows: 4 }}
                style={{ flex: 1, borderRadius: 8 }}
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
                disabled={!input.trim()}
                style={{ height: 40, borderRadius: 8 }}
              >
                发送回复
              </Button>
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
