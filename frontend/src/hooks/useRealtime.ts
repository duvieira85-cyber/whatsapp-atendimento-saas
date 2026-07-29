import { useEffect, useState, useCallback, useRef } from 'react';
import { RealtimeClient } from '../services/websocket';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface UseRealtimeOptions {
  path: string;
  onEvent?: (data: Record<string, unknown>) => void;
}

interface UseRealtimeResult {
  status: ConnectionStatus;
  connected: boolean;
  disconnect: () => void;
}

export function useRealtime({ path, onEvent }: UseRealtimeOptions): UseRealtimeResult {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const client = new RealtimeClient({
      url: `${import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws'}${path}`,
      token,
      onEvent,
      onStatusChange: setStatus,
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, [path, onEvent]);

  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    status,
    connected: status === 'connected',
    disconnect,
  };
}

export function useConversationRealtime(
  conversationId: string,
  onEvent?: (data: Record<string, unknown>) => void
) {
  return useRealtime({
    path: `/conversations/${conversationId}/`,
    onEvent,
  });
}

export function useQueueRealtime(onEvent?: (data: Record<string, unknown>) => void) {
  return useRealtime({
    path: '/queue/',
    onEvent,
  });
}

export function useCompanyRealtime(onEvent?: (data: Record<string, unknown>) => void) {
  return useRealtime({
    path: '/company/',
    onEvent,
  });
}
