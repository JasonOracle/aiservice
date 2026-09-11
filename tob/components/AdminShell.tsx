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

const MENU_ITEMS = [
  { key: "kb", icon: <BookOutlined />, label: "知识库" },
  { key: "models", icon: <RobotOutlined />, label: "模型中心" },
  { key: "agent", icon: <DashboardOutlined />, label: "实时坐席" },
];

export default function AdminShell() {
  const [activeKey, setActiveKey] = useState("kb");

  return (
    <Layout style={{ minHeight: "100vh", background: "#f0f2f5" }}>
      <Sider
        width={220}
        style={{
          background: "#ffffff",
          borderRight: "1px solid #e5e7eb",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #f0f0f0" }}>
          <Typography.Text strong style={{ color: "#111827", fontSize: 16 }}>
            AI 客服后台
          </Typography.Text>
          <div style={{ color: "#6b7280", fontSize: 12, marginTop: 4 }}>
            Admin Console
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

      <Layout style={{ background: "#f0f2f5" }}>
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

        <Content style={{ padding: 24, background: "#f0f2f5" }}>
          {activeKey === "kb" && <KBPage />}
          {activeKey === "models" && <ModelsPage />}
          {activeKey === "agent" && <AgentPage />}
        </Content>
      </Layout>
    </Layout>
  );
}
