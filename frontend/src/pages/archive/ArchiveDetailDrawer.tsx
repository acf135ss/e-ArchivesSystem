import { useEffect, useState } from 'react';
import {
  Button,
  Descriptions,
  Drawer,
  Empty,
  List,
  Popconfirm,
  Tag,
  Upload,
  message,
} from 'antd';
import {
  DeleteOutlined,
  DownloadOutlined,
  EyeOutlined,
  FilePdfOutlined,
  FileImageOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd';
import dayjs from 'dayjs';
import {
  ArchiveOut,
  deleteAttachment,
  downloadAttachment,
  getArchive,
  getAttachmentBlobUrl,
  uploadAttachment,
} from '../../api/archive';

interface Props {
  archiveId: number | null;
  open: boolean;
  onClose: () => void;
  onChanged: () => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function ArchiveDetailDrawer({ archiveId, open, onClose, onChanged }: Props) {
  const [archive, setArchive] = useState<ArchiveOut | null>(null);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  const load = async () => {
    if (archiveId == null) return;
    setLoading(true);
    try {
      const data = await getArchive(archiveId);
      setArchive(data);
    } catch (err: any) {
      message.error(err.response?.data?.detail || '加载失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open && archiveId != null) {
      load();
    } else {
      setArchive(null);
    }
    setFileList([]);
  }, [open, archiveId]);

  const onPreview = async (id: number) => {
    const url = await getAttachmentBlobUrl(id);
    window.open(url, '_blank');
  };

  const onDownload = async (id: number, filename: string) => {
    await downloadAttachment(id, filename);
  };

  const onDelete = async (id: number) => {
    await deleteAttachment(id);
    message.success('附件已删除');
    load();
    onChanged();
  };

  const onUpload = async () => {
    if (!fileList.length || archiveId == null) return;
    setUploading(true);
    try {
      for (const f of fileList) {
        if (f.originFileObj) {
          await uploadAttachment(archiveId, f.originFileObj as File);
        }
      }
      message.success('上传成功');
      setFileList([]);
      load();
      onChanged();
    } catch (err: any) {
      message.error(err.response?.data?.detail || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const isImage = (contentType: string | null) => contentType?.startsWith('image/');

  return (
    <Drawer
      title="档案详情"
      width={560}
      open={open}
      onClose={onClose}
      loading={loading}
    >
      {archive && (
        <>
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="档案名称">{archive.name}</Descriptions.Item>
            <Descriptions.Item label="分类">
              {archive.category?.name || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="颁发机构">{archive.issuer || '-'}</Descriptions.Item>
            <Descriptions.Item label="颁发日期">
              {archive.issue_date ? dayjs(archive.issue_date).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="有效期至">
              {archive.expire_date ? dayjs(archive.expire_date).format('YYYY-MM-DD') : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="证书编号">{archive.cert_no || '-'}</Descriptions.Item>
            <Descriptions.Item label="等级/成绩">{archive.grade || '-'}</Descriptions.Item>
            <Descriptions.Item label="持有人">{archive.holder || '-'}</Descriptions.Item>
            <Descriptions.Item label="标签">
              {archive.tags.length
                ? archive.tags.map((t) => <Tag key={t.id}>{t.name}</Tag>)
                : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="关联经历">
              {archive.related_experience || '-'}
            </Descriptions.Item>
            <Descriptions.Item label="备注">{archive.remark || '-'}</Descriptions.Item>
          </Descriptions>

          <div style={{ marginTop: 16, marginBottom: 8, fontWeight: 600 }}>附件</div>
          <Upload
            multiple
            fileList={fileList}
            beforeUpload={() => false}
            onChange={({ fileList: fl }) => setFileList(fl)}
            accept=".jpg,.jpeg,.png,.pdf"
          >
            <Button icon={<UploadOutlined />}>选择附件</Button>
          </Upload>
          <Button
            type="primary"
            size="small"
            onClick={onUpload}
            loading={uploading}
            disabled={!fileList.length}
            style={{ marginLeft: 8 }}
          >
            上传
          </Button>

          <List
            style={{ marginTop: 16 }}
            dataSource={archive.attachments}
            locale={{ emptyText: <Empty description="暂无附件" /> }}
            renderItem={(att) => (
              <List.Item
                actions={[
                  <Button
                    key="preview"
                    type="link"
                    size="small"
                    icon={<EyeOutlined />}
                    onClick={() => onPreview(att.id)}
                  >
                    预览
                  </Button>,
                  <Button
                    key="download"
                    type="link"
                    size="small"
                    icon={<DownloadOutlined />}
                    onClick={() => onDownload(att.id, att.filename)}
                  >
                    下载
                  </Button>,
                  <Popconfirm
                    key="delete"
                    title="确认删除该附件？"
                    onConfirm={() => onDelete(att.id)}
                  >
                    <Button type="link" size="small" danger icon={<DeleteOutlined />}>
                      删除
                    </Button>
                  </Popconfirm>,
                ]}
              >
                <List.Item.Meta
                  avatar={
                    isImage(att.content_type) ? (
                      <FileImageOutlined style={{ fontSize: 24, color: '#1890ff' }} />
                    ) : (
                      <FilePdfOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />
                    )
                  }
                  title={att.filename}
                  description={`${formatSize(att.file_size)} · ${dayjs(att.created_at).format(
                    'YYYY-MM-DD HH:mm',
                  )}`}
                />
              </List.Item>
            )}
          />
        </>
      )}
    </Drawer>
  );
}
