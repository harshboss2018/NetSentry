import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { Activity, Cpu, MemoryStick, Network, Users, Wifi, AlertTriangle, CheckCircle } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

function MetricCard({ icon: Icon, label, value, unit, color, history, sub }) {
  return (
    <div className="metric-card" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: `${color}22`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Icon size={16} color={color} />
          </div>
          <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontWeight: 500 }}>{label}</span>
        </div>
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 700, lineHeight: 1 }}>
          {value ?? '—'}
          {unit && <span style={{ fontSize: 14, color: 'var(--text-muted)', marginLeft: 4 }}>{unit}</span>}
        </div>
        {sub && <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>{sub}</div>}
      </div>
      {history && history.length > 1 && (
        <ResponsiveContainer width="100%" height={40}>
          <LineChart data={history}>
            <Line type="monotone" dataKey="v" stroke={color} strokeWidth={2} dot={false} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11 }}
              formatter={(v) => [`${v}${unit || ''}`, label]}
            />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  )
}

function EventRow({ event }) {
  const severityMap = { info: 'pill-info', warning: 'pill-warning', error: 'pill-error', critical: 'pill-error' }
  const typeLabel = {
    client_connected: 'Connected',
    client_disconnected: 'Disconnected',
    tcp_message: 'TCP Msg',
    udp_datagram: 'UDP',
    security_block: 'Blocked',
    topology_changed: 'Topology',
  }
  return (
    <tr>
      <td style={{ color: 'var(--text-muted)', fontSize: 11 }} className="mono">
        {new Date(event.timestamp).toLocaleTimeString()}
      </td>
      <td>
        <span className={`pill ${severityMap[event.data?.severity] || 'pill-info'}`}>
          {typeLabel[event.type] || event.type}
        </span>
      </td>
      <td style={{ fontSize: 12, color: 'var(--text-secondary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
        {event.data?.message || event.data?.ip || JSON.stringify(event.data)?.slice(0, 60)}
      </td>
      <td style={{ fontSize: 11 }} className="mono">{event.data?.ip || event.data?.client_ip || '—'}</td>
    </tr>
  )
}

export default function Dashboard() {
  const metrics = useAppStore(s => s.metrics)
  const wsConnected = useAppStore(s => s.wsConnected)
  const events = useAppStore(s => s.events)

  const [cpuHistory, setCpuHistory] = useState([])
  const [memHistory, setMemHistory] = useState([])
  const [status, setStatus] = useState(null)

  // Fetch initial status
  useEffect(() => {
    fetch('/api/v1/status')
      .then(r => r.json())
      .then(setStatus)
      .catch(() => {})
  }, [])

  // Build sparkline history from metrics updates
  useEffect(() => {
    if (!metrics) return
    setCpuHistory(h => [...h, { v: metrics.cpu_percent }].slice(-30))
    setMemHistory(h => [...h, { v: metrics.memory_percent }].slice(-30))
  }, [metrics])

  const clients = metrics?.clients || status?.clients

  return (
    <div className="fade-in">
      {/* Status Banner */}
      {!wsConnected && (
        <div style={{
          background: 'var(--red-dim)', border: '1px solid rgba(240,79,94,0.3)',
          borderRadius: 10, padding: '12px 16px', marginBottom: 20,
          display: 'flex', alignItems: 'center', gap: 10, fontSize: 13,
        }}>
          <AlertTriangle size={16} color="var(--red)" />
          <span>Backend disconnected — start the FastAPI server to see live data.</span>
        </div>
      )}

      {/* Metric Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
        <MetricCard icon={Cpu}         label="CPU Usage"     value={metrics?.cpu_percent}    unit="%" color="#14b3f5" history={cpuHistory} />
        <MetricCard icon={MemoryStick} label="Memory"        value={metrics?.memory_percent} unit="%" color="#a78bfa" history={memHistory}
          sub={metrics ? `${metrics.memory_used_mb} / ${metrics.memory_total_mb} MB` : null} />
        <MetricCard icon={Users}       label="TCP Clients"   value={clients?.tcp_clients ?? '—'} color="#22d3a0"
          sub="Real connections" />
        <MetricCard icon={Wifi}        label="UDP Clients"   value={clients?.udp_clients ?? '—'} color="#f97316"
          sub="Real datagrams" />
        <MetricCard icon={Network}     label="Net Received"  value={metrics ? Math.round(metrics.net_bytes_recv / 1024) : '—'} unit="KB" color="#f5c518" />
        <MetricCard icon={Activity}    label="Uptime"        value={metrics ? Math.floor(metrics.uptime_seconds / 60) : '—'} unit="min" color="#22d3a0" />
      </div>

      {/* Network Interfaces */}
      {metrics?.interfaces && Object.keys(metrics.interfaces).length > 0 && (
        <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Network Interfaces</h2>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
            {Object.entries(metrics.interfaces).map(([iface, ip]) => (
              <div key={iface} style={{
                background: 'var(--bg-elevated)', border: '1px solid var(--border)',
                borderRadius: 8, padding: '8px 14px', fontSize: 12,
              }}>
                <div style={{ color: 'var(--text-secondary)', fontSize: 11 }}>{iface}</div>
                <div className="mono" style={{ fontSize: 13, marginTop: 2 }}>{ip}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Server Info */}
      {status && (
        <div className="glass" style={{ padding: 20, marginBottom: 24 }}>
          <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Server Configuration</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { label: 'Status',    value: status.status,   color: 'var(--green)' },
              { label: 'Version',   value: `v${status.version}` },
              { label: 'TCP Port',  value: status.tcp_port, mono: true },
              { label: 'UDP Port',  value: status.udp_port, mono: true },
            ].map(({ label, value, color, mono }) => (
              <div key={label}>
                <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 3 }}>{label}</div>
                <div className={mono ? 'mono' : ''} style={{ fontSize: 13, fontWeight: 500, color: color || 'var(--text-primary)' }}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Live Events Feed */}
      <div className="glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Live Events</h2>
            {wsConnected && <div className="live-dot" />}
          </div>
          <span className="pill pill-info">{events.length}</span>
        </div>

        {events.length === 0 ? (
          <div className="empty-state">
            <CheckCircle size={32} />
            <p>No events yet — connect a TCP/UDP client to see activity.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ns-table">
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Type</th>
                  <th>Message</th>
                  <th>Source IP</th>
                </tr>
              </thead>
              <tbody>
                {events.slice(0, 20).map((e, i) => <EventRow key={i} event={e} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
