import { useEffect, useCallback, useState } from 'react'
import {
  ReactFlow, Background, Controls, MiniMap,
  useNodesState, useEdgesState, MarkerType,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useAppStore } from '../store/appStore'
import { RefreshCw, RotateCcw, Info, X, Zap } from 'lucide-react'

const NODE_STYLES = {
  client: { bg: '#14b3f522', border: '#14b3f5', icon: '💻' },
  server: { bg: '#22d3a022', border: '#22d3a0', icon: '🖥️' },
  router: { bg: '#f5c51822', border: '#f5c518', icon: '📡' },
  switch: { bg: '#a78bfa22', border: '#a78bfa', icon: '🔀' },
}

function buildRFNodes(nodes) {
  return nodes.map(n => {
    const style = NODE_STYLES[n.type] || NODE_STYLES.client
    return {
      id: n.id,
      position: { x: n.x || 0, y: n.y || 0 },
      data: {
        raw: n,
        label: (
          <div style={{ textAlign: 'center', fontSize: 11, cursor: 'pointer' }}>
            <div style={{ fontSize: 18, marginBottom: 2 }}>{style.icon}</div>
            <div style={{ fontWeight: 600, color: '#fff' }}>{n.label}</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace', fontSize: 10 }}>{n.ip || n.id}</div>
            {n.status === 'down' ? (
              <div style={{ color: '#f04f5e', fontSize: 10, marginTop: 2, fontWeight: 700 }}>● DOWN</div>
            ) : (
              <div style={{ color: '#22d3a0', fontSize: 10, marginTop: 2 }}>● ACTIVE</div>
            )}
          </div>
        )
      },
      style: {
        background: style.bg,
        border: `2px solid ${n.status === 'down' ? '#f04f5e' : style.border}`,
        borderRadius: 10,
        padding: '8px 12px',
        minWidth: 95,
        opacity: n.status === 'down' ? 0.5 : 1,
        boxShadow: n.status === 'down' ? 'none' : `0 0 12px ${style.border}33`,
      },
    }
  })
}

function buildRFEdges(edges) {
  return edges.map(e => ({
    id: e.id,
    source: e.source,
    target: e.target,
    animated: e.status === 'up',
    style: {
      stroke: e.status === 'down' ? '#f04f5e' : '#14b3f5',
      strokeWidth: 2,
      strokeDasharray: e.status === 'down' ? '6 4' : undefined,
    },
    label: e.status === 'up' ? `${e.latency_ms}ms (w=${e.weight})` : '✕ DOWN',
    labelStyle: { fontSize: 10, fill: e.status === 'down' ? '#f04f5e' : 'rgba(255,255,255,0.6)' },
    labelBgStyle: { fill: '#141722', fillOpacity: 0.9 },
    labelBgPadding: [6, 4],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: e.status === 'down' ? '#f04f5e' : '#14b3f5' },
  }))
}

export default function Topology() {
  const [nodes, setNodes, onNodesChange] = useNodesState([])
  const [edges, setEdges, onEdgesChange] = useEdgesState([])
  const [selectedNode, setSelectedNode] = useState(null)
  const addNotification = useAppStore(s => s.addNotification)
  const events = useAppStore(s => s.events)

  const fetchTopology = useCallback(() => {
    fetch('/api/v1/topology')
      .then(r => r.json())
      .then(data => {
        setNodes(buildRFNodes(data.nodes))
        setEdges(buildRFEdges(data.edges))
      })
      .catch(() => addNotification({ title: 'Error', message: 'Failed to fetch topology', variant: 'error' }))
  }, [addNotification, setNodes, setEdges])

  useEffect(() => { fetchTopology() }, [fetchTopology])

  // Live WebSocket auto-sync: reload when a topology event arrives
  useEffect(() => {
    if (events[0]?.type === 'topology_changed') {
      fetchTopology()
    }
  }, [events, fetchTopology])

  const toggleLink = (edgeId) => {
    fetch(`/api/v1/topology/links/${edgeId}/toggle`, { method: 'PATCH' })
      .then(r => r.json())
      .then(updated => {
        setEdges(eds => eds.map(e => e.id === edgeId ? {
          ...e,
          animated: updated.status === 'up',
          style: { ...e.style, stroke: updated.status === 'down' ? '#f04f5e' : '#14b3f5' },
          label: updated.status === 'up' ? `${updated.latency_ms}ms (w=${updated.weight})` : '✕ DOWN',
          labelStyle: { ...e.labelStyle, fill: updated.status === 'down' ? '#f04f5e' : 'rgba(255,255,255,0.6)' },
        } : e))
        addNotification({
          title: `Link ${updated.status === 'down' ? 'Simulated Failure' : 'Link Restored'}`,
          message: `${updated.source} ↔ ${updated.target} is now ${updated.status.toUpperCase()}`,
          variant: updated.status === 'down' ? 'warning' : 'success',
        })
      })
  }

  const resetTopology = () => {
    fetch('/api/v1/topology/reset', { method: 'POST' })
      .then(() => fetchTopology())
      .then(() => {
        setSelectedNode(null)
        addNotification({ title: 'Topology Reset', message: 'Default network topology restored', variant: 'info' })
      })
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1 className="page-title">Interactive Network Topology</h1>
          <p className="page-subtitle">Virtual simulated network model — click any link to simulate link failure / recovery</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-ghost" onClick={fetchTopology}>
            <RefreshCw size={14} /> Refresh
          </button>
          <button className="btn btn-ghost" onClick={resetTopology}>
            <RotateCcw size={14} /> Reset Default
          </button>
        </div>
      </div>

      {/* Legend & Stats Banner */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 16, alignItems: 'center', flexWrap: 'wrap' }}>
        {Object.entries(NODE_STYLES).map(([type, s]) => (
          <div key={type} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
            <span>{s.icon}</span> {type.charAt(0).toUpperCase() + type.slice(1)}
          </div>
        ))}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ width: 16, height: 2, background: '#14b3f5', display: 'inline-block' }} /> Active Link
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text-secondary)' }}>
          <span style={{ width: 16, height: 2, background: '#f04f5e', display: 'inline-block' }} /> Failed Link
        </div>
        <span className="pill pill-simulated" style={{ marginLeft: 'auto' }}>model: in-memory graph</span>
      </div>

      {/* Main Canvas and Node Inspector */}
      <div style={{ position: 'relative' }}>
        <div className="glass" style={{ height: '62vh', overflow: 'hidden', padding: 0 }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onEdgeClick={(_, edge) => toggleLink(edge.id)}
            onNodeClick={(_, node) => setSelectedNode(node.data.raw)}
            fitView
            colorMode="dark"
            style={{ background: 'var(--bg-base)' }}
          >
            <Background color="#232736" gap={20} />
            <Controls style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }} />
            <MiniMap
              style={{ background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
              nodeColor={n => n.style?.border || '#14b3f5'}
            />
          </ReactFlow>
        </div>

        {/* Node Detail Inspector Drawer */}
        {selectedNode && (
          <div className="glass" style={{
            position: 'absolute', top: 16, right: 16, width: 280, padding: 18,
            boxShadow: '0 8px 30px rgba(0,0,0,0.5)', zIndex: 10,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontSize: 18 }}>{NODE_STYLES[selectedNode.type]?.icon || '💻'}</span>
                <span style={{ fontWeight: 700, fontSize: 14 }}>{selectedNode.label}</span>
              </div>
              <button onClick={() => setSelectedNode(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={16} />
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Node ID:</span>
                <span className="mono">{selectedNode.id}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                <span className="pill pill-info">{selectedNode.type}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Simulated IP:</span>
                <span className="mono">{selectedNode.ip || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Status:</span>
                <span className={`pill ${selectedNode.status === 'up' ? 'pill-success' : 'pill-error'}`}>
                  {selectedNode.status}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 12, fontSize: 12, color: 'var(--text-muted)' }}>
        <Zap size={14} color="var(--yellow)" />
        <span>Click any connection line (edge) to instantly fail/restore that link and test real-time path rerouting.</span>
      </div>
    </div>
  )
}
