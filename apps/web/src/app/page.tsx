"use client";

import { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function Dashboard() {
  const [machines, setMachines] = useState([
    { id: "wincvex-dc", name: "WinCVEx DC" },
    { id: "wincvex-host-b", name: "Host B" },
    { id: "wincvex-host-c", name: "Host C" },
  ]);
  const [selected, setSelected] = useState("wincvex-dc");
  const [vulns, setVulns] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  useEffect(() => {
    fetchVulns(selected);
    connectLogs(selected);
  }, [selected]);

  async function fetchVulns(machine: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/machines/${machine}/vulns`);
      if (res.ok) {
        const data = await res.json();
        setVulns(data);
      } else {
        setVulns([]);
      }
    } catch (err) {
      console.error(err);
      setVulns([]);
    } finally {
      setLoading(false);
    }
  }

  async function toggleVuln(vulnId: string) {
    try {
      await fetch(`/api/vulns/${vulnId}/toggle`, { method: "POST" });
      fetchVulns(selected);
    } catch (e) {
      console.error("Failed to toggle vuln", e);
    }
  }

  function connectLogs(machine: string) {
    const ws = new WebSocket(`ws://localhost:8000/api/ws/logs?machine=${machine}`);
    ws.onmessage = (msg) => setLogs((prev) => [...prev.slice(-50), msg.data]);
    ws.onerror = () => setLogs((prev) => [...prev, "⚠️ Log stream error"]);
    return () => ws.close();
  }

  return (
    <div className="grid grid-cols-12 gap-4 p-6 bg-gray-950 text-white min-h-screen">
      {/* Machines */}
      <Card className="col-span-2 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Machines</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {machines.map((m) => (
            <Button
              key={m.id}
              variant={m.id === selected ? "default" : "secondary"}
              className="w-full"
              onClick={() => setSelected(m.id)}
            >
              {m.name}
            </Button>
          ))}
        </CardContent>
      </Card>

      {/* Vulnerabilities */}
      <Card className="col-span-4 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Vulnerabilities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="animate-spin" />
            </div>
          ) : vulns.length > 0 ? (
            vulns.map((v) => (
              <motion.div
                key={v.id}
                whileHover={{ scale: 1.02 }}
                className="flex items-center justify-between bg-gray-800 p-3 rounded-xl"
              >
                <div>
                  <h4 className="font-semibold">{v.name}</h4>
                  <p className="text-sm text-gray-400">{v.description}</p>
                </div>
                <Button
                  size="sm"
                  variant={v.enabled ? "destructive" : "default"}
                  onClick={() => toggleVuln(v.id)}
                >
                  {v.enabled ? "Disable" : "Enable"}
                </Button>
              </motion.div>
            ))
          ) : (
            <p className="text-gray-500 text-center">No vulnerabilities found.</p>
          )}
        </CardContent>
      </Card>

      {/* Terminal */}
      <Card className="col-span-6 bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle>Terminal</CardTitle>
        </CardHeader>
        <CardContent className="font-mono text-sm bg-black text-green-400 rounded p-2 h-64 overflow-y-auto">
          {logs.length === 0
            ? "Waiting for logs..."
            : logs.map((line, i) => <div key={i}>{line}</div>)}
        </CardContent>
      </Card>

      {/* Logs & Metrics */}
      <Card className="col-span-12 bg-gray-900 border-gray-800 mt-4">
        <CardHeader>
          <CardTitle>Logs & Metrics</CardTitle>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <p className="text-gray-500 text-center">No logs available.</p>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              <div className="bg-gray-800 p-4 rounded-xl">
                <h4 className="font-semibold">CPU Usage</h4>
                <p className="text-green-400 text-lg">27%</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl">
                <h4 className="font-semibold">Memory</h4>
                <p className="text-green-400 text-lg">2.1 GB / 8 GB</p>
              </div>
              <div className="bg-gray-800 p-4 rounded-xl">
                <h4 className="font-semibold">Network</h4>
                <p className="text-green-400 text-lg">512 KB/s</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
