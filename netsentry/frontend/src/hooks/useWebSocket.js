import { useEffect, useRef } from 'react'
import { useAppStore } from '../store/appStore'

const WS_URL = `ws://${window.location.hostname}:${window.location.port || 8000}/ws`

export function useWebSocket() {
  const wsRef = useRef(null)
  const reconnectRef = useRef(null)
  const { setWsConnected, setWsError, setMetrics, addEvent, setTopology, addNotification } = useAppStore()

  const connect = () => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(WS_URL)
    wsRef.current = ws

    ws.onopen = () => {
      setWsConnected(true)
      clearTimeout(reconnectRef.current)
    }

    ws.onmessage = (ev) => {
      try {
        const msg = JSON.parse(ev.data)
        handleMessage(msg)
      } catch { /* ignore malformed */ }
    }

    ws.onclose = () => {
      setWsConnected(false)
      // Reconnect after 3 seconds
      reconnectRef.current = setTimeout(connect, 3000)
    }

    ws.onerror = () => {
      setWsError('WebSocket connection failed')
      ws.close()
    }
  }

  const handleMessage = (msg) => {
    const { type, data, timestamp } = msg

    switch (type) {
      case 'connected':
        setMetrics(data)
        break
      case 'metrics':
        setMetrics(data)
        break
      case 'client_connected':
        addEvent({ type, data, timestamp, category: 'connection', severity: 'info' })
        addNotification({ title: 'Client Connected', message: `${data.protocol} from ${data.ip}:${data.port}`, variant: 'success' })
        break
      case 'client_disconnected':
        addEvent({ type, data, timestamp, category: 'connection', severity: 'info' })
        break
      case 'tcp_message':
      case 'udp_datagram':
        addEvent({ type, data, timestamp, category: 'connection', severity: 'info' })
        break
      case 'security_block':
        addEvent({ type, data, timestamp, category: 'security', severity: 'warning' })
        addNotification({ title: 'Connection Blocked', message: `${data.client_ip}: ${data.reason}`, variant: 'warning' })
        break
      case 'topology_changed':
        // Refresh topology from store (full topology is re-fetched by Topology page)
        addEvent({ type, data, timestamp, category: 'system', severity: 'info' })
        break
      default:
        break
    }
  }

  useEffect(() => {
    connect()
    // Keepalive ping every 25 seconds
    const pingInterval = setInterval(() => {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send('ping')
      }
    }, 25000)

    return () => {
      clearInterval(pingInterval)
      clearTimeout(reconnectRef.current)
      wsRef.current?.close()
    }
  }, [])
}
