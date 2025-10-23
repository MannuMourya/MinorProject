'use client';

import React, { useEffect, useState } from 'react';

interface TerminalProps {
  agentId: string;
}

/**
 * Terminal provides a simple interface for sending allowed commands to an agent
 * and streaming back output.  It also listens to a WebSocket to display
 * simulated log lines.  Commands are only executed if present in the
 * allow‑list enforced by the agent service.
 */
export default function Terminal({ agentId }: TerminalProps) {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [logs, setLogs] = useState<string[]>([]);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!agentId || !token) return;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const ws = new WebSocket(
      `${protocol}//${window.location.host}/api/ws/logs/${agentId}?token=${token}`,
    );
    ws.onmessage = (event) => {
      setLogs((prev) => [...prev.slice(-50), event.data]);
    };
    return () => {
      ws.close();
    };
  }, [agentId, token]);

  const runCommand = async () => {
    if (!command.trim() || !token) return;
    try {
      const res = await fetch(`/api/agents/${agentId}/exec`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ command }),
      });
      const data = await res.json();
      if (res.ok) {
        setOutput((prev) => [...prev, String(data.output ?? '')]);
      } else {
        setOutput((prev) => [...prev, data.detail || 'Error']);
      }
    } catch (err: any) {
      setOutput((prev) => [...prev, 'Failed to execute command']);
    } finally {
      setCommand('');
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto bg-black text-green-400 font-mono p-2 mb-2 rounded-md">
        {output.map((line, idx) => (
          <pre key={idx}>{line}</pre>
        ))}
        {logs.map((line, idx) => (
          <pre key={`log-${idx}`} className="text-yellow-400">
            {line}
          </pre>
        ))}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runCommand();
        }}
        className="flex"
      >
        <input
          className="flex-1 p-2 rounded-l-md text-black"
          value={command}
          onChange={(e) => setCommand(e.target.value)}
          placeholder="Enter command (ls, whoami, uptime)"
        />
        <button type="submit" className="btn rounded-l-none">
          Run
        </button>
      </form>
    </div>
  );
}