import { useEffect, useState } from 'react';
import { Card, Col, Empty, Progress, Row, Statistic, Table, Tabs, message } from 'antd';
import {
  FileTextOutlined,
  WarningOutlined,
  StopOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { ArchiveOut, listExpired, listExpiring } from '../../api/archive';
import { DashboardStats, getStats } from '../../api/dashboard';

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiring, setExpiring] = useState<ArchiveOut[]>([]);
  const [expired, setExpired] = useState<ArchiveOut[]>([]);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => message.error(err.response?.data?.detail || '加载统计失败'));
    listExpiring().then(setExpiring).catch(() => {});
    listExpired().then(setExpired).catch(() => {});
  }, []);

  const reminderColumns: ColumnsType<ArchiveOut> = [
    { title: '档案名称', dataIndex: 'name' },
    { title: '分类', render: (_, r) => r.category?.name || '-' },
    {
      title: '有效期至',
      dataIndex: 'expire_date',
      render: (v) => (v ? dayjs(v).format('YYYY-MM-DD') : '-'),
    },
  ];

  const totalByCat = stats?.category_distribution.reduce((s, c) => s + c.count, 0) || 0;

  const reminderTable = (items: ArchiveOut[], emptyText: string) => (
    <Table
      rowKey="id"
      size="small"
      columns={reminderColumns}
      dataSource={items}
      pagination={false}
      locale={{ emptyText }}
    />
  );

  return (
    <div>
      <Row gutter={16}>
        <Col span={6}>
          <Card>
            <Statistic
              title="档案总数"
              value={stats?.total_archives || 0}
              prefix={<FileTextOutlined />}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="即将到期"
              value={stats?.expiring_count || 0}
              prefix={<WarningOutlined />}
              valueStyle={{ color: '#fa8c16' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="已过期"
              value={stats?.expired_count || 0}
              prefix={<StopOutlined />}
              valueStyle={{ color: '#ff4d4f' }}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="附件总数"
              value={stats?.attachment_count || 0}
              prefix={<PaperClipOutlined />}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={16} style={{ marginTop: 16 }}>
        <Col span={10}>
          <Card title="分类分布" style={{ height: '100%' }}>
            {stats?.category_distribution.length ? (
              stats.category_distribution.map((c) => (
                <div key={c.category_id} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{c.category_name}</span>
                    <span>{c.count} 条</span>
                  </div>
                  <Progress
                    percent={totalByCat ? Math.round((c.count / totalByCat) * 100) : 0}
                    showInfo={false}
                  />
                </div>
              ))
            ) : (
              <Empty description="暂无数据" />
            )}
          </Card>
        </Col>
        <Col span={14}>
          <Card title="到期提醒" style={{ height: '100%' }}>
            <Tabs
              defaultActiveKey="expiring"
              items={[
                {
                  key: 'expiring',
                  label: `即将到期 ${expiring.length}`,
                  children: reminderTable(expiring, '暂无即将到期的档案'),
                },
                {
                  key: 'expired',
                  label: `已过期 ${expired.length}`,
                  children: reminderTable(expired, '暂无已过期的档案'),
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
}
