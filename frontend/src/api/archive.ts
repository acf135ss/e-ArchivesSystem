import request from './request';

export interface CategoryOut {
  id: number;
  user_id: number;
  name: string;
  description: string | null;
  sort: number;
  is_active: number;
  created_at: string;
}

export interface TagOut {
  id: number;
  name: string;
}

export interface AttachmentOut {
  id: number;
  filename: string;
  file_size: number;
  content_type: string;
  created_at: string;
}

export interface ArchiveOut {
  id: number;
  user_id: number;
  name: string;
  category_id: number;
  issuer: string | null;
  issue_date: string | null;
  expire_date: string | null;
  cert_no: string | null;
  grade: string | null;
  holder: string | null;
  remark: string | null;
  related_experience: string | null;
  category: CategoryOut | null;
  tags: TagOut[];
  attachments: AttachmentOut[];
  created_at: string;
  updated_at: string;
}

export interface ArchivePayload {
  name: string;
  category_id: number;
  issuer?: string | null;
  issue_date?: string | null;
  expire_date?: string | null;
  cert_no?: string | null;
  grade?: string | null;
  holder?: string | null;
  remark?: string | null;
  related_experience?: string | null;
  tags?: string[];
}

export interface ArchiveQuery {
  keyword?: string;
  category_id?: number;
  tag?: string;
  issue_date_from?: string;
  issue_date_to?: string;
  expire_date_from?: string;
  expire_date_to?: string;
  page?: number;
  page_size?: number;
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  page_size: number;
}

export async function listArchives(params: ArchiveQuery): Promise<Page<ArchiveOut>> {
  const { data } = await request.get('/archives', { params });
  return data;
}

export async function getArchive(id: number): Promise<ArchiveOut> {
  const { data } = await request.get(`/archives/${id}`);
  return data;
}

export async function createArchive(payload: ArchivePayload): Promise<ArchiveOut> {
  const { data } = await request.post('/archives', payload);
  return data;
}

export async function updateArchive(id: number, payload: Partial<ArchivePayload>): Promise<ArchiveOut> {
  const { data } = await request.put(`/archives/${id}`, payload);
  return data;
}

export async function deleteArchive(id: number): Promise<void> {
  await request.delete(`/archives/${id}`);
}

export async function listExpiring(): Promise<ArchiveOut[]> {
  const { data } = await request.get('/archives/expiring');
  return data;
}

export async function listExpired(): Promise<ArchiveOut[]> {
  const { data } = await request.get('/archives/expired');
  return data;
}

export async function uploadAttachment(archiveId: number, file: File): Promise<AttachmentOut> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await request.post(`/archives/${archiveId}/attachments`, form);
  return data;
}

export async function deleteAttachment(id: number): Promise<void> {
  await request.delete(`/attachments/${id}`);
}

export async function getAttachmentBlobUrl(id: number): Promise<string> {
  const res = await request.get(`/attachments/${id}/download`, { responseType: 'blob' });
  return URL.createObjectURL(res.data);
}

export async function downloadAttachment(id: number, filename: string): Promise<void> {
  const res = await request.get(`/attachments/${id}/download`, { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportArchives(params: ArchiveQuery): Promise<void> {
  const res = await request.get('/archives/export', { params, responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'archives.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export async function downloadImportTemplate(): Promise<void> {
  const res = await request.get('/archives/import/template', { responseType: 'blob' });
  const url = URL.createObjectURL(res.data);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'import_template.xlsx';
  a.click();
  URL.revokeObjectURL(url);
}

export async function importArchives(file: File): Promise<{ created: number; errors: string[] }> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await request.post('/archives/import', form);
  return data;
}
