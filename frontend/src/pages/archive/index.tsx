import { useCallback, useEffect, useState } from 'react';
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Modal,
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
  LockOutlined,
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
import { listCategories, verifyCategoryPassword } from '../../api/category';
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
  const [detailCategoryId, setDetailCategoryId] = useState<number | null>(null);

  // 二次密码：已解锁分类的解锁 token（categoryId -> unlockToken，会话内记住）
  const [unlockTokens, setUnlockTokens] = useState<Map<number, string>>(new Map());
  const [pwdTarget, setPwdTarget] = useState<CategoryOut | null>(null);
  const [pwdInput, setPwdInput] = useState('');
  const [pwdVerifying, setPwdVerifying] = useState(false);
  // 密码验证通过后待执行的动作
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  // 待验证的分类队列（用于导出时逐个解锁）
  const [pendingCats, setPendingCats] = useState<CategoryOut[]>([]);
  const [currentPendingCat, setCurrentPendingCat] = useState<CategoryOut | null>(null);

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

  const onCategoryChange = (value: number | undefined) => {
    if (value == null) {
      setCategoryId(undefined);
      return;
    }
    setCategoryId(value);
  };

  // 若分类受保护且未解锁，则弹出密码框；验证通过后执行 action
  const ensureUnlocked = (categoryId: number, action: () => void) => {
    const cat = categories.find((c) => c.id === categoryId);
    if (cat?.is_protected && !unlockTokens.has(categoryId)) {
      setPwdTarget(cat);
      setPwdInput('');
      setPendingAction(() => action);
      return;
    }
    action();
  };

  const onVerifyPassword = async () => {
    if (!pwdTarget) return;
    setPwdVerifying(true);
    try {
      const res = await verifyCategoryPassword(pwdTarget.id, pwdInput);
      setUnlockTokens((prev) => new Map(prev).set(pwdTarget.id, res.unlock_token));

      // 导出队列场景：推进到下一个待验证分类
      if (currentPendingCat) {
        const rest = pendingCats.filter((c) => c.id !== pwdTarget.id);
        setPendingCats(rest);
        if (rest.length) {
          setCurrentPendingCat(rest[0]);
          setPwdTarget(rest[0]);
          setPwdInput('');
          setPwdVerifying(false);
          return;
        }
        // 全部解锁完成，执行导出
        setCurrentPendingCat(null);
        setPwdTarget(null);
        setPwdInput('');
        setPwdVerifying(false);
        doExport();
        return;
      }

      // 详情/编辑场景：执行待执行动作
      const action = pendingAction;
      setPwdTarget(null);
      setPwdInput('');
      setPendingAction(null);
      message.success('验证通过');
      action?.();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '密码错误');
    } finally {
      setPwdVerifying(false);
    }
  };

  // 打开详情：受保护分类需先解锁
  const openDetail = (record: ArchiveOut) => {
    ensureUnlocked(record.category_id, () => {
      setDetailId(record.id);
      setDetailCategoryId(record.category_id);
      setDrawerOpen(true);
    });
  };

  // 打开编辑：受保护分类需先解锁
  const openEdit = (record: ArchiveOut) => {
    ensureUnlocked(record.category_id, () => {
      setEditingRecord(record);
      setModalOpen(true);
    });
  };

  const onDelete = async (id: number) => {
    await deleteArchive(id);
    message.success('删除成功');
    load();
  };

  const onExport = async () => {
    // 先查询导出结果集，找出其中受保护且未解锁的分类
    let protectedCats: CategoryOut[] = [];
    try {
      const res = await listArchives({
        keyword: keyword || undefined,
        category_id: categoryId,
        tag: tag || undefined,
        page: 1,
        page_size: 100000,
      });
      const ids = new Set(res.items.map((a) => a.category_id));
      protectedCats = categories.filter(
        (c) => ids.has(c.id) && c.is_protected && !unlockTokens.has(c.id),
      );
    } catch (err: any) {
      message.error(err.response?.data?.detail || '导出失败');
      return;
    }

    // 若存在未解锁的受保护分类，逐个验证密码
    if (protectedCats.length) {
      setPendingCats(protectedCats);
      setCurrentPendingCat(protectedCats[0]);
      setPwdTarget(protectedCats[0]);
      setPwdInput('');
      return;
    }
    doExport();
  };

  const doExport = async () => {
    try {
      // 收集所有已解锁分类的 token（逗号分隔）
      const tokens = Array.from(unlockTokens.values()).join(',');
      await exportArchives(
        {
          keyword: keyword || undefined,
          category_id: categoryId,
          tag: tag || undefined,
        },
        tokens || undefined,
      );
      message.success('导出成功');
    } catch (err: any) {
      message.error(err.response?.data?.detail || '导出失败');
    }
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
            onClick={() => openDetail(record)}
          >
            详情
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => openEdit(record)}
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
            onChange={onCategoryChange}
            options={categories.map((c) => ({
              value: c.id,
              label: c.is_protected ? `${c.name} 🔒` : c.name,
            }))}
            style={{ width: 160 }}
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
          新增
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
        unlockToken={
          detailCategoryId != null ? unlockTokens.get(detailCategoryId) : undefined
        }
      />

      <Modal
        title={
          <span>
            <LockOutlined style={{ marginRight: 8 }} />
            验证二次密码
          </span>
        }
        open={!!pwdTarget}
        onOk={onVerifyPassword}
        onCancel={() => {
          setPwdTarget(null);
          setPendingAction(null);
          setPendingCats([]);
          setCurrentPendingCat(null);
        }}
        confirmLoading={pwdVerifying}
        okText="验证"
        cancelText="取消"
        width={400}
      >
        <p style={{ color: '#666' }}>
          分类「{pwdTarget?.name}」已设置二次密码，请输入密码解锁后
          {currentPendingCat ? '导出' : '查看'}。
        </p>
        <Input.Password
          placeholder="请输入该分类的二次密码"
          value={pwdInput}
          onChange={(e) => setPwdInput(e.target.value)}
          onPressEnter={onVerifyPassword}
        />
      </Modal>
    </Card>
  );
}
