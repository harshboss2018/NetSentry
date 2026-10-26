import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Sidebar from './components/layout/Sidebar'
import TopNav from './components/layout/TopNav'
import ToastContainer from './components/shared/ToastContainer'
import { useWebSocket } from './hooks/useWebSocket'

// Pages
import Dashboard from './pages/Dashboard'
import Topology from './pages/Topology'
import Connections from './pages/Connections'
import RoutingLab from './pages/RoutingLab'
import PerformanceLab from './pages/PerformanceLab'
import SecurityEvents from './pages/SecurityEvents'
import IPTools from './pages/IPTools'
import SettingsPage from './pages/Settings'

function AppShell() {
  useWebSocket() // Initialize WebSocket connection at app root

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg-base)' }}>
      <Sidebar />
      <div style={{ flex: 1, marginLeft: 220, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        <TopNav />
        <main style={{ flex: 1, padding: '24px', overflowY: 'auto' }}>
          <Routes>
            <Route path="/"            element={<Dashboard />} />
            <Route path="/topology"    element={<Topology />} />
            <Route path="/connections" element={<Connections />} />
            <Route path="/routing"     element={<RoutingLab />} />
            <Route path="/performance" element={<PerformanceLab />} />
            <Route path="/security"    element={<SecurityEvents />} />
            <Route path="/tools"       element={<IPTools />} />
            <Route path="/settings"    element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
      <ToastContainer />
    </div>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  )
}
