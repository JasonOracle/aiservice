/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[品牌标识改为橙色 Logo 方块，布局底色改为暖白，与 C 端商城视觉统一]
 */
// B 端管理后台主体：左右分栏 SaaS 布局
"use client";
import { useState } from "react";
import { Layout, Menu, Typography } from "antd";
import {
  BookOutlined,
  RobotOutlined,
  DashboardOutlined,
} from "@ant-design/icons";
import KBPage from "@/components/KBPage";
import ModelsPage from "@/components/ModelsPage";
import AgentPage from "@/components/AgentPage";

const { Sider, Content, Header } = Layout;

const BRAND_GRADIENT = "linear-gradient(135deg, #FF8A3D 0%, #FF6A00 55%, #E8480A 100%)";
const LAYOUT_BG = "#f7f5f2";

const MENU_ITEMS = [
  { key: "kb", icon: <BookOutlined />, label: "知识库" },
  { key: "models", icon: <RobotOutlined />, label: "模型中心" },
  { key: "agent", icon: <DashboardOutlined />, label: "实时坐席" },
];

export default function AdminShell() {
  const [activeKey, setActiveKey] = useState("agent");

  return (
    <Layout style={{ minHeight: "100vh", background: LAYOUT_BG }}>
      <Sider
        width={220}
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #f0f0f0", display: "flex", alignItems: "center", gap: 10 }}>
          <span
            style={{
              width: 32,
              height: 32,
              borderRadius: 10,
              background: BRAND_GRADIENT,
              color: "#fff",
              fontWeight: 800,
              fontSize: 14,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              boxShadow: "0 4px 12px rgba(255,106,0,0.28)",
            }}
          >
            AI
          </span>
          <div>
            <Typography.Text strong style={{ color: "#111827", fontSize: 15 }}>
              AI 客服后台
            </Typography.Text>
            <div style={{ color: "#6b7280", fontSize: 12, marginTop: 2 }}>
              Admin Console
            </div>
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          onClick={(e) => setActiveKey(e.key)}
          style={{ border: "none", background: "#ffffff" }}
          items={MENU_ITEMS}
        />
      </Sider>

      <Layout style={{ background: LAYOUT_BG }}>
        <Header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e5e7eb",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            height: 56,
          }}
        >
          <Typography.Text style={{ color: "#111827", fontSize: 15, fontWeight: 600 }}>
            {MENU_ITEMS.find((m) => m.key === activeKey)?.label}
          </Typography.Text>
        </Header>

        <Content style={{ padding: 24, background: LAYOUT_BG }}>
          {activeKey === "kb" && <KBPage />}
          {activeKey === "models" && <ModelsPage />}
          {activeKey === "agent" && <AgentPage />}
        </Content>
      </Layout>
    </Layout>
  );
}
