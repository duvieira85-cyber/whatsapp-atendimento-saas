import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { RealtimeClient } from '../services/websocket';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface WebSocketContextValue {
  client: RealtimeClient | null;
  status: ConnectionStatus;
  subscribe: (eventType: string, callback: (data: Record<string, unknown>) => void) => () => void;
}

const WebSocketContext = createContext<WebSocketContextValue>({
  client: null,
  status: 'disconnected',
  subscribe: () => () => {},
});

const WS_BASE = import.meta.env.VITE_WS_URL || 'ws://localhost:8000/ws';

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const clientRef = useRef<RealtimeClient | null>(null);

  useEffect(() => {
    const token = localStorage.getItem('access_token');
    if (!token) return;

    const client = new RealtimeClient({
      url: `${WS_BASE}/company/`,
      token,
      onStatusChange: setStatus,
    });

    clientRef.current = client;
    client.connect();

    return () => {
      client.disconnect();
      clientRef.current = null;
    };
  }, []);

  const subscribe = useCallback(
    (eventType: string, callback: (data: Record<string, unknown>) => void) => {
      return clientRef.current?.on(eventType, callback) ?? (() => {});
    },
    []
  );

  return (
    <WebSocketContext.Provider value={{ client: clientRef.current, status, subscribe }}>
      {children}
    </WebSocketContext.Provider>
  );
}

export function useWebSocket() {
  return useContext(WebSocketContext);
}

export function useRealtimeEvent(eventType: string, callback: (data: Record<string, unknown>) => void) {
  const { subscribe } = useWebSocket();
  useEffect(() => {
    return subscribe(eventType, callback);
  }, [eventType, callback, subscribe]);
}
