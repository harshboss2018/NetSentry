import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Network, Wifi, GitBranch,
  FlaskConical, ShieldAlert, Calculator, Settings, Shield
} from 'lucide-react'
import { useAppStore } from '../../store/appStore'

const NAV_ITEMS = [
  { to: '/',           icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/topology',   icon: Network,          label: 'Topology' },
  { to: '/connections',icon: Wifi,             label: 'Connections' },
  { to: '/routing',    icon: GitBranch,        label: 'Routing Lab' },
  { to: '/performance',icon: FlaskConical,     label: 'Perf Lab' },
  { to: '/security',   icon: ShieldAlert,      label: 'Security' },
  { to: '/tools',      icon: Calculator,       label: 'IP / DNS' },
  { to: '/settings',   icon: Settings,         label: 'Settings' },
]

export default function Sidebar() {
  const wsConnected = useAppStore(s => s.wsConnected)
  const metrics = useAppStore(s => s.metrics)

  return (
    <aside style={{
      width: 220,
      minWidth: 220,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      position: 'fixed',
      top: 0, left: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: '20px 20px 16px',
        borderBottom: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <div style={{
          width: 34, height: 34,
          background: 'linear-gradient(135deg, #14b3f5, #22d3a0)',
          borderRadius: 8,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Shield size={18} color="#000" strokeWidth={2.5} />
        </div>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, lineHeight: 1.2 }}>NetSentry</div>
          <div style={{ fontSize: 10, color: 'var(--text-muted)', letterSpacing: '0.05em' }}>NETWORK LAB</div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 8px', overflowY: 'auto' }}>
        {NAV_ITEMS.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '9px 12px',
              borderRadius: 8,
              margin: '2px 0',
              textDecoration: 'none',
              fontSize: 13,
              fontWeight: isActive ? 600 : 400,
              color: isActive ? 'var(--brand)' : 'var(--text-secondary)',
              background: isActive ? 'var(--brand-dim)' : 'transparent',
              transition: 'all 0.15s',
            })}
            className="sidebar-link"
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Status footer */}
      <div style={{
        padding: '12px 16px',
        borderTop: '1px solid var(--border)',
        fontSize: 11,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <div className={`status-dot ${wsConnected ? 'online' : 'offline'}`} />
          <span style={{ color: 'var(--text-secondary)' }}>
            {wsConnected ? 'Backend connected' : 'Backend offline'}
          </span>
        </div>
        {metrics && (
          <div style={{ color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span>CPU: {metrics.cpu_percent}%</span>
            <span>RAM: {metrics.memory_percent}%</span>
          </div>
        )}
      </div>
    </aside>
  )
}
