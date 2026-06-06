// Native WebSocket Client Wrapper that mimics Socket.IO client interface
class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private listeners: { [event: string]: Function[] } = {};
  private reconnectInterval = 2000;

  constructor(url: string) {
    // Replace http:// with ws://
    this.url = url.replace(/^http/, 'ws');
    this.connect();
  }

  private connect() {
    console.log(`Connecting to WebSocket: ${this.url}`);
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      console.log("WebSocket connected to backend");
      this.trigger('connect', null);
    };

    this.ws.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data);
        if (parsed && typeof parsed === 'object' && 'event' in parsed) {
          this.trigger(parsed.event, parsed.data);
        }
      } catch (e) {
        console.error("Failed to parse WebSocket message:", e);
      }
    };

    this.ws.onclose = () => {
      console.log("WebSocket connection closed. Reconnecting...");
      this.trigger('disconnect', null);
      setTimeout(() => this.connect(), this.reconnectInterval);
    };

    this.ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };
  }

  on(event: string, callback: Function) {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event].push(callback);
  }

  off(event: string, callback?: Function) {
    if (!this.listeners[event]) return;
    if (callback) {
      this.listeners[event] = this.listeners[event].filter(cb => cb !== callback);
    } else {
      delete this.listeners[event];
    }
  }

  emit(event: string, data?: any) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ event, data }));
    } else {
      console.warn(`WebSocket is not connected. Message dropped: ${event}`);
    }
  }

  private trigger(event: string, data: any) {
    const callbacks = this.listeners[event];
    if (callbacks) {
      callbacks.forEach(cb => {
        try {
          cb(data);
        } catch (e) {
          console.error(`Error in WebSocket listener for ${event}:`, e);
        }
      });
    }
  }
}

// The URL of the Rust backend server
const URL = "http://localhost:8000";

export const socket = new WebSocketClient(URL);
