"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAppSelector } from "@/src/lib/hooks";

interface SocketContextType {
  socket: WebSocket | null;
  loading: boolean;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  loading: true,
});

export const useSocketContext = () => {
  return useContext(SocketContext);
};

export const SocketProvider = ({ children }: { children: ReactNode }) => {

  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const { profile } = useAppSelector((state) => state.user);

  useEffect(() => {
    if (!process.env.NEXT_PUBLIC_WS_URL) {
      throw new Error(`WebSocket URL is not defined in environment variables.`);
    }

    const token = localStorage.getItem("token");
    if (!token) {
      // eslint-disable-next-line
      setLoading(false);
      return;
    }

    const ws = new WebSocket(`${process.env.NEXT_PUBLIC_WS_URL}?token=${token}`);
    ws.onopen = () => {
      console.log('Connected to WebSocket!');
      setSocket(ws);
      setLoading(false);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
      setLoading(false);
    };

    return () => {
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
      setSocket(null);
      setLoading(true);
    };
  }, [profile]);

  return (
    <SocketContext.Provider value={{ socket, loading }}>
      {children}
    </SocketContext.Provider>
  );
};
