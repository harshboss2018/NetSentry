# NetSentry — Interactive Network Monitoring & Resilience Lab

NetSentry is a full-stack, production-minded Computer Networks engineering application built for coursework at Army Institute of Technology, Pune under the SPPU curriculum.

It combines real-time network monitoring, real asynchronous TCP and UDP socket communication, an interactive virtual network topology canvas with Dijkstra and Distance-Vector routing, empirical and simulated performance testing, application-level security rules, and IPv4/DNS utilities.

---

## Key Modules

- **Module A — Network Dashboard:** Real-time host metrics (CPU, RAM, network I/O, active interfaces), connection counters, and live event stream over WebSockets.
- **Module B — Interactive Network Topology:** Drag-and-drop virtual graph built with React Flow. Click links to toggle failure states and observe real-time topology updates.
- **Module C — Real TCP & UDP Sockets:** Native asynchronous Python socket servers on ports 9001 (TCP) and 9002 (UDP) supporting multiple concurrent connections with echo latency measurement.
- **Module D — Routing & Resilience Lab:** Link-state (Dijkstra) and Distance-Vector (Bellman-Ford) routing with full convergence round traces and simulated link failures.
- **Module E — Performance Lab:** Empirical TCP round-trip latency testing with interactive charts, plus simulated delay and packet-loss experiment modeling.
- **Module F — Security & Event Monitoring:** Application-level IP and CIDR allow/block rules, connection rate anomaly detection, and searchable audit logging.
- **Module G — IP & DNS Utilities:** IPv4 subnet calculator (network, broadcast, usable host range, wildcard mask), live DNS resolver, reverse DNS lookup, and IP validator.

---

## Architecture

```
Frontend (React + Vite + Tailwind CSS + React Flow + Recharts)
                              │
                    HTTP REST / WebSockets
                              ▼
        FastAPI ASGI Backend (Python 3.11 / 3.12 / 3.13)
        ├── SQLite DB (Events, Rules, Experiments)
        ├── In-Memory Virtual Topology Model
        ├── Routing Engine (Dijkstra + Bellman-Ford)
        ├── Security Engine (CIDR Matching + Rate Limiting)
        ├── Metrics Collector (psutil)
        │
        ├── Real TCP Server (0.0.0.0:9001)  <── Real TCP Clients
        └── Real UDP Server (0.0.0.0:9002)  <── Real UDP Datagrams
```

---

## Quickstart Guide

### 1. Prerequisites
- Python 3.11+ (tested on Python 3.13)
- Node.js 18+ and npm
- Windows 10/11

### 2. One-Click Launch (Unified Production Mode)
Double-click `run_netsentry.bat` or run in terminal:
```bash
.\run_netsentry.bat
```
Open your browser at: **`http://localhost:8000`**

### 3. Development Mode (Hot Reloading)

**Terminal 1 — Backend:**
```powershell
cd backend
.\venv\Scripts\uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

**Terminal 2 — Frontend:**
```powershell
cd frontend
npm run dev
```
Open your browser at: **`http://localhost:5173`**

---

## Testing Real Sockets (Single Laptop or Multi-Laptop)

### Local Test (Same Laptop)
In a separate terminal, launch the TCP test client:
```powershell
python client/tcp_client.py
```
Or the UDP test client:
```powershell
python client/udp_client.py
```
Type any message and press Enter. The message is echoed with real-time millisecond RTT, and the connection appears instantly on the web dashboard.

### Multi-Laptop Demonstration (Over College Wi-Fi / LAN)

1. Find the host laptop's local IPv4 address:
   ```powershell
   ipconfig
   # Look for "IPv4 Address", e.g., 192.168.1.45
   ```
2. Allow incoming traffic through Windows Firewall (Run PowerShell as Administrator):
   ```powershell
   netsh advfirewall firewall add rule name="NetSentry-Web" dir=in action=allow protocol=TCP localport=8000 profile=private
   netsh advfirewall firewall add rule name="NetSentry-TCP" dir=in action=allow protocol=TCP localport=9001 profile=private
   netsh advfirewall firewall add rule name="NetSentry-UDP" dir=in action=allow protocol=UDP localport=9002 profile=private
   ```
3. From secondary laptops on the same Wi-Fi network:
   - **View Dashboard:** Open browser to `http://<HOST-IP>:8000`
   - **Connect TCP Client:**
     ```powershell
     python tcp_client.py --host <HOST-IP>
     ```
   - **Send UDP Datagrams:**
     ```powershell
     python udp_client.py --host <HOST-IP>
     ```

---

## Automated Verification Suite

To verify that all components (Database, Security Rules, Dijkstra, Distance-Vector, Subnetting, Real TCP, Real UDP) are functioning correctly:
```powershell
cd backend
.\venv\Scripts\python test_suite.py
```

All 6 test stages will execute and report passing status.

---

## Academic Reference

For SPPU curriculum mappings, algorithm proofs, viva questions, and presentation talking points, refer to:
[ACADEMIC_GUIDE.md](file:///d:/CN/netsentry/ACADEMIC_GUIDE.md)
