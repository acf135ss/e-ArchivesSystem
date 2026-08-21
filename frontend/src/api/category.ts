import request from './request';
import type { CategoryOut } from './archive';

export interface CategoryPayload {
  name: string;
  description?: string | null;
  sort?: number;
  is_active?: number;
}

export async function listCategories(activeOnly = false): Promise<CategoryOut[]> {
  const { data } = await request.get('/categories', {
    params: { active_only: activeOnly },
  });
  return data;
}

export async function createCategory(payload: CategoryPayload): Promise<CategoryOut> {
  const { data } = await request.post('/categories', payload);
  return data;
}

export async function updateCategory(
  id: number,
  payload: Partial<CategoryPayload>,
): Promise<CategoryOut> {
  const { data } = await request.put(`/categories/${id}`, payload);
  return data;
}

export async function deleteCategory(id: number): Promise<void> {
  await request.delete(`/categories/${id}`);
}
