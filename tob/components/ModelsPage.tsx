// 模型中心 - 多通道 AI 模型网关管理
"use client";
import { Card, Row, Col, Tag, Typography, Button } from "antd";
import { RobotOutlined, CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";

interface ModelCard {
  id: string;
  name: string;
  provider: string;
  baseUrl: string;
  active: boolean;
  latency: number;
  status: "online" | "offline";
}

const MOCK_MODELS: ModelCard[] = [
  { id: "1", name: "GPT-4o Mini", provider: "OpenAI", baseUrl: "https://api.openai.com/v1", active: true, latency: 420, status: "online" },
  { id: "2", name: "Claude 3.5 Haiku", provider: "Anthropic", baseUrl: "https://api.anthropic.com/v1", active: false, latency: 680, status: "online" },
  { id: "3", name: "Qwen 2.5", provider: "通义千问", baseUrl: "https://dashscope.aliyuncs.com/v1", active: false, latency: 320, status: "online" },
  { id: "4", name: "DeepSeek V3", provider: "DeepSeek", baseUrl: "https://api.deepseek.com/v1", active: false, latency: 510, status: "offline" },
];

export default function ModelsPage() {
  return (
    <div>
      {/* Hero 区域 */}
      <div
        style={{
          background: "linear-gradient(135deg, #0958d9 0%, #003eb3 100%)",
          borderRadius: 12,
          padding: "28px 24px",
          marginBottom: 20,
          color: "#fff",
          boxShadow: "0 4px 12px rgba(9,88,217,0.15)",
        }}
      >
        <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
          模型中心
        </Typography.Title>
        <Typography.Text style={{ color: "rgba(255,255,255,0.85)" }}>
          动态管理多通道 AI 模型网关，支持 BaseURL 自定义和模型切换
        </Typography.Text>
      </div>

      <Row gutter={[16, 16]}>
        {MOCK_MODELS.map((m) => (
          <Col key={m.id} xs={24} sm={12}>
            <Card
              style={{
                background: "#ffffff",
                border: m.active ? "2px solid #1677ff" : "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: m.active ? "0 4px 12px rgba(22,119,255,0.08)" : undefined,
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <RobotOutlined style={{ color: m.active ? "#1677ff" : "#9ca3af", fontSize: 18 }} />
                    <Typography.Text strong style={{ color: "#111827", fontSize: 15 }}>
                      {m.name}
                    </Typography.Text>
                    {m.active && <Tag color="blue">主力模型</Tag>}
                  </div>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    {m.provider} · {m.baseUrl}
                  </Typography.Text>
                </div>
                <Tag
                  color={m.status === "online" ? "green" : "default"}
                  icon={m.status === "online" ? <CheckCircleOutlined /> : <ClockCircleOutlined />}
                >
                  {m.status === "online" ? "在线" : "离线"}
                </Tag>
              </div>

              <Row gutter={12}>
                <Col span={12}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    连通延迟
                  </Typography.Text>
                  <div style={{ fontSize: 20, fontWeight: 600, color: m.latency < 500 ? "#52c41a" : "#faad14" }}>
                    {m.latency} ms
                  </div>
                </Col>
                <Col span={12}>
                  <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                    API 通道
                  </Typography.Text>
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#1677ff" }}>{m.active ? "主" : "备"}</div>
                </Col>
              </Row>

              <div style={{ marginTop: 16, display: "flex", gap: 8 }}>
                {!m.active && (
                  <Button size="small" type="primary" style={{ flex: 1 }}>
                    切换为主力
                  </Button>
                )}
                <Button size="small" style={{ flex: 1 }} icon={<CheckCircleOutlined />}>
                  测试连通
                </Button>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
}
