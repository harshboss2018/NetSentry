import { useLocation } from 'react-router-dom'
import { useAppStore } from '../../store/appStore'

const PAGE_TITLES = {
  '/':            { title: 'Dashboard',            subtitle: 'Real-time network overview' },
  '/topology':    { title: 'Network Topology',     subtitle: 'Virtual network graph — simulated' },
  '/connections': { title: 'Live Connections',     subtitle: 'Active TCP & UDP clients — real data' },
  '/routing':     { title: 'Routing & Resilience Lab', subtitle: 'Dijkstra & Distance-Vector routing — simulated' },
  '/performance': { title: 'Performance Lab',      subtitle: 'Latency, throughput & packet loss measurements' },
  '/security':    { title: 'Security & Events',    subtitle: 'Application-level access control & event log' },
  '/tools':       { title: 'IP & DNS Tools',       subtitle: 'Subnet calculator & DNS resolver' },
  '/settings':    { title: 'Settings',             subtitle: 'Configuration & server information' },
}

export default function TopNav() {
  const location = useLocation()
  const wsConnected = useAppStore(s => s.wsConnected)
  const metrics = useAppStore(s => s.metrics)
  const info = PAGE_TITLES[location.pathname] || { title: 'NetSentry', subtitle: '' }

  return (
    <header style={{
      height: 60,
      background: 'rgba(15,17,23,0.9)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid var(--border)',
      display: 'flex',
      alignItems: 'center',
      padding: '0 24px',
      gap: 16,
      position: 'sticky',
      top: 0,
      zIndex: 40,
    }}>
      {/* Page info */}
      <div style={{ flex: 1 }}>
        <h1 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>{info.title}</h1>
        <p style={{ margin: 0, fontSize: 11, color: 'var(--text-muted)' }}>{info.subtitle}</p>
      </div>

      {/* Live clients badge */}
      {metrics?.clients && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 6,
          background: 'var(--bg-elevated)',
          border: '1px solid var(--border)',
          borderRadius: 20,
          padding: '4px 12px',
          fontSize: 12,
        }}>
          <div className="live-dot" />
          <span style={{ color: 'var(--text-secondary)' }}>
            {metrics.clients.total} client{metrics.clients.total !== 1 ? 's' : ''}
          </span>
        </div>
      )}

      {/* WS status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6,
        background: 'var(--bg-elevated)',
        border: `1px solid ${wsConnected ? 'rgba(34,211,160,0.3)' : 'rgba(240,79,94,0.3)'}`,
        borderRadius: 20,
        padding: '4px 12px',
        fontSize: 12,
      }}>
        <div className={`status-dot ${wsConnected ? 'online' : 'offline'}`} />
        <span style={{ color: wsConnected ? 'var(--green)' : 'var(--red)' }}>
          {wsConnected ? 'Live' : 'Disconnected'}
        </span>
      </div>
    </header>
  )
}
