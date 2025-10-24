// apps/web/src/app/page.tsx
"use client";
export const dynamic = "force-dynamic";

import { useEffect, useMemo, useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Terminal from "@/components/Terminal";

type Machine = { id: string; name: string };
type Vuln = {
  key: string;
  title: string;
  description: string;
  enabled: boolean;
  fix: string;
};

type Metrics = {
  cpuPct: number;
  memUsedGb: number;
  memTotalGb: number;
  netKbps: number;
};

const MACHINES: Machine[] = [
  { id: "wincvex-dc", name: "WinCVEx DC" },
  { id: "wincvex-host-b", name: "Host B" },
  { id: "wincvex-host-c", name: "Host C" },
];

export default function Dashboard() {
  const [selected, setSelected] = useState<Machine | null>(MACHINES[0]);

  // ---- Vulnerabilities state ----
  const [vulns, setVulns] = useState<Vuln[] | null>(null);
  const [loadingV, setLoadingV] = useState(false);

  // ---- Metrics state ----
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const metricsTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Base path (through nginx at :8080 we can just use relative /api/*)
  const apiBase = useMemo(() => {
    return "";
  }, []);

  // --- fetch vulnerabilities whenever machine changes ---
  useEffect(() => {
    const loadV = async () => {
      if (!selected) return;
      setLoadingV(true);
      try {
        const res = await fetch(
          `${apiBase}/api/machines/${selected.id}/vulns`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Vuln[];
        setVulns(data);
      } catch {
        setVulns([]);
      } finally {
        setLoadingV(false);
      }
    };
    loadV();
  }, [selected, apiBase]);

  // --- toggle vuln enable/disable ---
  const toggleVuln = async (v: Vuln) => {
    if (!selected) return;
    const action = v.enabled ? "disable" : "enable";
    const url = `${apiBase}/api/machines/${selected.id}/vulns/${v.key}/${action}`;

    try {
      await fetch(url, { method: "POST" });
    } catch {
      // ignore errors for now
    }

    // refresh vulns list after toggle
    try {
      const res = await fetch(
        `${apiBase}/api/machines/${selected.id}/vulns`,
        { cache: "no-store" }
      );
      const data = (await res.json()) as Vuln[];
      setVulns(data);
    } catch {
      /* noop */
    }
  };

  // --- fetch metrics (poll every 5 seconds for the selected machine) ---
  useEffect(() => {
    const fetchMetrics = async () => {
      if (!selected) return;
      try {
        const res = await fetch(
          `${apiBase}/api/machines/${selected.id}/metrics`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as Metrics;
        setMetrics(data);
      } catch {
        setMetrics(null);
      }
    };

    // initial fetch
    fetchMetrics();

    // clear any old timer
    if (metricsTimerRef.current) {
      clearInterval(metricsTimerRef.current);
    }

    // poll every 5 seconds
    metricsTimerRef.current = setInterval(fetchMetrics, 5000);

    // cleanup when machine changes or component unmounts
    return () => {
      if (metricsTimerRef.current) {
        clearInterval(metricsTimerRef.current);
      }
    };
  }, [selected, apiBase]);

  return (
    <div className="p-6 space-y-6 bg-[#0d3b62] min-h-screen text-white">
      <div className="grid grid-cols-12 gap-6">
        {/* ---------------- Machines ---------------- */}
        <Card className="col-span-3 bg-[#0f131a] text-white border border-white/10 shadow-xl shadow-black/50">
          <CardHeader className="border-b border-white/10">
            <CardTitle>Machines</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {MACHINES.map((m) => (
              <Button
                key={m.id}
                variant={selected?.id === m.id ? "default" : "secondary"}
                className={`w-full justify-start text-left font-medium ${
                  selected?.id === m.id
                    ? "bg-sky-600 hover:bg-sky-500 text-white"
                    : "bg-zinc-700 hover:bg-zinc-600 text-zinc-100"
                }`}
                onClick={() => setSelected(m)}
              >
                {m.name}
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* ---------------- Vulnerabilities ---------------- */}
        <Card className="col-span-5 bg-[#0f131a] text-white border border-white/10 shadow-xl shadow-black/50">
          <CardHeader className="border-b border-white/10">
            <CardTitle>Vulnerabilities</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pt-4">
            {loadingV ? (
              <div className="text-sm text-zinc-400">Loading…</div>
            ) : !vulns || vulns.length === 0 ? (
              <div className="text-sm text-zinc-400">
                No vulnerabilities found.
              </div>
            ) : (
              vulns.map((v) => (
                <div
                  key={v.key}
                  className="flex flex-col gap-2 rounded-md border border-white/10 bg-[#1a1d24] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="font-semibold text-white">
                        {v.title}
                        {v.enabled ? (
                          <span className="ml-2 rounded bg-red-600/20 px-2 py-[2px] text-[10px] font-bold text-red-400 ring-1 ring-red-600/40">
                            ACTIVE
                          </span>
                        ) : (
                          <span className="ml-2 rounded bg-emerald-600/20 px-2 py-[2px] text-[10px] font-bold text-emerald-400 ring-1 ring-emerald-600/40">
                            FIXED
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-zinc-400">
                        {v.description}
                      </div>
                    </div>

                    <Button
                      onClick={() => toggleVuln(v)}
                      variant={v.enabled ? "destructive" : "default"}
                      className={
                        v.enabled
                          ? "bg-red-600 hover:bg-red-500 text-white"
                          : "bg-emerald-600 hover:bg-emerald-500 text-white"
                      }
                    >
                      {v.enabled ? "Disable" : "Enable"}
                    </Button>
                  </div>

                  {v.fix && (
                    <div className="rounded-md bg-black/30 p-2 text-xs text-emerald-400 ring-1 ring-emerald-600/40">
                      <span className="font-semibold text-emerald-300">
                        Remediation:
                      </span>{" "}
                      {v.fix}
                    </div>
                  )}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        {/* ---------------- Terminal ---------------- */}
        <Card className="col-span-4 bg-[#0f131a] text-white border border-white/10 shadow-xl shadow-black/50">
          <CardHeader className="border-b border-white/10">
            <CardTitle>Terminal</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <Terminal host={selected?.id ?? null} />
          </CardContent>
        </Card>
      </div>

      {/* ---------------- Logs & Metrics ---------------- */}
      <Card className="bg-[#0f131a] text-white border border-white/10 shadow-xl shadow-black/50">
        <CardHeader className="border-b border-white/10">
          <CardTitle>Logs &amp; Metrics</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-3 gap-4 pt-4">
          {/* CPU */}
          <div className="rounded-md border border-white/10 bg-[#1a1d24] p-4">
            <div className="text-sm text-zinc-400">CPU Usage</div>
            <div className="mt-2 flex items-baseline gap-2">
              <div className="text-emerald-400 text-lg font-semibold">
                {metrics ? `${metrics.cpuPct}%` : "—"}
              </div>
              <div className="h-1 flex-1 rounded bg-emerald-500/30">
                <div
                  className="h-1 rounded bg-emerald-400"
                  style={{
                    width: metrics ? `${metrics.cpuPct}%` : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Memory */}
          <div className="rounded-md border border-white/10 bg-[#1a1d24] p-4">
            <div className="text-sm text-zinc-400">Memory</div>
            <div className="mt-2 flex flex-col">
              <div className="text-emerald-400 text-lg font-semibold">
                {metrics
                  ? `${metrics.memUsedGb} GB / ${metrics.memTotalGb} GB`
                  : "—"}
              </div>
              <div className="mt-2 h-1 w-full rounded bg-emerald-500/30">
                <div
                  className="h-1 rounded bg-emerald-400"
                  style={{
                    width: metrics
                      ? `${
                          (metrics.memUsedGb / metrics.memTotalGb) * 100
                        }%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>

          {/* Network */}
          <div className="rounded-md border border-white/10 bg-[#1a1d24] p-4">
            <div className="text-sm text-zinc-400">Network</div>
            <div className="mt-2 flex flex-col">
              <div className="text-emerald-400 text-lg font-semibold">
                {metrics ? `${metrics.netKbps} KB/s` : "—"}
              </div>
              <div className="mt-2 h-1 w-full rounded bg-emerald-500/30">
                <div
                  className="h-1 rounded bg-emerald-400"
                  style={{
                    width: metrics
                      ? `${Math.min(metrics.netKbps / 20, 100)}%`
                      : "0%",
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
