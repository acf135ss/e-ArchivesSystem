import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Popconfirm,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Upload,
  message,
} from 'antd';
import {
  DownloadOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import dayjs from 'dayjs';
import {
  ArchiveOut,
  ArchiveQuery,
  CategoryOut,
  deleteArchive,
  downloadImportTemplate,
  exportArchives,
  importArchives,
  listArchives,
} from '../../api/archive';
import { listCategories } from '../../api/category';
import ArchiveFormModal from './ArchiveFormModal';
import ArchiveDetailDrawer from './ArchiveDetailDrawer';

const { RangePicker } = DatePicker;

export default function ArchiveList() {
  const [categories, setCategories] = useState<CategoryOut[]>([]);
  const [data, setData] = useState<ArchiveOut[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const [keyword, setKeyword] = useState('');
  const [categoryId, setCategoryId] = useState<number | undefined>();
  const [tag, setTag] = useState('');
  const [issueRange, setIssueRange] = useState<[string, string] | null>(null);
  const [expireRange, setExpireRange] = useState<[string, string] | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ArchiveOut | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [detailId, setDetailId] = useState<number | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params: ArchiveQuery = {
        keyword: keyword || undefined,
        category_id: categoryId,
        tag: tag || undefined,
        issue_date_from: issueRange?.[0],
        issue_date_to: issueRange?.[1],
        expire_date_from: expireRange?.[0],
        expire_date_to: expireRange?.[1],
        page,
        page_size: pageSize,
      };
      const res = await listArchives(params);
      setData(res.items);
      setTotal(res.total);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '加载失败');
    } finally {
      setLoading(false);
    }
  }, [keyword, categoryId, tag, issueRange, expireRange, page, pageSize]);

  useEffect(() => {
    listCategories(true)
      .then(setCategories)
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onSearch = () => {
    setPage(1);
    load();
  };

  const onReset = () => {
    setKeyword('');
    setCategoryId(undefined);
    setTag('');
    setIssueRange(null);
    setExpireRange(null);
    setPage(1);
  };

  const onDelete = async (id: number) => {
    await deleteArchive(id);
    message.success('删除成功');
    load();
  };

  const onExport = async () => {
    await exportArchives({
      keyword: keyword || undefined,
      category_id: categoryId,
      tag: tag || undefined,
    });
    message.success('导出成功');
  };

  const onImport = async (file: File) => {
    const res = await importArchives(file);
    if (res.errors.length) {
      message.warning(`导入完成，成功 ${res.created} 条，失败 ${res.errors.length} 条`);
      message.error(res.errors.slice(0, 5).join('；'));
    } else {
      message.success(`成功导入 ${res.created} 条档案`);
    }
    load();
    return false;
  };

  const renderExpire = (value: string | null) => {
    if (!value) return '-';
    const today = dayjs().startOf('day');
    const expire = dayjs(value);
    const diff = expire.diff(today, 'day');
    if (diff < 0) return <Tag color="red">{dayjs(value).format('YYYY-MM-DD')}</Tag>;
    if (diff <= 30) return <Tag color="orange">{dayjs(value).format('YYYY-MM-DD')}</Tag>;
    return dayjs(value).format('YYYY-MM-DD');
  };

  const columns: ColumnsType<ArchiveOut> = [
    { title: '档案名称', dataIndex: 'name', width: 180 },
    {
      title: '分类',
      dataIndex: ['category', 'name'],
      width: 110,
      render: (_, r) => r.category?.name || '-',
    },
    { title: '颁发机构', dataIndex: 'issuer', width: 140, render: (v) => v || '-' },
    { title: '证书编号', dataIndex: 'cert_no', width: 140, render: (v) => v || '-' },
    {
      title: '有效期至',
      dataIndex: 'expire_date',
      width: 130,
      render: (v) => renderExpire(v),
    },
    { title: '持有人', dataIndex: 'holder', width: 100, render: (v) => v || '-' },
    {
      title: '标签',
      dataIndex: 'tags',
      width: 160,
      render: (tags: ArchiveOut['tags']) =>
        tags.length ? tags.map((t) => <Tag key={t.id}>{t.name}</Tag>) : '-',
    },
    {
      title: '创建时间',
      dataIndex: 'created_at',
      width: 160,
      render: (v) => dayjs(v).format('YYYY-MM-DD HH:mm'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      fixed: 'right',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setDetailId(record.id);
              setDrawerOpen(true);
            }}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => {
              setEditingRecord(record);
              setModalOpen(true);
            }}
          >
            编辑
          </Button>
          <Popconfirm title="确认删除该档案？" onConfirm={() => onDelete(record.id)}>
            <Button type="link" size="small" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Card>
      <Row gutter={[12, 12]} style={{ marginBottom: 16 }}>
        <Col>
          <Input
            placeholder="名称/编号/机构/备注"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={onSearch}
            prefix={<SearchOutlined />}
            style={{ width: 200 }}
            allowClear
          />
        </Col>
        <Col>
          <Select
            placeholder="分类"
            allowClear
            value={categoryId}
            onChange={setCategoryId}
            options={categories.map((c) => ({ value: c.id, label: c.name }))}
            style={{ width: 140 }}
          />
        </Col>
        <Col>
          <Input
            placeholder="标签"
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onPressEnter={onSearch}
            style={{ width: 120 }}
            allowClear
          />
        </Col>
        <Col>
          <RangePicker
            value={issueRange ? [dayjs(issueRange[0]), dayjs(issueRange[1])] : null}
            onChange={(_, s) =>
              setIssueRange(s && s[0] && s[1] ? [s[0], s[1]] : null)
            }
            placeholder={['颁发日期起', '颁发日期止']}
          />
        </Col>
        <Col>
          <RangePicker
            value={expireRange ? [dayjs(expireRange[0]), dayjs(expireRange[1])] : null}
            onChange={(_, s) =>
              setExpireRange(s && s[0] && s[1] ? [s[0], s[1]] : null)
            }
            placeholder={['有效期起', '有效期止']}
          />
        </Col>
        <Col>
          <Space>
            <Button type="primary" icon={<SearchOutlined />} onClick={onSearch}>
              查询
            </Button>
            <Button icon={<ReloadOutlined />} onClick={onReset}>
              重置
            </Button>
          </Space>
        </Col>
      </Row>

      <Space style={{ marginBottom: 16 }}>
        <Button
          type="primary"
          icon={<PlusOutlined />}
          onClick={() => {
            setEditingRecord(null);
            setModalOpen(true);
          }}
        >
          新增档案
        </Button>
        <Button icon={<DownloadOutlined />} onClick={onExport}>
          导出
        </Button>
        <Upload
          showUploadList={false}
          beforeUpload={(file) => {
            onImport(file);
            return false;
          }}
          accept=".xlsx"
        >
          <Button icon={<UploadOutlined />}>导入</Button>
        </Upload>
        <Button type="link" onClick={downloadImportTemplate}>
          下载导入模板
        </Button>
      </Space>

      <Table
        rowKey="id"
        loading={loading}
        columns={columns}
        dataSource={data}
        scroll={{ x: 1200 }}
        pagination={{
          current: page,
          pageSize,
          total,
          showSizeChanger: true,
          showTotal: (t) => `共 ${t} 条`,
          onChange: (p, ps) => {
            setPage(p);
            setPageSize(ps);
          },
        }}
      />

      <ArchiveFormModal
        open={modalOpen}
        record={editingRecord}
        categories={categories}
        onClose={() => setModalOpen(false)}
        onSuccess={load}
      />
      <ArchiveDetailDrawer
        open={drawerOpen}
        archiveId={detailId}
        onClose={() => setDrawerOpen(false)}
        onChanged={load}
      />
    </Card>
  );
}
