import { useEffect, useState } from 'react'
import { useAppStore } from '../store/appStore'
import { RefreshCw, Monitor, Wifi } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

function ClientRow({ client, proto }) {
  const since = client.connected_at
    ? formatDistanceToNow(new Date(client.connected_at), { addSuffix: true })
    : '—'
  return (
    <tr>
      <td><span className={`pill ${proto === 'TCP' ? 'pill-info' : 'pill-warning'}`}>{proto}</span></td>
      <td className="mono">{client.ip}</td>
      <td className="mono">{client.port}</td>
      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{since}</td>
      <td className="mono" style={{ fontSize: 12 }}>
        {proto === 'TCP'
          ? `${client.messages || 0} msgs / ${client.bytes_received || 0} B`
          : `${client.datagrams || 0} dgrams / ${client.bytes_received || 0} B`
        }
      </td>
      <td><span className="pill pill-success">connected</span></td>
      <td>
        <span style={{ fontSize: 10, color: 'var(--text-muted)' }}
          data-tooltip="Real socket connection">real</span>
      </td>
    </tr>
  )
}

export default function Connections() {
  const [data, setData] = useState({ tcp: [], udp: [], stats: {} })
  const [loading, setLoading] = useState(true)
  const events = useAppStore(s => s.events)

  const fetchConnections = () => {
    setLoading(true)
    fetch('/api/v1/connections')
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }

  useEffect(() => { fetchConnections() }, [])
  // Refresh whenever a connection event arrives
  useEffect(() => {
    if (events[0]?.category === 'connection') fetchConnections()
  }, [events[0]])

  const allClients = [
    ...data.tcp.map(c => ({ ...c, _proto: 'TCP' })),
    ...data.udp.map(c => ({ ...c, _proto: 'UDP' })),
  ]

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Live Connections</h1>
          <p className="page-subtitle">Real TCP (port 9001) and UDP (port 9002) clients — actual socket data</p>
        </div>
        <button className="btn btn-ghost" onClick={fetchConnections}>
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'TCP Clients', value: data.stats.tcp_clients || 0, icon: Monitor, color: 'var(--brand)' },
          { label: 'UDP Clients', value: data.stats.udp_clients || 0, icon: Wifi,    color: 'var(--orange)' },
          { label: 'Total',       value: data.stats.total || 0,       icon: Monitor, color: 'var(--green)' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="metric-card" style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: 8, background: `${color}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Icon size={18} color={color} />
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
              <div style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Client table */}
      <div className="glass" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
          <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Active Clients</h2>
          <span className="pill pill-info">{allClients.length}</span>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 'auto' }}>data_source: real</span>
        </div>
        {allClients.length === 0 ? (
          <div className="empty-state">
            <Wifi size={32} />
            <p>No clients connected. Run <code className="mono">python client/tcp_client.py</code> to connect.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="ns-table">
              <thead>
                <tr>
                  <th>Proto</th><th>IP</th><th>Port</th><th>Connected</th><th>Activity</th><th>Status</th><th>Source</th>
                </tr>
              </thead>
              <tbody>
                {allClients.map((c, i) => <ClientRow key={i} client={c} proto={c._proto} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* How to connect */}
      <div className="glass" style={{ padding: 20, marginTop: 16 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600 }}>How to Connect</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Same laptop (TCP)</div>
            <div className="mono" style={{ background: 'var(--bg-base)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
              python client/tcp_client.py
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Another laptop on LAN (UDP)</div>
            <div className="mono" style={{ background: 'var(--bg-base)', padding: '8px 12px', borderRadius: 6, fontSize: 12 }}>
              python udp_client.py --host &lt;your-IP&gt;
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
