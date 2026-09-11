/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Gemini 系列
 * 修改内容：[1. 登录成功后在 localStorage 中补充持久化存储 user_id 与 user_name，为双向 WebSocket 建立身份绑定]
 */
// 登录页：手机号 + 密码，对接后端 /api/auth/login
"use client";
import { useState } from "react";
import { Form, Input, Button, Card, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuth } from "@/components/hooks/useAuth";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login: setToken } = useAuth();

  const handleFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values.phone, values.password);
      setToken(res.access_token);
      localStorage.setItem("user_id", String(res.user_id));
      localStorage.setItem("user_name", res.name);
      message.success(`欢迎回来，${res.name}`);
      router.push("/");
    } catch (e: any) {
      message.error(e.message ?? "登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        height: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a3e 50%, #0f0f1a 100%)",
        padding: 16,
      }}
    >
      <Card
        style={{
          width: "100%",
          maxWidth: 380,
          borderRadius: 16,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(16px)",
          border: "1px solid rgba(255,255,255,0.12)",
        }}
        bodyStyle={{ padding: 32 }}
      >
        <Typography.Title
          level={3}
          style={{ color: "#fff", textAlign: "center", marginBottom: 8 }}
        >
          AI 客服
        </Typography.Title>
        <Typography.Text style={{ color: "rgba(255,255,255,0.5)", textAlign: "center", display: "block", marginBottom: 24 }}>
          请输入手机号和密码登录
        </Typography.Text>

        <Form layout="vertical" onFinish={handleFinish} size="large">
          <Form.Item
            name="phone"
            rules={[{ required: true, message: "请输入手机号" }]}
          >
            <Input
              prefix={<UserOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="手机号"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
              data-attr="dark"
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[{ required: true, message: "请输入密码" }]}
          >
            <Input.Password
              prefix={<LockOutlined style={{ color: "rgba(255,255,255,0.4)" }} />}
              placeholder="密码"
              style={{ background: "rgba(255,255,255,0.08)", color: "#fff", border: "1px solid rgba(255,255,255,0.15)" }}
            />
          </Form.Item>

          <Button
            type="primary"
            htmlType="submit"
            block
            loading={loading}
            style={{ borderRadius: 8, height: 44 }}
          >
            登录
          </Button>
        </Form>

        <Typography.Paragraph
          style={{ color: "rgba(255,255,255,0.35)", textAlign: "center", marginTop: 16, fontSize: 12 }}
        >
          演示账号：13800000001 / 123456
        </Typography.Paragraph>
      </Card>
    </div>
  );
}
