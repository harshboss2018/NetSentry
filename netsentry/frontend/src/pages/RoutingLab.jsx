import { useEffect, useState, useCallback } from 'react'
import { useAppStore } from '../store/appStore'
import { Play, AlertTriangle, RefreshCw, GitBranch, ArrowRight, Zap, CheckCircle2 } from 'lucide-react'

export default function RoutingLab() {
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [src, setSrc] = useState('')
  const [dst, setDst] = useState('')
  const [algo, setAlgo] = useState('dijkstra')
  const [result, setResult] = useState(null)
  const [tables, setTables] = useState(null)
  const [loading, setLoading] = useState(false)
  const [activeStep, setActiveStep] = useState(0)
  const addNotification = useAppStore(s => s.addNotification)
  const events = useAppStore(s => s.events)

  const loadTopology = useCallback(() => {
    fetch('/api/v1/topology')
      .then(r => r.json())
      .then(d => {
        setNodes(d.nodes || [])
        setEdges(d.edges || [])
        if (!src && d.nodes?.length >= 2) {
          setSrc(d.nodes[0].id)
          setDst(d.nodes[d.nodes.length - 1].id)
        }
      })
      .catch(() => {})
  }, [src])

  useEffect(() => { loadTopology() }, [loadTopology])

  // Auto-sync when topology changes
  useEffect(() => {
    if (events[0]?.type === 'topology_changed') {
      loadTopology()
    }
  }, [events, loadTopology])

  const findPath = () => {
    if (!src || !dst) return
    setLoading(true)
    setResult(null)
    setActiveStep(0)
    fetch('/api/v1/routing/path', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ src, dst, algorithm: algo }),
    })
      .then(r => r.json())
      .then(d => {
        setResult(d)
        setLoading(false)
      })
      .catch(() => {
        setLoading(false)
        addNotification({ title: 'Error', message: 'Routing calculation failed', variant: 'error' })
      })
  }

  const fetchTables = () => {
    fetch('/api/v1/routing/tables')
      .then(r => r.json())
      .then(d => setTables(d.tables))
  }

  const toggleLinkFromHere = (edgeId) => {
    fetch(`/api/v1/topology/links/${edgeId}/toggle`, { method: 'PATCH' })
      .then(r => r.json())
      .then(updated => {
        loadTopology()
        addNotification({
          title: `Link ${updated.status === 'down' ? 'Failed' : 'Restored'}`,
          message: `${updated.source} ↔ ${updated.target} (${updated.status})`,
          variant: updated.status === 'down' ? 'warning' : 'success',
        })
        // Automatically re-compute path if one was shown
        if (result) {
          setTimeout(() => findPath(), 100)
        }
      })
  }

  const nodeLabel = (id) => nodes.find(n => n.id === id)?.label || id

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Routing & Resilience Lab</h1>
          <p className="page-subtitle">Dijkstra Link-State & Distance-Vector (Bellman-Ford) routing over virtual network topology</p>
        </div>
        <span className="pill pill-simulated">simulated</span>
      </div>

      {/* Path Finder Card */}
      <div className="glass" style={{ padding: 22, marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>Compute Optimal Route</h2>
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1.5fr auto', gap: 12, alignItems: 'end' }}>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Source Node</label>
            <select className="ns-select" value={src} onChange={e => setSrc(e.target.value)} style={{ width: '100%' }}>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.id})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Destination Node</label>
            <select className="ns-select" value={dst} onChange={e => setDst(e.target.value)} style={{ width: '100%' }}>
              {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.id})</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Routing Algorithm</label>
            <select className="ns-select" value={algo} onChange={e => setAlgo(e.target.value)} style={{ width: '100%' }}>
              <option value="dijkstra">Dijkstra (Link-State Shortest Path)</option>
              <option value="distance_vector">Distance-Vector (Bellman-Ford Trace)</option>
            </select>
          </div>
          <button className="btn btn-primary" onClick={findPath} disabled={loading || !src || !dst}>
            <Play size={14} /> {loading ? 'Calculating...' : 'Calculate Path'}
          </button>
        </div>

        {/* Path Result */}
        {result && (
          <div style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--border)' }}>
            {result.reachable ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
                  {result.path.map((nid, i) => (
                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        background: i === 0 ? 'var(--brand-dim)' : i === result.path.length - 1 ? 'var(--green-dim)' : 'var(--bg-elevated)',
                        border: `2px solid ${i === 0 ? 'var(--brand)' : i === result.path.length - 1 ? 'var(--green)' : 'var(--border)'}`,
                        borderRadius: 8, padding: '8px 14px', fontSize: 13, fontWeight: 600,
                      }}>
                        {nodeLabel(nid)} <span style={{ fontSize: 10, color: 'var(--text-muted)' }}>({nid})</span>
                      </div>
                      {i < result.path.length - 1 && (
                        <ArrowRight size={16} color="var(--brand)" />
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 20, fontSize: 13, alignItems: 'center' }}>
                  <span><strong>Total Cost:</strong> {result.cost}</span>
                  <span><strong>Hop Count:</strong> {result.hops}</span>
                  <span><strong>Algorithm:</strong> {result.algorithm === 'distance_vector' ? 'Distance-Vector (Bellman-Ford)' : 'Dijkstra Link-State'}</span>
                  <span className="pill pill-success" style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <CheckCircle2 size={12} /> Reachable
                  </span>
                </div>

                {/* Distance Vector Step Trace */}
                {result.steps && result.steps.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <h3 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>
                        Distance-Vector Convergence Trace ({result.steps.length} rounds to reach fixed-point)
                      </h3>
                    </div>
                    <div style={{ display: 'flex', gap: 8, marginBottom: 12, flexWrap: 'wrap' }}>
                      {result.steps.map((s, i) => (
                        <button key={i} className={`btn ${activeStep === i ? 'btn-primary' : 'btn-ghost'}`}
                          style={{ padding: '4px 12px', fontSize: 12 }}
                          onClick={() => setActiveStep(i)}>
                          Round {s.round} {s.updates.length === 0 ? '✓ (Converged)' : `(${s.updates.length} updates)`}
                        </button>
                      ))}
                    </div>
                    {result.steps[activeStep] && (
                      <div className="glass" style={{ padding: 16 }}>
                        <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 8, fontWeight: 500 }}>
                          Round {result.steps[activeStep].round}: {result.steps[activeStep].updates.length === 0 ? 'Topology Converged — No routing cost updates required' : `${result.steps[activeStep].updates.length} edge relaxation(s) applied`}
                        </div>
                        {result.steps[activeStep].updates.map((u, i) => (
                          <div key={i} style={{ fontSize: 12, color: 'var(--green)', marginBottom: 4 }}>
                            ↳ Node <strong>{nodeLabel(u.node)}</strong> via <strong>{nodeLabel(u.via)}</strong>: new cost = {u.new_cost}
                          </div>
                        ))}
                        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                          {Object.entries(result.steps[activeStep].dist_snapshot).map(([n, d]) => (
                            <div key={n} style={{
                              fontSize: 11, padding: '4px 10px', borderRadius: 6,
                              background: 'var(--bg-base)', border: '1px solid var(--border)',
                            }}>
                              {nodeLabel(n)}: <strong className="mono">{d ?? '∞'}</strong>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--red)', padding: 12, background: 'var(--red-dim)', borderRadius: 8 }}>
                <AlertTriangle size={18} />
                <span>Destination node is unreachable under current link states. No active path exists.</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Interactive Link Failure Simulator Bar */}
      <div className="glass" style={{ padding: 20, marginBottom: 20 }}>
        <h2 style={{ margin: '0 0 12px', fontSize: 14, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 8 }}>
          <Zap size={16} color="var(--yellow)" />
          Simulate Virtual Link Failures
        </h2>
        <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 14px' }}>
          Click any link to break or repair it. NetSentry will automatically trigger dynamic rerouting without touching the Windows routing table.
        </p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
          {edges.map(e => (
            <button key={e.id}
              onClick={() => toggleLinkFromHere(e.id)}
              className={`btn ${e.status === 'down' ? 'btn-danger' : 'btn-ghost'}`}
              style={{ fontSize: 12, padding: '6px 14px' }}>
              {e.status === 'down' ? '🔴 DOWN' : '🟢 UP'}: {nodeLabel(e.source)} ↔ {nodeLabel(e.target)} ({e.latency_ms}ms)
            </button>
          ))}
        </div>
      </div>

      {/* Full Routing Tables Panel */}
      <div className="glass" style={{ padding: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>All-Pairs Routing Tables</h2>
            <p style={{ margin: '4px 0 0', fontSize: 12, color: 'var(--text-muted)' }}>
              Computes complete shortest-path forwarding table for every router and node in the graph.
            </p>
          </div>
          <button className="btn btn-ghost" onClick={fetchTables}><RefreshCw size={14} /> Compute All</button>
        </div>

        {tables && (
          <div style={{ overflowX: 'auto' }}>
            <table className="ns-table">
              <thead>
                <tr>
                  <th>Origin</th><th>Target</th><th>Next Forwarding Hop</th><th>Total Cost</th><th>Hops</th><th>State</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(tables).flatMap(([from, dests]) =>
                  Object.entries(dests).map(([to, info]) => (
                    <tr key={`${from}-${to}`}>
                      <td><strong>{nodeLabel(from)}</strong></td>
                      <td>{nodeLabel(to)}</td>
                      <td className="mono">{info.next_hop ? nodeLabel(info.next_hop) : '—'}</td>
                      <td className="mono">{info.cost ?? '∞'}</td>
                      <td>{info.hops}</td>
                      <td>
                        <span className={`pill ${info.reachable ? 'pill-success' : 'pill-error'}`}>
                          {info.reachable ? 'Reachable' : 'Unreachable'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
