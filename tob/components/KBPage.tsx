// 知识库大盘 - Hero 区域 + 指标卡片 + 文档列表
"use client";
import { Card, Row, Col, Button, Table, Typography, Upload, Tag } from "antd";
import {
  UploadOutlined,
  FilePdfOutlined,
  FileWordOutlined,
  DeleteOutlined,
} from "@ant-design/icons";
import type { ColumnsType } from "antd/es/table";

interface DocItem {
  key: string;
  name: string;
  type: "pdf" | "doc";
  size: string;
  chunks: number;
  status: "active" | "processing";
}

const MOCK_DOCS: DocItem[] = [
  { key: "1", name: "产品手册-2024.pdf", type: "pdf", size: "2.4 MB", chunks: 128, status: "active" },
  { key: "2", name: "售后政策说明.docx", type: "doc", size: "180 KB", chunks: 32, status: "active" },
  { key: "3", name: "FAQ 常见问题.pdf", type: "pdf", size: "860 KB", chunks: 64, status: "active" },
  { key: "4", name: "会员服务条款.docx", type: "doc", size: "95 KB", chunks: 16, status: "processing" },
];

const columns: ColumnsType<DocItem> = [
  {
    title: "文档名称",
    dataIndex: "name",
    key: "name",
    render: (name: string, record: DocItem) => (
      <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {record.type === "pdf" ? (
          <FilePdfOutlined style={{ color: "#ff4d4f" }} />
        ) : (
          <FileWordOutlined style={{ color: "#1677ff" }} />
        )}
        <span style={{ color: "#fff" }}>{name}</span>
      </span>
    ),
  },
  { title: "大小", dataIndex: "size", key: "size", width: 80 },
  {
    title: "切片数",
    dataIndex: "chunks",
    key: "chunks",
    width: 80,
    render: (n: number) => <Tag color="blue">{n}</Tag>,
  },
  {
    title: "状态",
    dataIndex: "status",
    key: "status",
    width: 100,
    render: (s: string) =>
      s === "active" ? <Tag color="green">已就绪</Tag> : <Tag color="orange">处理中</Tag>,
  },
  {
    title: "操作",
    key: "actions",
    width: 80,
    render: () => <Button type="text" danger icon={<DeleteOutlined />} size="small" />,
  },
];

export default function KBPage() {
  const totalDocs = MOCK_DOCS.length;
  const totalChunks = MOCK_DOCS.reduce((sum, d) => sum + d.chunks, 0);

  return (
    <div>
      {/* Hero 区域 */}
      <div
        style={{
          background: "linear-gradient(135deg, #1a1a4e 0%, #0f0f2e 100%)",
          borderRadius: 12,
          padding: "32px 24px",
          marginBottom: 20,
          border: "1px solid #2a2a5e",
        }}
      >
        <Typography.Title level={3} style={{ color: "#fff", margin: 0 }}>
          知识库大盘
        </Typography.Title>
        <Typography.Text style={{ color: "rgba(255,255,255,0.5)" }}>
          管理 AI 客服的知识来源，支持 PDF / Word 文档上传和实时切片
        </Typography.Text>
      </div>

      {/* 指标卡片 */}
      <Row gutter={[16, 16]} style={{ marginBottom: 20 }}>
        <Col xs={24} sm={8}>
          <Card style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }} bodyStyle={{ padding: 20 }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              文档总数
            </Typography.Text>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#1677ff" }}>{totalDocs}</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }} bodyStyle={{ padding: 20 }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              总切片数
            </Typography.Text>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#52c41a" }}>{totalChunks}</div>
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }} bodyStyle={{ padding: 20 }}>
            <Typography.Text type="secondary" style={{ fontSize: 13 }}>
              就绪率
            </Typography.Text>
            <div style={{ fontSize: 32, fontWeight: 700, color: "#faad14" }}>
              {Math.round((MOCK_DOCS.filter((d) => d.status === "active").length / totalDocs) * 100)}%
            </div>
          </Card>
        </Col>
      </Row>

      {/* 文档列表 */}
      <Card
        title={<span style={{ color: "#fff" }}>文档列表</span>}
        extra={
          <Upload>
            <Button type="primary" icon={<UploadOutlined />} style={{ background: "#1677ff" }}>
              上传文档
            </Button>
          </Upload>
        }
        style={{ background: "#1f1f1f", border: "1px solid #2a2a2a" }}
      >
        <Table<DocItem>
          columns={columns}
          dataSource={MOCK_DOCS}
          pagination={false}
          style={{ background: "transparent" }}
        />
      </Card>
    </div>
  );
}
