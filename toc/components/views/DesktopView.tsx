// PC 端视图：类 ChatGPT 三栏布局
// 左：历史会话 | 中：聊天流 | 右：用户信息面板
import { useState } from "react";
import { Layout, Menu, Card, List, Button, Typography, Space, Tabs } from "antd";
import {
  MessageOutlined,
  UserOutlined,
  QrcodeOutlined,
  SendOutlined,
  HomeOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { QRCodeSVG } from "qrcode.react";
import { useAuth } from "@/components/hooks/useAuth";
import { getLocalIP } from "@/lib/api";
import { useEffect } from "react";
import DesktopChat from "@/components/desktop/DesktopChat";

const { Sider, Content } = Layout;

const HISTORY = [
  { id: 1, title: "关于蛋白粉营养成分" },
  { id: 2, title: "冲锋衣防水性能" },
  { id: 3, title: "手办预售时间" },
  { id: 4, title: "岩茶产地溯源" },
];

export default function DesktopView() {
  const { token, logout } = useAuth();
  const [activeKey, setActiveKey] = useState("chat");
  const [showQR, setShowQR] = useState(false);
  const [localIP, setLocalIP] = useState("localhost");

  useEffect(() => {
    getLocalIP().then(setLocalIP).catch(() => {});
  }, []);

  const qrUrl = `http://${localIP}:3000?session_id=abc123`;

  return (
    <Layout style={{ minHeight: "100vh" }}>
      {/* 左侧导航 */}
      <Sider width={240} style={{ background: "#fff", borderRight: "1px solid #f0f0f0" }}>
        <div
          style={{
            padding: 20,
            borderBottom: "1px solid #f0f0f0",
            fontWeight: 700,
            fontSize: 16,
          }}
        >
          AI 商城
        </div>
        <Menu
          mode="inline"
          selectedKeys={[activeKey]}
          onClick={(e) => setActiveKey(e.key)}
          style={{ border: "none" }}
        >
          <Menu.Item key="home" icon={<HomeOutlined />}>
            首页
          </Menu.Item>
          <Menu.Item key="chat" icon={<MessageOutlined />}>
            AI 客服
          </Menu.Item>
        </Menu>
        <div style={{ position: "absolute", bottom: 16, left: 0, right: 0, padding: "0 16px" }}>
          <Space direction="vertical" style={{ width: "100%" }}>
            <Button block icon={<QrcodeOutlined />} onClick={() => setShowQR((s) => !s)}>
              手机端继续
            </Button>
            <Button block icon={<LogoutOutlined />} onClick={logout} danger>
              退出登录
            </Button>
          </Space>
        </div>
      </Sider>

      {/* 主内容区 */}
      <Content style={{ background: "#fafafa", display: "flex" }}>
        {activeKey === "chat" && <DesktopChat />}

        {showQR && (
          <div
            style={{
              width: 280,
              borderLeft: "1px solid #f0f0f0",
              background: "#fff",
              padding: 20,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 12,
            }}
          >
            <Typography.Text strong>手机扫码继续</Typography.Text>
            <QRCodeSVG value={qrUrl} size={180} style={{ border: "2px solid #eee", borderRadius: 8 }} />
            <Typography.Text type="secondary" style={{ fontSize: 12 }}>
              {qrUrl}
            </Typography.Text>
          </div>
        )}
      </Content>
    </Layout>
  );
}
