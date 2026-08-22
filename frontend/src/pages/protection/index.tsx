import { useEffect, useState } from 'react';
import {
  Alert,
  Button,
  Card,
  Input,
  Modal,
  Space,
  Table,
  Tag,
  message,
} from 'antd';
import { LockOutlined, UnlockOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { listCategories, updateCategory } from '../../api/category';
import type { CategoryOut } from '../../api/archive';

type ModalMode = 'set' | 'change' | 'clear';

export default function ProtectionPage() {
  const [data, setData] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [target, setTarget] = useState<CategoryOut | null>(null);
  const [mode, setMode] = useState<ModalMode>('set');
  const [oldPassword, setOldPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      setData(await listCategories());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openModal = (record: CategoryOut, m: ModalMode) => {
    setTarget(record);
    setMode(m);
    setOldPassword('');
    setPassword('');
    setConfirm('');
  };

  const handleOk = async () => {
    if (!target) return;

    if (mode === 'set') {
      if (password.length < 6) {
        message.error('密码至少 6 位');
        return;
      }
      if (password !== confirm) {
        message.error('两次输入的密码不一致');
        return;
      }
    } else {
      // change / clear 需校验原密码
      if (!oldPassword) {
        message.error('请输入原密码');
        return;
      }
      if (mode === 'change') {
        if (password.length < 6) {
          message.error('新密码至少 6 位');
          return;
        }
        if (password !== confirm) {
          message.error('两次输入的密码不一致');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const payload: { protect_password: string; old_password?: string } =
        mode === 'clear'
          ? { protect_password: '', old_password: oldPassword }
          : mode === 'change'
            ? { protect_password: password, old_password: oldPassword }
            : { protect_password: password };

      await updateCategory(target.id, payload);
      message.success(
        mode === 'clear' ? '已取消二次密码' : mode === 'change' ? '密码已修改' : '已设置二次密码',
      );
      setTarget(null);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  const columns: ColumnsType<CategoryOut> = [
    { title: '分类名称', dataIndex: 'name', width: 180 },
    { title: '说明', dataIndex: 'description', render: (v) => v || '-' },
    {
      title: '防护状态',
      dataIndex: 'is_protected',
      width: 130,
      render: (v) =>
        v ? (
          <Tag icon={<LockOutlined />} color="orange">
            已加密
          </Tag>
        ) : (
          <Tag color="default">未加密</Tag>
        ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space>
          {record.is_protected ? (
            <>
              <Button
                type="link"
                size="small"
                icon={<LockOutlined />}
                onClick={() => openModal(record, 'change')}
              >
                修改密码
              </Button>
              <Button
                type="link"
                size="small"
                danger
                icon={<UnlockOutlined />}
                onClick={() => openModal(record, 'clear')}
              >
                取消防护
              </Button>
            </>
          ) : (
            <Button
              type="link"
              size="small"
              icon={<LockOutlined />}
              onClick={() => openModal(record, 'set')}
            >
              设置密码
            </Button>
          )}
        </Space>
      ),
    },
  ];

  const modalTitle =
    mode === 'set'
      ? `设置二次密码 - ${target?.name || ''}`
      : mode === 'change'
        ? `修改二次密码 - ${target?.name || ''}`
        : `取消二次密码 - ${target?.name || ''}`;

  return (
    <Card title="隐私防护">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="为分类设置二次密码后，在档案管理中查看该分类下的档案详情、编辑或导出时，需要输入密码解锁。"
      />

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        pagination={false}
      />

      <Modal
        title={modalTitle}
        open={!!target}
        onOk={handleOk}
        onCancel={() => setTarget(null)}
        confirmLoading={submitting}
        okText="确定"
        cancelText="取消"
        width={420}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {(mode === 'change' || mode === 'clear') && (
            <Input.Password
              prefix={<LockOutlined />}
              placeholder="请输入原密码"
              value={oldPassword}
              onChange={(e) => setOldPassword(e.target.value)}
            />
          )}
          {mode !== 'clear' && (
            <>
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请输入新密码（至少 6 位）"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Input.Password
                prefix={<LockOutlined />}
                placeholder="请再次输入新密码"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </>
          )}
          {mode === 'clear' && (
            <div style={{ color: '#999' }}>确认取消该分类的二次密码防护？</div>
          )}
        </div>
      </Modal>
    </Card>
  );
}
