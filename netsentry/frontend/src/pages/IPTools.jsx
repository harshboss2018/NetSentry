import { useState } from 'react'
import { useAppStore } from '../store/appStore'
import { Network, Globe, CheckCircle, XCircle, Copy, Search } from 'lucide-react'

function ResultCard({ data, title }) {
  const addNotification = useAppStore(s => s.addNotification)
  const copy = (text) => {
    navigator.clipboard.writeText(text)
    addNotification({ title: 'Copied!', variant: 'success', duration: 2000 })
  }
  if (!data) return null
  return (
    <div className="glass" style={{ padding: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 600 }}>{title}</h3>
        <span className="pill pill-info">data_source: calculated</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
        {Object.entries(data).filter(([k]) => !['input', 'data_source'].includes(k)).map(([k, v]) => (
          <div key={k} style={{ background: 'var(--bg-elevated)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 3 }}>{k.replace(/_/g, ' ')}</div>
              <div className="mono" style={{ fontSize: 13 }}>
                {typeof v === 'boolean' ? (v ? '✓ Yes' : '✗ No') : String(v ?? '—')}
              </div>
            </div>
            {typeof v === 'string' && v.includes('.') && (
              <button onClick={() => copy(v)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', padding: 4 }}>
                <Copy size={12} />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

export default function IPTools() {
  const [activeTab, setActiveTab] = useState('subnet')
  const [subnetInput, setSubnetInput] = useState('192.168.1.0/24')
  const [subnetResult, setSubnetResult] = useState(null)
  const [subnetError, setSubnetError] = useState('')
  const [dnsInput, setDnsInput] = useState('google.com')
  const [dnsResult, setDnsResult] = useState(null)
  const [reverseInput, setReverseInput] = useState('8.8.8.8')
  const [reverseResult, setReverseResult] = useState(null)
  const [ipInput, setIpInput] = useState('192.168.1.1')
  const [ipResult, setIpResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const addNotification = useAppStore(s => s.addNotification)

  const calcSubnet = () => {
    setLoading(true); setSubnetError('')
    fetch('/api/v1/tools/subnet', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cidr: subnetInput }),
    }).then(async r => {
      const d = await r.json()
      if (!r.ok) { setSubnetError(d.detail || 'Invalid CIDR'); setSubnetResult(null) }
      else setSubnetResult(d)
      setLoading(false)
    }).catch(() => { setLoading(false); setSubnetError('Request failed') })
  }

  const lookupDNS = () => {
    setLoading(true)
    fetch('/api/v1/tools/dns/lookup', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ hostname: dnsInput }),
    }).then(r => r.json()).then(d => { setDnsResult(d); setLoading(false) })
    .catch(() => setLoading(false))
  }

  const reverseDNS = () => {
    setLoading(true)
    fetch('/api/v1/tools/dns/reverse', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: reverseInput }),
    }).then(r => r.json()).then(d => { setReverseResult(d); setLoading(false) })
    .catch(() => setLoading(false))
  }

  const validateIP = () => {
    setLoading(true)
    fetch('/api/v1/tools/ip/validate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ip: ipInput }),
    }).then(r => r.json()).then(d => { setIpResult(d); setLoading(false) })
    .catch(() => setLoading(false))
  }

  const TABS = [
    { id: 'subnet', label: 'Subnet Calculator', icon: Network },
    { id: 'dns', label: 'DNS Lookup', icon: Globe },
    { id: 'rdns', label: 'Reverse DNS', icon: Globe },
    { id: 'ipvalidate', label: 'IP Validate', icon: CheckCircle },
  ]

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">IP & DNS Tools</h1>
          <p className="page-subtitle">IPv4 subnet calculator, DNS resolver, and IP validation utilities</p>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 24, flexWrap: 'wrap' }}>
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} className={`btn ${activeTab === id ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setActiveTab(id)}>
            <Icon size={14} /> {label}
          </button>
        ))}
      </div>

      {activeTab === 'subnet' && (
        <div>
          <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Subnet Calculator</h2>
            <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, color: 'var(--text-muted)', display: 'block', marginBottom: 5 }}>CIDR Notation</label>
                <input className="ns-input" value={subnetInput} onChange={e => setSubnetInput(e.target.value)}
                  placeholder="192.168.1.0/24" onKeyDown={e => e.key === 'Enter' && calcSubnet()} />
              </div>
              <button className="btn btn-primary" onClick={calcSubnet} disabled={loading}>
                <Search size={14} /> Calculate
              </button>
            </div>
            {subnetError && <div style={{ marginTop: 8, color: 'var(--red)', fontSize: 13 }}>{subnetError}</div>}
            <div style={{ marginTop: 8, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['10.0.0.0/8', '172.16.0.0/12', '192.168.0.0/16', '192.168.1.0/24', '10.0.0.0/30'].map(ex => (
                <button key={ex} className="btn btn-ghost" style={{ padding: '3px 10px', fontSize: 11 }}
                  onClick={() => { setSubnetInput(ex); setSubnetResult(null) }}>
                  {ex}
                </button>
              ))}
            </div>
          </div>
          {subnetResult && <ResultCard data={subnetResult} title={`Subnet: ${subnetResult.input}`} />}
        </div>
      )}

      {activeTab === 'dns' && (
        <div>
          <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Forward DNS Lookup</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <input className="ns-input" value={dnsInput} onChange={e => setDnsInput(e.target.value)}
                placeholder="hostname or domain" onKeyDown={e => e.key === 'Enter' && lookupDNS()} />
              <button className="btn btn-primary" onClick={lookupDNS} disabled={loading} style={{ flexShrink: 0 }}>
                <Globe size={14} /> Lookup
              </button>
            </div>
          </div>
          {dnsResult && (
            <div className="glass" style={{ padding: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                {dnsResult.success ? <CheckCircle size={16} color="var(--green)" /> : <XCircle size={16} color="var(--red)" />}
                <span style={{ fontWeight: 600 }}>{dnsResult.hostname}</span>
                <span className="pill pill-info">real DNS</span>
              </div>
              {dnsResult.success ? (
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {dnsResult.addresses.map(ip => (
                    <div key={ip} className="mono" style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 12px', fontSize: 13 }}>
                      {ip}
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ color: 'var(--red)', fontSize: 13 }}>{dnsResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'rdns' && (
        <div>
          <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>Reverse DNS Lookup</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <input className="ns-input" value={reverseInput} onChange={e => setReverseInput(e.target.value)}
                placeholder="IP address" onKeyDown={e => e.key === 'Enter' && reverseDNS()} />
              <button className="btn btn-primary" onClick={reverseDNS} disabled={loading} style={{ flexShrink: 0 }}>
                <Globe size={14} /> Reverse Lookup
              </button>
            </div>
          </div>
          {reverseResult && (
            <div className="glass" style={{ padding: 20 }}>
              {reverseResult.success ? (
                <div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>IP: {reverseResult.ip}</div>
                  <div className="mono" style={{ fontSize: 16, fontWeight: 600 }}>{reverseResult.hostname}</div>
                  {reverseResult.aliases?.length > 0 && <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>Aliases: {reverseResult.aliases.join(', ')}</div>}
                </div>
              ) : (
                <div style={{ color: 'var(--red)', fontSize: 13 }}>{reverseResult.error}</div>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'ipvalidate' && (
        <div>
          <div className="glass" style={{ padding: 20, marginBottom: 16 }}>
            <h2 style={{ margin: '0 0 14px', fontSize: 14, fontWeight: 600 }}>IPv4 Address Validation</h2>
            <div style={{ display: 'flex', gap: 12 }}>
              <input className="ns-input" value={ipInput} onChange={e => setIpInput(e.target.value)}
                placeholder="e.g. 192.168.1.1" onKeyDown={e => e.key === 'Enter' && validateIP()} />
              <button className="btn btn-primary" onClick={validateIP} disabled={loading} style={{ flexShrink: 0 }}>
                <CheckCircle size={14} /> Validate
              </button>
            </div>
          </div>
          {ipResult && <ResultCard data={ipResult} title={`IP Analysis: ${ipResult.ip}`} />}
        </div>
      )}
    </div>
  )
}
