import api from './api';
import type { Conversation, Message } from '../types';

export async function listConversations(params?: Record<string, unknown>): Promise<{ results: Conversation[]; count: number }> {
  const response = await api.get('/conversations/', { params });
  return response.data;
}

export async function getConversation(id: string): Promise<Conversation> {
  const response = await api.get<Conversation>(`/conversations/${id}/`);
  return response.data;
}

export async function getConversationMessages(id: string, params?: Record<string, unknown>): Promise<{ results: Message[]; count: number }> {
  const response = await api.get(`/conversations/${id}/messages/`, { params });
  return response.data;
}

export async function sendMessage(data: { conversation: string; content: string; message_type?: string }): Promise<Message> {
  const response = await api.post<Message>('/conversations/messages/', data);
  return response.data;
}

export async function assignConversation(id: string, data: { attendant_id?: string; department_id?: string }): Promise<Conversation> {
  const response = await api.post<Conversation>(`/conversations/${id}/assign/`, data);
  return response.data;
}

export async function closeConversation(id: string): Promise<Conversation> {
  const response = await api.post<Conversation>(`/conversations/${id}/close/`);
  return response.data;
}

export async function reopenConversation(id: string): Promise<Conversation> {
  const response = await api.post<Conversation>(`/conversations/${id}/reopen/`);
  return response.data;
}

export async function transferConversation(id: string, data: { attendant_id?: string; department_id?: string; reason?: string }): Promise<Conversation> {
  const response = await api.post<Conversation>(`/conversations/${id}/transfer/`, data);
  return response.data;
}
