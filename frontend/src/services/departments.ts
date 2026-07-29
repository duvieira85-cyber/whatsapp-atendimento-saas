import api from './api';
import type { Department } from '../types';

export async function listDepartments(params?: Record<string, unknown>): Promise<{ results: Department[]; count: number }> {
  const response = await api.get('/departments/', { params });
  return response.data;
}

export async function createDepartment(data: Partial<Department>): Promise<Department> {
  const response = await api.post<Department>('/departments/', data);
  return response.data;
}

export async function updateDepartment(id: number, data: Partial<Department>): Promise<Department> {
  const response = await api.patch<Department>(`/departments/${id}/`, data);
  return response.data;
}

export async function deleteDepartment(id: number): Promise<void> {
  await api.delete(`/departments/${id}/`);
}
