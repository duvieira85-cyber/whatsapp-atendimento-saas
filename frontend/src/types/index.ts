export interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  role: 'super_admin' | 'admin' | 'supervisor' | 'attendant';
  phone: string;
  company: string | null;
  is_active: boolean;
  date_joined: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  document: string;
  phone: string;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Department {
  id: string;
  company: string;
  name: string;
  description: string;
  color: string;
  is_active: boolean;
  order: number;
  member_count: number;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: string;
  company: string;
  name: string;
  phone: string;
  email: string;
  notes: string;
  tags: string[];
  is_blocked: boolean;
  created_at: string;
  updated_at: string;
}

export interface Conversation {
  id: string;
  company: string;
  client: string;
  client_details: Client;
  department: string | null;
  department_name: string | null;
  attendant: string | null;
  attendant_name: string | null;
  status: 'waiting' | 'active' | 'closed' | 'transferred';
  priority: 'normal' | 'high' | 'urgent';
  last_message: string;
  last_message_at: string | null;
  tags: string[];
  notes: string;
  unread_count: number;
  is_bot_active: boolean;
  message_count: number;
  queue_position: number;
  entered_queue_at: string | null;
  started_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  conversation: string;
  sender_type: 'client' | 'attendant' | 'system' | 'bot' | 'internal_note';
  sender: string | null;
  sender_name: string;
  content: string;
  message_type: 'text' | 'image' | 'document' | 'audio' | 'video';
  created_at: string;
}

export interface Integration {
  id: string;
  company: string;
  provider: string;
  name: string;
  is_active: boolean;
  config: Record<string, unknown>;
  credentials: Record<string, unknown>;
  status: string;
  webhook_url: string;
  error_log: string;
  last_sync_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DashboardSummary {
  waiting: number;
  active: number;
  closed: number;
  urgent: number;
  total: number;
}

export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface AuthResponse {
  access: string;
  refresh: string;
  user: User;
}
