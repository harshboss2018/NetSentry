import { useState, useEffect } from 'react'
import { Info, Server, Wifi, Shield, ExternalLink } from 'lucide-react'

export default function SettingsPage() {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    fetch('/api/v1/status').then(r => r.json()).then(setStatus).catch(() => {})
  }, [])

  const infoItems = status ? [
    { label: 'App Name',    value: 'NetSentry v1.0.0' },
    { label: 'Backend',     value: `FastAPI ${status.version}` },
    { label: 'TCP Server',  value: `0.0.0.0:${status.tcp_port}` },
    { label: 'UDP Server',  value: `0.0.0.0:${status.udp_port}` },
    { label: 'DB',          value: 'SQLite (netsentry.db)' },
    { label: 'CPU',         value: `${status.system?.cpu_percent}%` },
    { label: 'Memory',      value: `${status.system?.memory_percent}%` },
    { label: 'Uptime',      value: `${Math.floor((status.system?.uptime_seconds || 0) / 60)} min` },
  ] : []

  return (
    <div className="fade-in">
      <div className="page-header">
        <h1 className="page-title">Settings & About</h1>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 900 }}>
        {/* About */}
        <div className="glass" style={{ padding: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, #14b3f5, #22d3a0)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Shield size={22} color="#000" strokeWidth={2.5} />
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 700 }}>NetSentry</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Network Monitoring & Resilience Lab</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.6 }}>
            A full-stack network monitoring and simulation platform built for Computer Engineering coursework at Army Institute of Technology, Pune under SPPU curriculum.
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.6, marginTop: 12 }}>
            Features real TCP/UDP socket programming, virtual network topology with Dijkstra and Bellman-Ford routing, 
            performance measurement labs, application-level security rules, and IPv4/DNS utilities.
          </p>
          <div style={{ marginTop: 16, padding: '12px 16px', background: 'var(--bg-elevated)', borderRadius: 8, fontSize: 12, color: 'var(--text-secondary)' }}>
            <strong>Stack:</strong> Python · FastAPI · WebSockets · SQLite · React · Vite · Tailwind CSS · React Flow · Recharts
          </div>
        </div>

        {/* Server Status */}
        <div className="glass" style={{ padding: 24 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Server size={16} /> Server Information
          </h2>
          {infoItems.length === 0 ? (
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>Backend offline — start the server to see info.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {infoItems.map(({ label, value }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--border)', paddingBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>{label}</span>
                  <span className="mono" style={{ fontSize: 12 }}>{value}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Multi-laptop demo instructions */}
        <div className="glass" style={{ padding: 24, gridColumn: '1 / -1' }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Wifi size={16} /> Multi-Laptop Demo Setup
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Step 1 — Start backend (host laptop)</div>
              <div className="mono" style={{ background: 'var(--bg-base)', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                cd backend<br />
                .\venv\Scripts\uvicorn main:app --host 0.0.0.0 --port 8000
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Step 2 — Open firewall ports (PowerShell as Admin)</div>
              <div className="mono" style={{ background: 'var(--bg-base)', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                netsh advfirewall firewall add rule name="NetSentry" dir=in action=allow protocol=TCP localport=8000,9001 profile=private<br />
                netsh advfirewall firewall add rule name="NetSentryUDP" dir=in action=allow protocol=UDP localport=9002 profile=private
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Step 3 — Connect from another laptop (TCP)</div>
              <div className="mono" style={{ background: 'var(--bg-base)', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                python tcp_client.py --host &lt;HOST-LAN-IP&gt;
              </div>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>Step 4 — View dashboard on another laptop</div>
              <div className="mono" style={{ background: 'var(--bg-base)', padding: '10px 14px', borderRadius: 8, fontSize: 12 }}>
                http://&lt;HOST-LAN-IP&gt;:8000
              </div>
            </div>
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(245,197,24,0.1)', border: '1px solid rgba(245,197,24,0.3)', borderRadius: 8, fontSize: 12, color: 'var(--yellow)' }}>
            ⚠️ Find your LAN IP with: <code>ipconfig</code> — look for "IPv4 Address" under your WiFi adapter.
          </div>
        </div>
      </div>
    </div>
  )
}
