// src/app/page.tsx
'use client';
export const dynamic = 'force-dynamic';
export const revalidate = 0; // disable prerendering

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Terminal from "@/components/Terminal";

type Machine = { id: string; name: string };
type Vuln = { key: string; title: string; description: string; enabled: boolean; fix: string };

const MACHINES: Machine[] = [
  { id: "wincvex-dc", name: "WinCVEx DC" },
  { id: "wincvex-host-b", name: "Host B" },
  { id: "wincvex-host-c", name: "Host C" },
];

export default function Dashboard() {
  const [selected, setSelected] = useState<Machine | null>(MACHINES[0]);
  const [vulns, setVulns] = useState<Vuln[] | null>(null);
  const [loadingV, setLoadingV] = useState(false);
  const [apiBase, setApiBase] = useState<string>("");

  // ✅ Safe window usage only inside effect
  useEffect(() => {
    if (typeof window !== "undefined") {
      setApiBase(window.location.origin);
    }
  }, []);

  useEffect(() => {
    const load = async () => {
      if (!selected || !apiBase) return;
      setLoadingV(true);
      try {
        const res = await fetch(`${apiBase}/api/machines/${selected.id}/vulns`, { cache: "no-store" });
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Vuln[];
        setVulns(data);
      } catch {
        setVulns([]);
      } finally {
        setLoadingV(false);
      }
    };
    load();
  }, [selected, apiBase]);

  const toggleVuln = async (v: Vuln) => {
    if (!selected || !apiBase) return;
    const url = `${apiBase}/api/machines/${selected.id}/vulns/${v.key}/${v.enabled ? "disable" : "enable"}`;
    await fetch(url, { method: "POST" }).catch(() => {});
    const res = await fetch(`${apiBase}/api/machines/${selected.id}/vulns`, { cache: "no-store" }).catch(() => null);
    const data = (await res?.json().catch(() => null)) as Vuln[] | null;
    setVulns(data ?? []);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="grid grid-cols-12 gap-6">
        {/* Machines */}
        <Card className="col-span-3 bg-[#0f131a]">
          <CardHeader>
            <CardTitle>Machines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {MACHINES.map((m) => (
              <Button
                key={m.id}
                variant={selected?.id === m.id ? "default" : "secondary"}
                className="w-full justify-start"
                onClick={() => setSelected(m)}
              >
                {m.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Vulnerabilities */}
        <Card className="col-span-5 bg-[#0f131a]">
          <CardHeader>
            <CardTitle>Vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {loadingV ? (
              <div className="text-sm text-zinc-400">Loading…</div>
            ) : !vulns || vulns.length === 0 ? (
              <div className="text-sm text-zinc-400">No vulnerabilities found.</div>
            ) : (
              vulns.map((v) => (
                <div
                  key={v.key}
                  className="flex items-start justify-between rounded-md border border-white/10 p-3"
                >
                  <div>
                    <div className="font-medium">{v.title}</div>
                    <div className="text-sm text-zinc-400">{v.description}</div>
                    {v.fix && <div className="mt-1 text-xs text-emerald-400">Fix: {v.fix}</div>}
                  </div>
                  <Button onClick={() => toggleVuln(v)} variant={v.enabled ? "destructive" : "default"}>
                    {v.enabled ? "Disable" : "Enable"}
                  </Button>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* Terminal */}
        <Card className="col-span-4 bg-[#0f131a]">
          <CardHeader>
            <CardTitle>Terminal</CardTitle>
          </CardHeader>
          <CardContent>
            <Terminal host={selected?.id ?? null} />
          </CardContent>
        </Card>
      </div>

      {/* Logs & Metrics */}
      <Card className="bg-[#0f131a]">
        <CardHeader>
          <CardTitle>Logs &amp; Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4">
          <div className="rounded-md border border-white/10 p-4">
            <div className="text-sm text-zinc-400">CPU Usage</div>
            <div className="text-emerald-400 mt-2 text-lg">—</div>
          </div>
          <div className="rounded-md border border-white/10 p-4">
            <div className="text-sm text-zinc-400">Memory</div>
            <div className="text-emerald-400 mt-2 text-lg">—</div>
          </div>
          <div className="rounded-md border border-white/10 p-4">
            <div className="text-sm text-zinc-400">Network</div>
            <div className="text-emerald-400 mt-2 text-lg">—</div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
