import { useEffect, useRef, useState } from 'react';
import { Card, Col, Empty, Row, Statistic, Table, Tabs, message } from 'antd';
import {
  FileTextOutlined,
  WarningOutlined,
  StopOutlined,
  PaperClipOutlined,
} from '@ant-design/icons';
import * as echarts from 'echarts';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import { ArchiveOut, listExpired, listExpiring } from '../../api/archive';
import { DashboardStats, getStats } from '../../api/dashboard';

const CHART_COLORS = [
  '#5470c6',
  '#91cc75',
  '#fac858',
  '#ee6666',
  '#73c0de',
  '#3ba272',
  '#fc8452',
  '#9a60b4',
  '#ea7ccc',
  '#546570',
];

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiring, setExpiring] = useState<ArchiveOut[]>([]);
  const [expired, setExpired] = useState<ArchiveOut[]>([]);
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<echarts.ECharts | null>(null);

  useEffect(() => {
    getStats()
      .then(setStats)
      .catch((err) => message.error(err.response?.data?.detail || '加载统计失败'));
    listExpiring().then(setExpiring).catch(() => {});
    listExpired().then(setExpired).catch(() => {});
  }, []);

  useEffect(() => {
    if (!chartRef.current || !stats?.category_distribution.length) return;
    if (!chartInstance.current) {
      chartInstance.current = echarts.init(chartRef.current);
    }
    const option: echarts.EChartsOption = {
      color: CHART_COLORS,
      tooltip: {
        trigger: 'item',
        formatter: '{b}<br/>{c} 条（{d}%）',
      },
      legend: {
        orient: 'horizontal',
        bottom: 0,
        left: 'center',
        textStyle: { fontSize: 12 },
        itemWidth: 14,
        itemHeight: 14,
      },
      series: [
        {
          name: '分类分布',
          type: 'pie',
          radius: ['42%', '66%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderColor: '#fff',
            borderWidth: 2,
          },
          emphasis: {
            scale: true,
            scaleSize: 6,
            label: {
              show: true,
              formatter: '{b} {d}%',
              fontSize: 13,
              fontWeight: 'bold',
            },
          },
          label: {
            show: true,
            formatter: '{b}',
            fontSize: 11,
          },
          labelLine: {
            show: true,
            length: 8,
            length2: 6,
          },
          data: stats.category_distribution.map((c) => ({
            name: c.category_name,
            value: c.count,
          })),
        },
      ],
    };
    chartInstance.current.setOption(option);
  }, [stats]);

  useEffect(() => {
    const handleResize = () => chartInstance.current?.resize();
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      chartInstance.current?.dispose();
      chartInstance.current = null;
    };
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
              <div ref={chartRef} style={{ width: '100%', height: 380 }} />
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
