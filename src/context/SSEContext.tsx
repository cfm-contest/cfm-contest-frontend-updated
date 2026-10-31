"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
  type ReactNode,
} from "react";

import { useAuth } from "./AuthContext";

type SSEHandler = (data: any) => void;

type SSEContextType = {
  subscribe: (
    event: string,
    handler: SSEHandler
  ) => () => void;
};

const SSE_SERVER_URL =
  process.env.NEXT_PUBLIC_SSE_SERVER_URL;

const SSEContext = createContext<SSEContextType | null>(null);

export function SSEProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { isAuthenticated } = useAuth();

  const sourceRef = useRef<EventSource | null>(null);

  const listenersRef = useRef(
    new Map<string, Set<SSEHandler>>()
  );

  useEffect(() => {
    if (!isAuthenticated || !SSE_SERVER_URL) {
      sourceRef.current?.close();
      sourceRef.current = null;
      return;
    }

    const source = new EventSource(SSE_SERVER_URL, {
      withCredentials: true,
    });

    sourceRef.current = source;

    // EventSource automatically retries when possible.
    // Avoid repeated console errors during reconnection.
    source.onerror = () => {};

    const events = [
      "queued",
      "testcase",
      "final",
      "error",
      "xp",
      "notification",
    ];

    const handlers = new Map<string, EventListener>();

    events.forEach((eventName) => {
      const listener: EventListener = (event) => {
        const message = event as MessageEvent;

        let data: any;

        try {
          data = JSON.parse(message.data);
        } catch {
          data = message.data;
        }

        const subscribers =
          listenersRef.current.get(eventName);

        subscribers?.forEach((handler) => {
          try {
            handler(data);
          } catch {
            return;
          }
        });
      };

      handlers.set(eventName, listener);
      source.addEventListener(eventName, listener);
    });

    return () => {
      handlers.forEach((listener, eventName) => {
        source.removeEventListener(eventName, listener);
      });

      source.close();

      if (sourceRef.current === source) {
        sourceRef.current = null;
      }
    };
  }, [isAuthenticated]);

  const subscribe = useCallback(
    (eventName: string, handler: SSEHandler) => {
      let subscribers =
        listenersRef.current.get(eventName);

      if (!subscribers) {
        subscribers = new Set<SSEHandler>();
        listenersRef.current.set(eventName, subscribers);
      }

      subscribers.add(handler);

      return () => {
        const currentSubscribers =
          listenersRef.current.get(eventName);

        currentSubscribers?.delete(handler);

        if (currentSubscribers?.size === 0) {
          listenersRef.current.delete(eventName);
        }
      };
    },
    []
  );

  return (
    <SSEContext.Provider value={{ subscribe }}>
      {children}
    </SSEContext.Provider>
  );
}

export function useSSE() {
  const context = useContext(SSEContext);

  if (!context) {
    throw new Error(
      "useSSE SSEProvider ichida ishlatilishi kerak"
    );
  }

  return context;
}
