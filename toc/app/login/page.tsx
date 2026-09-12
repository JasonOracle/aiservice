/**
 * [变更日志]
 * 修改时间：2026-09-12
 * AI模型：Deepseek-V4.1-Flash
 * 修改内容：[登录页视觉由深色玻璃拟态改为与 C 端商城统一的橙色系；新增演示账号一键填充，便于快速切换 10 个种子用户验证「千人千面」；修正 antd 已废弃的 bodyStyle 用法]

 * 登录页：手机号 + 密码，对接后端 /api/auth/login
 */
"use client";

import { useState } from "react";
import { Form, Input, Button, Typography, message } from "antd";
import { UserOutlined, LockOutlined } from "@ant-design/icons";
import { useRouter } from "next/navigation";
import { login } from "@/lib/api";
import { useAuth } from "@/components/hooks/useAuth";
import { BRAND } from "@/lib/theme";

/** 演示账号（密码统一 123456），点击即可填充 */
const DEMO_ACCOUNTS = [
  { phone: "13800000001", name: "张伟", role: "程序员" },
  { phone: "13800000002", name: "李娜", role: "美妆达人" },
  { phone: "13800000003", name: "王强", role: "健身教练" },
  { phone: "13800000004", name: "赵敏", role: "新手宝妈" },
  { phone: "13800000008", name: "吴婷", role: "铲屎官" },
  { phone: "13800000009", name: "孙斌", role: "品茶大叔" },
];

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { login: setToken } = useAuth();
  const [form] = Form.useForm<{ phone: string; password: string }>();

  const handleFinish = async (values: { phone: string; password: string }) => {
    setLoading(true);
    try {
      const res = await login(values.phone, values.password);
      setToken(res.access_token);
      localStorage.setItem("user_id", String(res.user_id));
      localStorage.setItem("user_name", res.name);
      message.success(`欢迎回来，${res.name}`);
      router.push("/");
    } catch (e) {
      const err = e as Error;
      message.error(err.message ?? "登录失败，请检查账号密码");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: BRAND.gradient,
        padding: 20,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 880,
          background: "#fff",
          borderRadius: 20,
          overflow: "hidden",
          display: "flex",
          boxShadow: "0 24px 60px rgba(120,50,0,0.28)",
        }}
      >
        {/* 左：品牌介绍 */}
        <div
          style={{
            flex: 1,
            padding: "44px 38px",
            background: "linear-gradient(160deg, #FFF6EE 0%, #FFE9D8 100%)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 14,
            minWidth: 300,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: 11,
                background: BRAND.gradient,
                color: "#fff",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 16,
              }}
            >
              AI
            </span>
            <span style={{ fontSize: 20, fontWeight: 800, color: BRAND.text }}>AI 商城</span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 800, color: BRAND.text, lineHeight: 1.35 }}>
            智能客服 · 千人千面
          </div>
          <div style={{ fontSize: 13, color: "#6E6259", lineHeight: 1.9 }}>
            登录后即可体验 10 家官方店铺商品，
            <br />
            AI 客服基于知识库作答，可随时转接人工。
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
            {["RAG 溯源", "Mem0 记忆", "人工接管"].map((t) => (
              <span
                key={t}
                style={{
                  fontSize: 11,
                  color: BRAND.primary,
                  background: "#fff",
                  border: "1px solid #FFDCC0",
                  borderRadius: 999,
                  padding: "3px 10px",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* 右：登录表单 */}
        <div style={{ flex: 1, padding: "44px 38px", minWidth: 320 }}>
          <Typography.Title level={4} style={{ marginBottom: 4, color: BRAND.text }}>
            欢迎登录
          </Typography.Title>
          <Typography.Text style={{ color: BRAND.textSub, fontSize: 13 }}>
            请输入手机号和密码
          </Typography.Text>

          <Form form={form} layout="vertical" onFinish={handleFinish} size="large" style={{ marginTop: 22 }}>
            <Form.Item name="phone" rules={[{ required: true, message: "请输入手机号" }]}>
              <Input prefix={<UserOutlined style={{ color: "#C6B9AE" }} />} placeholder="手机号" />
            </Form.Item>

            <Form.Item name="password" rules={[{ required: true, message: "请输入密码" }]}>
              <Input.Password prefix={<LockOutlined style={{ color: "#C6B9AE" }} />} placeholder="密码" />
            </Form.Item>

            <Button
              type="primary"
              htmlType="submit"
              block
              loading={loading}
              style={{
                height: 46,
                borderRadius: 11,
                background: BRAND.gradient,
                border: "none",
                fontWeight: 700,
                fontSize: 15,
                boxShadow: "0 6px 18px rgba(255,106,0,0.3)",
              }}
            >
              登录
            </Button>
          </Form>

          <div style={{ marginTop: 24 }}>
            <div style={{ fontSize: 12, color: BRAND.textSub, marginBottom: 8 }}>
              演示账号（密码均为 123456，点击填充）
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              {DEMO_ACCOUNTS.map((a) => (
                <button
                  key={a.phone}
                  type="button"
                  onClick={() => form.setFieldsValue({ phone: a.phone, password: "123456" })}
                  style={{
                    border: `1px solid ${BRAND.border}`,
                    background: "#FDFAF7",
                    borderRadius: 8,
                    padding: "5px 10px",
                    fontSize: 12,
                    color: BRAND.text,
                    cursor: "pointer",
                  }}
                >
                  {a.name} · {a.role}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
