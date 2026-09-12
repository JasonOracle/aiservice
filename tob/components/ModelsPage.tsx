/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[补齐上一轮改色遗漏：主力模型卡片的选中边框、机器人图标色与投影仍是 antd 蓝 #1677ff，统一改为品牌橙 #FF6A00]
 *
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[Hero 渐变与主色由 antd 蓝统一为品牌橙；补充说明文案——本页为演示展示，模型切换不会真正生效，实际生效模型由后端 .env 配置决定]
 */
// 模型中心 - 多通道 AI 模型网关管理（演示展示页）
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
          background: "linear-gradient(135deg, #FF8A3D 0%, #FF6A00 55%, #E8480A 100%)",
          borderRadius: 12,
          padding: "28px 24px",
          marginBottom: 20,
          color: "#fff",
          boxShadow: "0 4px 12px rgba(255,106,0,0.18)",
        }}
      >
        <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
          模型中心
        </Typography.Title>
        <Typography.Text style={{ color: "rgba(255,255,255,0.85)" }}>
          动态管理多通道 AI 模型网关，支持 BaseURL 自定义和模型切换
        </Typography.Text>
        <div
          style={{
            marginTop: 12,
            fontSize: 12,
            color: "rgba(255,255,255,0.82)",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.28)",
            borderRadius: 8,
            padding: "8px 12px",
          }}
        >
          说明：本页为演示展示，切换模型不会真正生效；AI 客服实际使用的模型由后端 .env 中的
          XIAO_HONG_SHU_API_KEY / OPENAI_MODEL 配置决定。
        </div>
      </div>

      <Row gutter={[16, 16]}>
        {MOCK_MODELS.map((m) => (
          <Col key={m.id} xs={24} sm={12}>
            <Card
              style={{
                background: "#ffffff",
                border: m.active ? "2px solid #FF6A00" : "1px solid #e5e7eb",
                borderRadius: 10,
                boxShadow: m.active ? "0 4px 12px rgba(255,106,0,0.12)" : undefined,
              }}
              styles={{ body: { padding: 20 } }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                    <RobotOutlined style={{ color: m.active ? "#FF6A00" : "#9ca3af", fontSize: 18 }} />
                    <Typography.Text strong style={{ color: "#111827", fontSize: 15 }}>
                      {m.name}
                    </Typography.Text>
                    {m.active && <Tag color="orange">主力模型</Tag>}
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
                  <div style={{ fontSize: 20, fontWeight: 600, color: "#FF6A00" }}>{m.active ? "主" : "备"}</div>
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
