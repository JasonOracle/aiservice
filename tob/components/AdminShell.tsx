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
    <Layout style={{ minHeight: "100vh" }}>
      <Sider
        width={220}
        style={{
          background: "#141414",
          borderRight: "1px solid #2a2a2a",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <div style={{ padding: "20px 16px", borderBottom: "1px solid #2a2a2a" }}>
          <Typography.Text strong style={{ color: "#fff", fontSize: 16 }}>
            AI 客服后台
          </Typography.Text>
          <div style={{ color: "#666", fontSize: 12, marginTop: 4 }}>
            Admin Console
          </div>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          onClick={(e) => setActiveKey(e.key)}
          style={{ border: "none", background: "transparent" }}
          items={MENU_ITEMS}
        />
      </Sider>

      <Layout style={{ background: "#141414" }}>
        <Header
          style={{
            background: "#141414",
            borderBottom: "1px solid #2a2a2a",
            padding: "0 24px",
            display: "flex",
            alignItems: "center",
            height: 56,
          }}
        >
          <Typography.Text style={{ color: "#fff", fontSize: 15, fontWeight: 600 }}>
            {MENU_ITEMS.find((m) => m.key === activeKey)?.label}
          </Typography.Text>
        </Header>

        <Content style={{ padding: 24, background: "#141414" }}>
          {activeKey === "kb" && <KBPage />}
          {activeKey === "models" && <ModelsPage />}
          {activeKey === "agent" && <AgentPage />}
        </Content>
      </Layout>
    </Layout>
  );
}
