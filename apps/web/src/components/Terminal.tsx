// src/components/Terminal.tsx
'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from "react";

type TerminalProps = {
  host: string | null;
  apiBase?: string;
  height?: number;
};

type Msg =
  | { type: "line"; text: string }
  | { type: "status"; text: string }
  | { type: "error"; text: string };

export default function Terminal({ host, apiBase, height = 280 }: TerminalProps) {
  const [lines, setLines] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [connected, setConnected] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);
  const [histIdx, setHistIdx] = useState<number>(-1);
  const [base, setBase] = useState<string>("");

  const wsRef = useRef<WebSocket | null>(null);
  const viewRef = useRef<HTMLDivElement | null>(null);

  // ✅ Safe window access
  useEffect(() => {
    if (typeof window !== "undefined") {
      const origin = window.location;
      const wsProto = origin.protocol === "https:" ? "wss:" : "ws:";
      setBase(`${wsProto}//${origin.host}`);
    }
  }, [apiBase]);

  const wsUrl = useMemo(() => {
    if (!host || !base) return null;
    return `${base}/api/ws?host=${encodeURIComponent(host)}`;
  }, [base, host]);

  // Auto-scroll on new output
  useEffect(() => {
    const el = viewRef.current;
    if (!el) return;
  }, [lines]);

  const append = useCallback((msg: string) => {
    setLines((prev) => [...prev, msg]);
  }, []);

  const connect = useCallback(() => {
    if (!wsUrl) return;
    setConnecting(true);
    setErr(null);

    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        setConnecting(false);
        setConnected(true);
        append(`✅ Connected to ${host}`);
      };

      #ws.onmessage = (ev) => {
        try {
          const data: Msg = JSON.parse(ev.data);
          if (data.type === "line") append(data.text);
          else if (data.type === "status") append(`ℹ️ ${data.text}`);
          else if (data.type === "error") append(`⚠️ ${data.text}`);
        } catch {
          append(String(ev.data));
        }
      };

      ws.onerror = () => {
        setErr("WebSocket error");
        append("⚠️ WebSocket error");
      };

      ws.onclose = () => {
        setConnected(false);
        append("🔌 Disconnected");
      };
    } catch (e: any) {
      setErr(e?.message ?? "Failed to connect");
      setConnecting(false);
      setConnected(false);
    }
  }, [append, host, wsUrl]);

  // Reconnect when host changes
  useEffect(() => {
    if (wsRef.current) {
      try { wsRef.current.close(); } catch {}
      wsRef.current = null;
    }
    setLines([]);
    setHistIdx(-1);
    if (host) c#onnect();
  }, [host, connect]);

  const send = useCallback(
    (cmd: string) => {
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        append("⚠️ Not connected");
        return;
      }
      append(`$ ${cmd}`);
      wsRef.current.send(JSON.stringify({ type: "command", command: cmd, host: host ?? "" }));
    },
    [append, host]
  );

  const onSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      const cmd = input.trim();
      if (!cmd) return;
      send(cmd);
      setHistory((h) => [cmd, ...h]);
      setHistIdx(-1);
      setInput("");
    },
    [input, send]
  );

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setHistIdx((i) => {
          const next = Math.min(i + 1, history.length - 1);
          setInput(next >= 0 ? history[next] : input);
          return next;
        });
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setHistIdx((i) => {
          const next = Math.max(i - 1, -1);
          setInput(next >= 0 ? history[next] : "");
          return next;
        });
      }
    },
    [history, input]
  );

  return (
    <div className="flex h-full flex-col">
      <div
        ref={viewRef}
        style={{ height }}
        className="w-full overflow-y-auto rounded-md bg-black/95 p-3 font-mono text-sm text-green-300 ring-1 ring-white/10"
      >
        {lines.length === 0 ? (
          <div className="text-yellow-300">
            {connecting
              ? "Connecting…"
              : host
              ? `Ready. Connecting to ${host}…`
              : "Select a machine to start a session."}
            {err ? ` (${err})` : null}
          </div>
        ) : (
          lines.map((l, i) => (
            <div key={i} className="whitespace-pre-wrap">
              {l}
            </div>
          ))
        )}
      </div>

      <form onSubmit={onSubmit} className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={onKeyDown}
          placeholder={connected ? "Enter command (e.g., whoami)" : "Not connected"}
          className="flex-1 rounded-md bg-[#121418] px-3 py-2 text-sm text-white outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-sky-500"
        />
        <button
          type="submit"
          disabled={!connected || !input.trim()}
          className="rounded-md bg-sky-600 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          Run
        </button>
        <button
          type="button"
          onClick={() => setLines([])}
          className="rounded-md bg-zinc-700 px-3 py-2 text-sm text-white"
        >
          Clear
        </button>
      </form>
    </div>
  );
}
