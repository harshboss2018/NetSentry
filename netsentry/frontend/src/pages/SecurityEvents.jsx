import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { Plus, Trash2, Filter, ShieldCheck, ShieldAlert, Search } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

export default function SecurityEvents() {
  const [tab, setTab] = useState('events')
  const [events, setEvents] = useState([])
  const [rules, setRules] = useState([])
  const [filter, setFilter] = useState({ category: '', severity: '', source_ip: '' })
  const [newRule, setNewRule] = useState({ rule_type: 'block', target: '', protocol: '*', description: '' })
  const liveEvents = useAppStore(s => s.events)
  const addNotification = useAppStore(s => s.addNotification)

  const fetchEvents = () => {
    const params = new URLSearchParams()
    if (filter.category) params.set('category', filter.category)
    if (filter.severity) params.set('severity', filter.severity)
    if (filter.source_ip) params.set('source_ip', filter.source_ip)
    fetch(`/api/v1/security/events?${params}`)
      .then(r => r.json()).then(setEvents)
  }

  const fetchRules = () => {
    fetch('/api/v1/security/rules').then(r => r.json()).then(setRules)
  }

  useEffect(() => { fetchEvents(); fetchRules() }, [])
  useEffect(() => { if (liveEvents[0]?.category === 'security') fetchEvents() }, [liveEvents[0]])

  const createRule = () => {
    if (!newRule.target.trim()) return
    fetch('/api/v1/security/rules', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newRule),
    }).then(r => r.json()).then(() => {
      fetchRules()
      setNewRule({ rule_type: 'block', target: '', protocol: '*', description: '' })
      addNotification({ title: 'Rule Created', message: `${newRule.rule_type} ${newRule.target}`, variant: 'success' })
    })
  }

  const deleteRule = (id) => {
    fetch(`/api/v1/security/rules/${id}`, { method: 'DELETE' })
      .then(() => { fetchRules(); addNotification({ title: 'Rule Deleted', variant: 'info' }) })
  }

  const sevMap = { info: 'pill-info', warning: 'pill-warning', error: 'pill-error', critical: 'pill-error' }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Security & Events</h1>
          <p className="page-subtitle">Application-level access control (not OS firewall) + searchable event log</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 20 }}>
        {['events', 'rules'].map(t => (
          <button key={t} className={`btn ${tab === t ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t)}>
            {t === 'events' ? <><ShieldAlert size={14} /> Events</> : <><ShieldCheck size={14} /> Rules</>}
          </button>
        ))}
      </div>

      {tab === 'events' && (
        <div>
          {/* Filters */}
          <div className="glass" style={{ padding: 16, marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Category</label>
              <select className="ns-select" value={filter.category} onChange={e => setFilter({ ...filter, category: e.target.value })} style={{ width: '100%' }}>
                <option value="">All</option>
                <option value="connection">Connection</option>
                <option value="security">Security</option>
                <option value="system">System</option>
                <option value="routing">Routing</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Severity</label>
              <select className="ns-select" value={filter.severity} onChange={e => setFilter({ ...filter, severity: e.target.value })} style={{ width: '100%' }}>
                <option value="">All</option>
                <option value="info">Info</option>
                <option value="warning">Warning</option>
                <option value="error">Error</option>
                <option value="critical">Critical</option>
              </select>
            </div>
            <div style={{ flex: 1, minWidth: 140 }}>
              <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Source IP</label>
              <input className="ns-input" value={filter.source_ip} onChange={e => setFilter({ ...filter, source_ip: e.target.value })} placeholder="e.g. 127.0.0.1" />
            </div>
            <button className="btn btn-primary" onClick={fetchEvents} style={{ flexShrink: 0 }}>
              <Search size={14} /> Search
            </button>
          </div>

          {/* Events table */}
          <div className="glass" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
              <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Event Log</h2>
              <span className="pill pill-info">{events.length}</span>
            </div>
            {events.length === 0 ? (
              <div className="empty-state"><ShieldAlert size={32} /><p>No events match your filters.</p></div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table className="ns-table">
                  <thead><tr><th>Time</th><th>Category</th><th>Severity</th><th>Source IP</th><th>Protocol</th><th>Message</th></tr></thead>
                  <tbody>
                    {events.map(e => (
                      <tr key={e.id}>
                        <td className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {new Date(e.timestamp).toLocaleTimeString()}
                        </td>
                        <td><span className="pill pill-info">{e.category}</span></td>
                        <td><span className={`pill ${sevMap[e.severity] || 'pill-info'}`}>{e.severity}</span></td>
                        <td className="mono" style={{ fontSize: 12 }}>{e.source_ip || '—'}</td>
                        <td className="mono" style={{ fontSize: 12 }}>{e.protocol || '—'}</td>
                        <td style={{ fontSize: 12, maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{e.message}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {tab === 'rules' && (
        <div>
          {/* New rule form */}
          <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Add Security Rule</h2>
            <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
              Application-level rules: block rules close the socket; allow rules explicitly permit. Block takes priority over allow.
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr 2fr auto', gap: 12, alignItems: 'end' }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Action</label>
                <select className="ns-select" value={newRule.rule_type} onChange={e => setNewRule({ ...newRule, rule_type: e.target.value })} style={{ width: '100%' }}>
                  <option value="block">Block</option>
                  <option value="allow">Allow</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>IP / CIDR</label>
                <input className="ns-input" value={newRule.target} onChange={e => setNewRule({ ...newRule, target: e.target.value })} placeholder="192.168.1.0/24 or 10.0.0.5" />
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Protocol</label>
                <select className="ns-select" value={newRule.protocol} onChange={e => setNewRule({ ...newRule, protocol: e.target.value })} style={{ width: '100%' }}>
                  <option value="*">Any</option>
                  <option value="TCP">TCP</option>
                  <option value="UDP">UDP</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>Description</label>
                <input className="ns-input" value={newRule.description} onChange={e => setNewRule({ ...newRule, description: e.target.value })} placeholder="Optional note" />
              </div>
              <button className="btn btn-primary" onClick={createRule} disabled={!newRule.target.trim()}>
                <Plus size={14} /> Add
              </button>
            </div>
          </div>

          {/* Rules table */}
          <div className="glass" style={{ overflow: 'hidden' }}>
            {rules.length === 0 ? (
              <div className="empty-state"><ShieldCheck size={32} /><p>No rules. Default is to allow all connections.</p></div>
            ) : (
              <table className="ns-table">
                <thead><tr><th>Action</th><th>Target</th><th>Protocol</th><th>Description</th><th>Hits</th><th>Created</th><th></th></tr></thead>
                <tbody>
                  {rules.map(r => (
                    <tr key={r.id}>
                      <td><span className={`pill ${r.rule_type === 'block' ? 'pill-error' : 'pill-success'}`}>{r.rule_type}</span></td>
                      <td className="mono">{r.target}</td>
                      <td className="mono">{r.protocol}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{r.description || '—'}</td>
                      <td className="mono">{r.hit_count}</td>
                      <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(r.created_at), { addSuffix: true })}</td>
                      <td>
                        <button className="btn btn-danger" onClick={() => deleteRule(r.id)} style={{ padding: '4px 8px' }}>
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
