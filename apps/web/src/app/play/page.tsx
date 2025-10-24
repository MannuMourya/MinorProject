'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Terminal from '../../components/Terminal';

interface AgentStatus {
  id: string;
  vulnerabilities: Record<string, boolean>;
}

export default function PlayPage() {
  const router = useRouter();
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [selected, setSelected] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    const fetchAgents = async () => {
      try {
        const res = await fetch('/api/agents', {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          setAgents(data.agents);
          if (data.agents.length > 0) {
            setSelected(data.agents[0].id);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchAgents();
  }, [token, router]);

  const toggleVuln = async (agentId: string, vuln: string, enable: boolean) => {
    if (!token) return;
    const path = `/api/agents/${agentId}/vulnerabilities/${vuln}/${enable ? 'enable' : 'disable'}`;
    const res = await fetch(path, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    if (res.ok) {
      // refresh agents
      const data = await res.json();
      setAgents((prev) =>
        prev.map((a) => (a.id === agentId ? { ...a, vulnerabilities: data.vulnerabilities } : a)),
      );
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center">Loading…</div>;
  }
  return (
    <div className="h-full grid grid-cols-12 gap-4 p-4 overflow-hidden">
      <div className="col-span-3 glass p-4 overflow-y-auto">
        <h2 className="text-xl font-semibold mb-2">Machines</h2>
        <ul className="space-y-2">
          {agents.map((agent) => (
            <li
              key={agent.id}
              className={`cursor-pointer p-2 rounded-md ${
                selected === agent.id ? 'bg-accent' : 'bg-white/10'
              }`}
              onClick={() => setSelected(agent.id)}
            >
              {agent.id}
            </li>
          ))}
        </ul>
      </div>
      <div className="col-span-5 glass p-4 flex flex-col">
        <h2 className="text-xl font-semibold mb-2">Vulnerabilities</h2>
        {selected && (
          <ul className="space-y-2">
            {Object.entries(
              agents.find((a) => a.id === selected)?.vulnerabilities || {},
            ).map(([vuln, enabled]) => (
              <li key={vuln} className="flex justify-between items-center p-2 bg-white/5 rounded-md">
                <span className="capitalize">{vuln.replace(/_/g, ' ')}</span>
                <button
                  className="btn px-2 py-1"
                  onClick={() => toggleVuln(selected, vuln, !enabled)}
                >
                  {enabled ? 'Disable' : 'Enable'}
                </button>
              </li>
            ))}
          </ul>
        )}
        {!selected && <p>Select a machine to view vulnerabilities.</p>}
      </div>
      <div className="col-span-4 glass p-4 flex flex-col overflow-hidden">
        <h2 className="text-xl font-semibold mb-2">Terminal</h2>
        {selected ? <Terminal host={selected} /> : <p>Select a machine.</p>}
      </div>
      <div className="col-span-12 glass p-2 overflow-hidden">
        <h2 className="text-xl font-semibold mb-2">Logs &amp; Metrics</h2>
        <iframe
          src="/grafana/"
          className="w-full h-64 border-0 rounded-md"
          title="Grafana"
        />
      </div>
    </div>
  );
}