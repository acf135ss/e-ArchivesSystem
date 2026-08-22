import { useEffect, useState } from 'react';
import {
  Button,
  Card,
  Form,
  Input,
  Modal,
  Popconfirm,
  Space,
  Switch,
  Table,
  Tag,
  message,
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import {
  createCategory,
  deleteCategory,
  listCategories,
  updateCategory,
} from '../../api/category';
import type { CategoryOut } from '../../api/archive';

export default function CategoryPage() {
  const [data, setData] = useState<CategoryOut[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CategoryOut | null>(null);
  const [form] = Form.useForm();

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

  const openModal = (record: CategoryOut | null) => {
    setEditing(record);
    if (record) {
      form.setFieldsValue({
        name: record.name,
        description: record.description,
        is_active: record.is_active === 1,
      });
    } else {
      form.resetFields();
    }
    setModalOpen(true);
  };

  const handleOk = async () => {
    const values = await form.validateFields();
    const payload = {
      name: values.name,
      description: values.description || null,
      is_active: values.is_active ? 1 : 0,
    };
    try {
      if (editing) {
        await updateCategory(editing.id, payload);
        message.success('更新成功');
      } else {
        await createCategory(payload);
        message.success('新增成功');
      }
      setModalOpen(false);
      load();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    }
  };

  const onDelete = async (id: number) => {
    try {
      await deleteCategory(id);
      message.success('删除成功');
      load();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '删除失败');
    }
  };

  const columns: ColumnsType<CategoryOut> = [
    { title: 'ID', dataIndex: 'id', width: 70 },
    { title: '分类名称', dataIndex: 'name', width: 160 },
    { title: '说明', dataIndex: 'description', render: (v) => v || '-' },
    {
      title: '状态',
      dataIndex: 'is_active',
      width: 90,
      render: (v) =>
        v === 1 ? <Tag color="green">启用</Tag> : <Tag color="default">停用</Tag>,
    },
    {
      title: '操作',
      key: 'action',
      width: 160,
      render: (_, record) => (
        <Space>
          <Button type="link" size="small" onClick={() => openModal(record)}>
            编辑
          </Button>
          <Popconfirm title="确认删除该分类？" onConfirm={() => onDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card
      title="分类管理"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => openModal(null)}>
          新增分类
        </Button>
      }
    >
      <Table rowKey="id" loading={loading} columns={columns} dataSource={data} pagination={false} />

      <Modal
        title={editing ? '编辑分类' : '新增分类'}
        open={modalOpen}
        onOk={handleOk}
        onCancel={() => setModalOpen(false)}
        width={480}
      >
        <Form form={form} layout="vertical">
          <Form.Item
            name="name"
            label="分类名称"
            rules={[{ required: true, message: '请输入分类名称' }]}
          >
            <Input placeholder="如：培训证书类" />
          </Form.Item>
          <Form.Item name="description" label="说明">
            <Input.TextArea rows={2} />
          </Form.Item>
          <Form.Item name="is_active" label="是否启用" valuePropName="checked" initialValue={true}>
            <Switch />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
