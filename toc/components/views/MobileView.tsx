// 移动端视图：antd-mobile 三 Tab 架构
// 首页(商品列表) / 消息(会话列表) / 我的(个人中心)
import { useState } from "react";
import { TabBar, NavBar, Card, List, Button } from "antd-mobile";
import { AppOutline, MessageOutline, UserOutline } from "antd-mobile-icons";
import { useAuth } from "@/components/hooks/useAuth";
import MobileChat from "@/components/mobile/MobileChat";

const PRODUCTS = [
  { id: 1, name: "机械键盘 K8 Pro", price: 399, desc: "Gasket 结构，热插拔轴" },
  { id: 2, name: "降噪耳机 ANC-X", price: 599, desc: "主动降噪，40h 续航" },
  { id: 3, name: "蛋白粉 2kg", price: 299, desc: "乳清蛋白，低糖配方" },
  { id: 4, name: "冲锋衣 GORE-TEX", price: 1299, desc: "防水 20000mm，户外旗舰" },
  { id: 5, name: "手办 限量款", price: 899, desc: "二次元限定，PVC 材质" },
  { id: 6, name: "岩茶 大红袍", price: 459, desc: "武夷山正岩，2024 秋香" },
];

export default function MobileView() {
  const [activeTab, setActiveTab] = useState<string>("0");
  const [showChat, setShowChat] = useState(false);

  if (showChat) {
    return <MobileChat onBack={() => setShowChat(false)} />;
  }

  return (
    <div style={{ height: "100dvh", display: "flex", flexDirection: "column", background: "#f5f5f9" }}>
      <NavBar
        right={
          <Button color="primary" fill="outline" onClick={() => setShowChat(true)}>
            AI 客服
          </Button>
        }
        style={{ background: "#fff" }}
      >
        AI 商城
      </NavBar>

      <div style={{ flex: 1, overflow: "auto", paddingBottom: 60 }}>
        {activeTab === "0" && (
          <div style={{ padding: 12 }}>
            {PRODUCTS.map((p) => (
              <Card key={p.id} style={{ borderRadius: 12, marginBottom: 10 }}>
                <List.Item
                  extra={
                    <span style={{ color: "#1677ff", fontWeight: 600 }}>¥{p.price}</span>
                  }
                >
                  <div>
                    <div style={{ fontWeight: 500 }}>{p.name}</div>
                    <div style={{ fontSize: 12, color: "#999" }}>{p.desc}</div>
                  </div>
                </List.Item>
              </Card>
            ))}
          </div>
        )}
        {activeTab === "1" && (
          <div style={{ padding: 12, display: "flex", flexDirection: "column", gap: 10 }}>
            <Card style={{ borderRadius: 12 }}>
              <List.Item description="关于蛋白粉营养成分的咨询">
                <div style={{ fontWeight: 500 }}>AI 客服助手</div>
              </List.Item>
              <List.Item description="冲锋衣防水性能">
                <div style={{ fontWeight: 500 }}>AI 客服助手</div>
              </List.Item>
            </Card>
            <Button block color="primary" onClick={() => setShowChat(true)}>
              开始对话
            </Button>
          </div>
        )}
        {activeTab === "2" && (
          <div style={{ padding: 12 }}>
            <Card style={{ borderRadius: 12 }}>
              <List.Item>登录状态</List.Item>
              <List.Item description="手机号 + 密码">演示账号</List.Item>
            </Card>
          </div>
        )}
      </div>

      <TabBar activeKey={activeTab} onChange={(k) => setActiveTab(String(k))} style={{ background: "#fff" }}>
        <TabBar.Item key={0} icon={<AppOutline />} title="首页" />
        <TabBar.Item key={1} icon={<MessageOutline />} title="消息" />
        <TabBar.Item key={2} icon={<UserOutline />} title="我的" />
      </TabBar>
    </div>
  );
}
