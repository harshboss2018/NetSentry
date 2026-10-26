import { useAppStore } from '../../store/appStore'
import { X, CheckCircle, AlertTriangle, Info, XCircle } from 'lucide-react'

const ICONS = {
  success: CheckCircle,
  warning: AlertTriangle,
  error:   XCircle,
  info:    Info,
}
const COLORS = {
  success: 'var(--green)',
  warning: 'var(--yellow)',
  error:   'var(--red)',
  info:    'var(--brand)',
}

export default function ToastContainer() {
  const notifications = useAppStore(s => s.notifications)
  const removeNotification = useAppStore(s => s.removeNotification)

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24,
      display: 'flex', flexDirection: 'column', gap: 8,
      zIndex: 1000, maxWidth: 320,
    }}>
      {notifications.map(n => {
        const Icon = ICONS[n.variant] || Info
        const color = COLORS[n.variant] || 'var(--brand)'
        return (
          <div key={n.id} className="glass fade-in" style={{
            display: 'flex', alignItems: 'flex-start', gap: 10,
            padding: '12px 14px',
            borderLeft: `3px solid ${color}`,
            minWidth: 240,
          }}>
            <Icon size={16} color={color} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1 }}>
              {n.title && <div style={{ fontWeight: 600, fontSize: 13 }}>{n.title}</div>}
              {n.message && <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 2 }}>{n.message}</div>}
            </div>
            <button onClick={() => removeNotification(n.id)} style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--text-muted)', padding: 0, flexShrink: 0,
            }}>
              <X size={14} />
            </button>
          </div>
        )
      })}
    </div>
  )
}
