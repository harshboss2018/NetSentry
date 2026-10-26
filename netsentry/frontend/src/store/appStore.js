import { create } from 'zustand'

export const useAppStore = create((set, get) => ({
  // WebSocket connection state
  wsConnected: false,
  wsError: null,
  setWsConnected: (v) => set({ wsConnected: v, wsError: null }),
  setWsError: (e) => set({ wsConnected: false, wsError: e }),

  // Live metrics snapshot
  metrics: null,
  setMetrics: (m) => set({ metrics: m }),

  // Connected clients (real TCP/UDP)
  clients: { tcp: [], udp: [], stats: { tcp_clients: 0, udp_clients: 0, total: 0 } },
  setClients: (c) => set({ clients: c }),

  // Recent events feed (last 100)
  events: [],
  addEvent: (e) => set((s) => ({ events: [e, ...s.events].slice(0, 100) })),
  clearEvents: () => set({ events: [] }),

  // Topology
  topology: { nodes: [], edges: [] },
  setTopology: (t) => set({ topology: t }),

  // Notifications (toasts)
  notifications: [],
  addNotification: (n) => {
    const id = Date.now()
    set((s) => ({ notifications: [...s.notifications, { ...n, id }] }))
    setTimeout(() => {
      set((s) => ({ notifications: s.notifications.filter(x => x.id !== id) }))
    }, n.duration || 4000)
  },
  removeNotification: (id) => set((s) => ({
    notifications: s.notifications.filter(x => x.id !== id)
  })),
}))
