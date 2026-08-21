import request from './request';

export interface CategoryCount {
  category_id: number;
  category_name: string;
  count: number;
}

export interface DashboardStats {
  total_archives: number;
  expiring_count: number;
  expired_count: number;
  attachment_count: number;
  category_distribution: CategoryCount[];
}

export async function getStats(): Promise<DashboardStats> {
  const { data } = await request.get('/dashboard/stats');
  return data;
}
