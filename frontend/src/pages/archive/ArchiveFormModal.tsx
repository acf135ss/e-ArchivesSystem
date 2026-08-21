import { useEffect, useState } from 'react';
import { Button, DatePicker, Form, Input, Modal, Select, Upload, message } from 'antd';
import { UploadOutlined } from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import {
  ArchiveOut,
  ArchivePayload,
  CategoryOut,
  createArchive,
  updateArchive,
  uploadAttachment,
} from '../../api/archive';

interface Props {
  open: boolean;
  record: ArchiveOut | null;
  categories: CategoryOut[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function ArchiveFormModal({
  open,
  record,
  categories,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const [submitting, setSubmitting] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const isEdit = !!record;

  useEffect(() => {
    if (!open) return;
    if (record) {
      form.setFieldsValue({
        name: record.name,
        category_id: record.category_id,
        issuer: record.issuer,
        issue_date: record.issue_date ? dayjs(record.issue_date) : null,
        expire_date: record.expire_date ? dayjs(record.expire_date) : null,
        cert_no: record.cert_no,
        grade: record.grade,
        holder: record.holder,
        related_experience: record.related_experience,
        remark: record.remark,
        tags: record.tags.map((t) => t.name),
      });
    } else {
      form.resetFields();
    }
    setFileList([]);
  }, [open, record, form]);

  const handleOk = async () => {
    let values: any;
    try {
      values = await form.validateFields();
    } catch {
      return;
    }
    setSubmitting(true);
    try {
      const payload: ArchivePayload = {
        name: values.name,
        category_id: values.category_id,
        issuer: values.issuer || null,
        issue_date: values.issue_date ? values.issue_date.format('YYYY-MM-DD') : null,
        expire_date: values.expire_date ? values.expire_date.format('YYYY-MM-DD') : null,
        cert_no: values.cert_no || null,
        grade: values.grade || null,
        holder: values.holder || null,
        related_experience: values.related_experience || null,
        remark: values.remark || null,
        tags: values.tags || [],
      };

      let archiveId: number;
      if (isEdit && record) {
        const updated = await updateArchive(record.id, payload);
        archiveId = updated.id;
        message.success('更新成功');
      } else {
        const created = await createArchive(payload);
        archiveId = created.id;
        message.success('新增成功');
        if (fileList.length) {
          for (const f of fileList) {
            if (f.originFileObj) {
              await uploadAttachment(archiveId, f.originFileObj as File);
            }
          }
        }
      }
      onSuccess();
      onClose();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '操作失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      title={isEdit ? '编辑档案' : '新增档案'}
      open={open}
      onOk={handleOk}
      onCancel={onClose}
      confirmLoading={submitting}
      width={640}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="name"
          label="档案名称"
          rules={[{ required: true, message: '请输入档案名称' }]}
        >
          <Input placeholder="如：大学英语六级证书" />
        </Form.Item>
        <Form.Item
          name="category_id"
          label="档案分类"
          rules={[{ required: true, message: '请选择档案分类' }]}
        >
          <Select
            placeholder="请选择分类"
            options={categories
              .filter((c) => c.is_active === 1)
              .map((c) => ({ value: c.id, label: c.name }))}
          />
        </Form.Item>
        <Form.Item name="issuer" label="颁发机构">
          <Input placeholder="如：教育部考试中心" />
        </Form.Item>
        <Form.Item name="issue_date" label="颁发日期">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="expire_date" label="有效期至">
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>
        <Form.Item name="cert_no" label="证书编号">
          <Input placeholder="证书唯一编号" />
        </Form.Item>
        <Form.Item name="grade" label="等级/成绩">
          <Input placeholder="如：520分、一等奖" />
        </Form.Item>
        <Form.Item name="holder" label="持有人">
          <Input placeholder="默认当前用户，可修改" />
        </Form.Item>
        <Form.Item name="tags" label="标签">
          <Select
            mode="tags"
            placeholder="输入后回车添加标签"
            tokenSeparators={[',', '，']}
          />
        </Form.Item>
        <Form.Item name="related_experience" label="关联经历">
          <Input.TextArea rows={2} placeholder="关联的工作/实习经历描述" />
        </Form.Item>
        <Form.Item name="remark" label="备注">
          <Input.TextArea rows={2} placeholder="补充说明" />
        </Form.Item>
        {!isEdit && (
          <Form.Item label="附件（可选）">
            <Upload
              multiple
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList: fl }) => setFileList(fl)}
              accept=".jpg,.jpeg,.png,.pdf"
            >
              <Button icon={<UploadOutlined />}>选择附件</Button>
            </Upload>
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}
