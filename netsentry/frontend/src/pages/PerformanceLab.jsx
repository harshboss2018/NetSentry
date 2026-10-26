import { useState, useEffect } from 'react'
import { useAppStore } from '../store/appStore'
import { Play, History, FlaskConical, Gauge, Activity } from 'lucide-react'
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { formatDistanceToNow } from 'date-fns'

const CHART_STYLE = {
  contentStyle: { background: 'var(--bg-card)', border: '1px solid var(--border)', fontSize: 11, borderRadius: 8 },
  axisStyle: { fontSize: 11, fill: 'rgba(255,255,255,0.4)' },
}

export default function PerformanceLab() {
  const [tab, setTab] = useState('latency')
  const [latencyResult, setLatencyResult] = useState(null)
  const [throughputResult, setThroughputResult] = useState(null)
  const [simResult, setSimResult] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(false)
  const addNotification = useAppStore(s => s.addNotification)

  // Forms
  const [latForm, setLatForm] = useState({ target_ip: '127.0.0.1', target_port: 9001, count: 5 })
  const [tpForm, setTpForm] = useState({ target_ip: '127.0.0.1', target_port: 9001, payload_kb: 256 })
  const [simForm, setSimForm] = useState({ name: 'Experiment 1', delay_ms: 50, loss_pct: 10, notes: '' })

  const fetchHistory = () => {
    fetch('/api/v1/performance/history')
      .then(r => r.json())
      .then(setHistory)
      .catch(() => {})
  }
  useEffect(() => { fetchHistory() }, [])

  const runLatency = () => {
    setLoading(true)
    fetch('/api/v1/performance/latency', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(latForm),
    }).then(r => r.json()).then(d => {
      setLatencyResult(d)
      setLoading(false)
      fetchHistory()
      addNotification({ title: 'Latency Test Complete', message: `Avg RTT: ${d.avg_ms}ms`, variant: 'success' })
    }).catch(() => {
      setLoading(false)
      addNotification({ title: 'Latency Test Failed', message: 'Target unreachable on TCP port', variant: 'error' })
    })
  }

  const runThroughput = () => {
    setLoading(true)
    fetch('/api/v1/performance/throughput', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tpForm),
    }).then(r => r.json()).then(d => {
      setThroughputResult(d)
      setLoading(false)
      fetchHistory()
      if (d.success) {
        addNotification({ title: 'Throughput Test Complete', message: `${d.throughput_mbps} Mbps (${d.throughput_kbps} KB/s)`, variant: 'success' })
      } else {
        addNotification({ title: 'Test Failed', message: d.error, variant: 'error' })
      }
    }).catch(() => {
      setLoading(false)
      addNotification({ title: 'Error', message: 'Throughput measurement failed', variant: 'error' })
    })
  }

  const runSimulated = () => {
    setLoading(true)
    fetch('/api/v1/performance/simulated', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(simForm),
    }).then(r => r.json()).then(d => {
      setSimResult(d)
      setLoading(false)
      fetchHistory()
      addNotification({ title: 'Simulated Experiment Complete', message: `Packet Loss: ${d.simulated_loss_pct}%`, variant: 'info' })
    }).catch(() => setLoading(false))
  }

  const latencyChartData = latencyResult?.rtt_ms?.map((v, i) => ({ sample: `#${i + 1}`, rtt: v })) || []

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Performance Lab</h1>
          <p className="page-subtitle">Real TCP socket RTT & throughput benchmarks + simulated network degradation experiments</p>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {[
          { id: 'latency',    label: 'Latency Benchmark',   badge: 'real' },
          { id: 'throughput', label: 'Throughput Benchmark',badge: 'real' },
          { id: 'simulated',  label: 'Simulated Loss/Delay',badge: 'simulated' },
          { id: 'history',    label: 'Test History',        badge: null },
        ].map(t => (
          <button key={t.id} className={`btn ${tab === t.id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setTab(t.id)}>
            {t.label}
            {t.badge && <span className={`pill pill-${t.badge === 'real' ? 'info' : 'simulated'}`} style={{ marginLeft: 6, fontSize: 10 }}>{t.badge}</span>}
          </button>
        ))}
      </div>

      {/* ── Tab 1: Latency Benchmark ────────────────────────────────────────── */}
      {tab === 'latency' && (
        <div className="glass" style={{ padding: 22 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>TCP Round-Trip Time (RTT) Measurement</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Target Host / IP</label>
              <input className="ns-input" value={latForm.target_ip} onChange={e => setLatForm({ ...latForm, target_ip: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>TCP Port</label>
              <input className="ns-input" type="number" value={latForm.target_port} onChange={e => setLatForm({ ...latForm, target_port: +e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Echo Samples</label>
              <input className="ns-input" type="number" min={1} max={30} value={latForm.count} onChange={e => setLatForm({ ...latForm, count: +e.target.value })} />
            </div>
            <button className="btn btn-primary" onClick={runLatency} disabled={loading}>
              <Play size={14} /> {loading ? 'Measuring...' : 'Run Benchmark'}
            </button>
          </div>

          {latencyResult && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 20 }}>
                {[
                  { label: 'Minimum RTT', value: `${latencyResult.min_ms ?? '—'} ms`, color: 'var(--green)' },
                  { label: 'Average RTT', value: `${latencyResult.avg_ms ?? '—'} ms`, color: 'var(--brand)' },
                  { label: 'Maximum RTT', value: `${latencyResult.max_ms ?? '—'} ms`, color: 'var(--orange)' },
                  { label: 'Success Rate', value: `${latencyResult.received}/${latencyResult.sent}`, color: '#fff' },
                ].map(({ label, value, color }) => (
                  <div key={label} style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 16px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</div>
                    <div style={{ fontSize: 20, fontWeight: 700, marginTop: 4, color }}>{value}</div>
                  </div>
                ))}
              </div>
              {latencyChartData.length > 0 && (
                <div style={{ height: 220 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={latencyChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                      <XAxis dataKey="sample" tick={CHART_STYLE.axisStyle} />
                      <YAxis tick={CHART_STYLE.axisStyle} unit=" ms" />
                      <Tooltip {...CHART_STYLE} formatter={(v) => [`${v} ms`, 'RTT Latency']} />
                      <Line type="monotone" dataKey="rtt" stroke="#14b3f5" strokeWidth={2.5} dot={{ fill: '#14b3f5', r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 2: Throughput Benchmark ─────────────────────────────────────── */}
      {tab === 'throughput' && (
        <div className="glass" style={{ padding: 22 }}>
          <h2 style={{ margin: '0 0 16px', fontSize: 15, fontWeight: 600 }}>TCP Throughput Transfer Test</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 12, alignItems: 'end', marginBottom: 20 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Target Host / IP</label>
              <input className="ns-input" value={tpForm.target_ip} onChange={e => setTpForm({ ...tpForm, target_ip: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>TCP Port</label>
              <input className="ns-input" type="number" value={tpForm.target_port} onChange={e => setTpForm({ ...tpForm, target_port: +e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Payload Size</label>
              <select className="ns-select" value={tpForm.payload_kb} onChange={e => setTpForm({ ...tpForm, payload_kb: +e.target.value })} style={{ width: '100%' }}>
                <option value={64}>64 KB</option>
                <option value={256}>256 KB</option>
                <option value={512}>512 KB</option>
                <option value={1024}>1 MB</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={runThroughput} disabled={loading}>
              <Gauge size={14} /> {loading ? 'Transferring...' : 'Measure Speed'}
            </button>
          </div>

          {throughputResult && (
            <div>
              {throughputResult.success ? (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 14 }}>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Throughput (Mbps)</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)', marginTop: 4 }}>
                      {throughputResult.throughput_mbps} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Mbps</span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Transfer Rate</div>
                    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--green)', marginTop: 4 }}>
                      {throughputResult.throughput_kbps} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>KB/s</span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Data Transferred</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                      {throughputResult.payload_kb} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>KB</span>
                    </div>
                  </div>
                  <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '14px 18px' }}>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Transfer Duration</div>
                    <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>
                      {throughputResult.duration_sec} <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>s</span>
                    </div>
                  </div>
                </div>
              ) : (
                <div style={{ color: 'var(--red)', fontSize: 13 }}>Failed: {throughputResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Tab 3: Simulated Experiment ─────────────────────────────────────── */}
      {tab === 'simulated' && (
        <div className="glass" style={{ padding: 22 }}>
          <h2 style={{ margin: '0 0 6px', fontSize: 15, fontWeight: 600 }}>Simulated Link Degradation</h2>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', margin: '0 0 16px' }}>
            Mathematical simulation of one-way latency variance (jitter) and packet drop probability.
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: 12, marginBottom: 16 }}>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Experiment Name</label>
              <input className="ns-input" value={simForm.name} onChange={e => setSimForm({ ...simForm, name: e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Simulated Delay (ms)</label>
              <input className="ns-input" type="number" min={0} max={2000} value={simForm.delay_ms} onChange={e => setSimForm({ ...simForm, delay_ms: +e.target.value })} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: 'var(--text-muted)', display: 'block', marginBottom: 6 }}>Packet Loss Probability (%)</label>
              <input className="ns-input" type="number" min={0} max={100} value={simForm.loss_pct} onChange={e => setSimForm({ ...simForm, loss_pct: +e.target.value })} />
            </div>
          </div>
          <button className="btn btn-primary" onClick={runSimulated} disabled={loading} style={{ marginBottom: 20 }}>
            <FlaskConical size={14} /> {loading ? 'Simulating...' : 'Run Simulation'}
          </button>

          {simResult && (
            <div>
              <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginBottom: 16 }}>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 18px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Average RTT</div>
                  <div style={{ fontSize: 20, fontWeight: 700 }}>{simResult.avg_rtt_ms ?? '—'} ms</div>
                </div>
                <div style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 8, padding: '12px 18px' }}>
                  <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Packet Loss Rate</div>
                  <div style={{ fontSize: 20, fontWeight: 700, color: simResult.lost > 0 ? 'var(--red)' : 'var(--green)' }}>
                    {simResult.lost}/{simResult.received + simResult.lost} ({Math.round((simResult.lost / (simResult.received + simResult.lost)) * 100)}%)
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {simResult.samples.map(s => (
                  <div key={s.seq} style={{
                    padding: '6px 12px', borderRadius: 6, fontSize: 12,
                    background: s.status === 'lost' ? 'var(--red-dim)' : 'var(--green-dim)',
                    color: s.status === 'lost' ? 'var(--red)' : 'var(--green)',
                    border: `1px solid ${s.status === 'lost' ? 'rgba(240,79,94,0.3)' : 'rgba(34,211,160,0.3)'}`,
                  }}>
                    #{s.seq} {s.status === 'lost' ? '✗ Lost' : `✓ ${s.rtt_ms} ms`}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab 4: History ──────────────────────────────────────────────────── */}
      {tab === 'history' && (
        <div className="glass" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 8 }}>
            <History size={16} />
            <h2 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>Benchmarking & Experiment History</h2>
            <span className="pill pill-info">{history.length}</span>
            <button className="btn btn-ghost" onClick={fetchHistory} style={{ marginLeft: 'auto', padding: '4px 10px' }}>Refresh</button>
          </div>
          {history.length === 0 ? (
            <div className="empty-state"><FlaskConical size={32} /><p>No experiments recorded yet.</p></div>
          ) : (
            <table className="ns-table">
              <thead><tr><th>Time</th><th>Name</th><th>Type</th><th>Source</th><th>Benchmark Outcome</th></tr></thead>
              <tbody>
                {history.map(e => (
                  <tr key={e.id}>
                    <td style={{ fontSize: 11, color: 'var(--text-muted)' }}>{formatDistanceToNow(new Date(e.timestamp), { addSuffix: true })}</td>
                    <td style={{ fontSize: 13, fontWeight: 500 }}>{e.name}</td>
                    <td><span className="pill pill-info">{e.type}</span></td>
                    <td><span className={`pill ${e.data_source === 'real' ? 'pill-success' : 'pill-simulated'}`}>{e.data_source}</span></td>
                    <td className="mono" style={{ fontSize: 12 }}>
                      {e.result?.avg_ms != null ? `avg RTT: ${e.result.avg_ms} ms` :
                       e.result?.throughput_mbps != null ? `${e.result.throughput_mbps} Mbps (${e.result.throughput_kbps} KB/s)` :
                       e.result?.avg_rtt_ms != null ? `avg RTT: ${e.result.avg_rtt_ms} ms (loss: ${e.result.simulated_loss_pct}%)` : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}
    </div>
  )
}
