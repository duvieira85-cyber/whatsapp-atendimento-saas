import api from './api';
import type { Company } from '../types';

export async function listCompanies(): Promise<{ results: Company[]; count: number }> {
  const response = await api.get('/companies/');
  return response.data;
}

export async function getCompany(id: number): Promise<Company> {
  const response = await api.get<Company>(`/companies/${id}/`);
  return response.data;
}

export async function createCompany(data: Partial<Company>): Promise<Company> {
  const response = await api.post<Company>('/companies/', data);
  return response.data;
}

export async function updateCompany(id: number, data: Partial<Company>): Promise<Company> {
  const response = await api.patch<Company>(`/companies/${id}/`, data);
  return response.data;
}
