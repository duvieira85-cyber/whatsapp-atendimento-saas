type EventCallback = (data: Record<string, unknown>) => void;

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';

interface WebSocketConfig {
  url: string;
  token: string;
  onEvent?: EventCallback;
  onStatusChange?: (status: ConnectionStatus) => void;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
}

export class RealtimeClient {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private status: ConnectionStatus = 'disconnected';
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private pingTimer: ReturnType<typeof setInterval> | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnectInterval: 3000,
      maxReconnectAttempts: 20,
      ...config,
    };
  }

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) return;
    this.setStatus('connecting');

    const url = `${this.config.url}?token=${this.config.token}`;
    this.ws = new WebSocket(url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
      this.setStatus('connected');
      this.startPing();
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        this.config.onEvent?.(data);
        this.notifyListeners(data);
      } catch {
        // ignore parse errors
      }
    };

    this.ws.onclose = () => {
      this.stopPing();
      this.setStatus('reconnecting');
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // WebSocket fecha automaticamente após erro; onclose cuidará da reconexão
    };
  }

  disconnect(): void {
    this.reconnectAttempts = this.config.maxReconnectAttempts!;
    this.stopPing();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  on(eventType: string, callback: EventCallback): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType)!.add(callback);
    return () => this.listeners.get(eventType)?.delete(callback);
  }

  getStatus(): ConnectionStatus {
    return this.status;
  }

  private setStatus(status: ConnectionStatus): void {
    this.status = status;
    this.config.onStatusChange?.(status);
  }

  private startPing(): void {
    this.stopPing();
    this.pingTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, 25000);
  }

  private stopPing(): void {
    if (this.pingTimer) {
      clearInterval(this.pingTimer);
      this.pingTimer = null;
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts!) return;
    this.reconnectAttempts++;
    this.reconnectTimer = setTimeout(() => this.connect(), this.config.reconnectInterval);
  }

  private notifyListeners(data: Record<string, unknown>): void {
    const eventType = data.event_type as string;
    if (eventType && this.listeners.has(eventType)) {
      this.listeners.get(eventType)!.forEach((cb) => cb(data));
    }
    if (this.listeners.has('*')) {
      this.listeners.get('*')!.forEach((cb) => cb(data));
    }
  }
}
