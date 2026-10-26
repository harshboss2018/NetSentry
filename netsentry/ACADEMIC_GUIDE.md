# NetSentry — Academic & Technical Evaluation Guide

**Project Name:** NetSentry — Interactive Network Monitoring & Resilience Lab  
**Institution:** Army Institute of Technology, Pune  
**Affiliation:** Savitribai Phule Pune University (SPPU)  
**Curriculum:** TE/BE Computer Engineering — Computer Networks  

---

## 1. Executive Summary & Architectural Overview

NetSentry is an engineering platform designed for real-time network monitoring, transport-layer socket communication, virtual graph-based resilience simulation, application security filtering, and IP addressing analysis.

Unlike mock dashboards or static Cisco Packet Tracer files, NetSentry executes **real asynchronous socket servers** alongside an **isolated mathematical network simulation engine**:

```
+-----------------------------------------------------------------------------------+
|                                 USER BROWSER                                      |
|             React 18 + Tailwind CSS + React Flow + Recharts                       |
+-----------------------------------------+-----------------------------------------+
                                          |
                        HTTP REST / WebSocket ws://:8000
                                          |
+-----------------------------------------v-----------------------------------------+
|                              FASTAPI ASGI BACKEND                                 |
|                                                                                   |
|  +--------------------+  +--------------------+  +------------------------------+  |
|  | In-Memory Graph    |  | SQLite Persistent  |  | WebSocket Broadcast Manager  |  |
|  | - Nodes & Edges    |  | - Events Log       |  | - Client registries          |  |
|  | - Dijkstra Path    |  | - Security Rules   |  | - CPU/Mem/Network stats      |  |
|  | - Distance Vector  |  | - Experiments Hist |  | - Live event stream          |  |
|  +--------------------+  +--------------------+  +------------------------------+  |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Application-Layer Security Engine                                           |  |
|  | - Rate limiting (anti-flood anomaly detection)                              |  |
|  | - IP / CIDR allow & block rules (evaluated prior to payload processing)      |  |
|  +-----------------------------------------------------------------------------+  |
+-------------------+-----------------------------------------+---------------------+
                    |                                         |
     TCP Socket Port 9001                      UDP Datagram Port 9002
                    |                                         |
+-------------------v-------------------+ +-------------------v---------------------+
|      Real TCP Client Sockets          | |     Real UDP Datagram Sockets           |
| (tcp_client.py / external laptops)   | | (udp_client.py / external laptops)        |
+---------------------------------------+ +-----------------------------------------+
```

---

## 2. SPPU Computer Networks Curriculum Mapping

| SPPU CN Unit | Unit Title | Covered Concepts in NetSentry | Implementation in NetSentry |
|---|---|---|---|
| **Unit III** | **Network Layer** | IPv4 Addressing, Subnetting, CIDR, Network Classes, Loopback & Private Spaces | Module G (`backend/services/ip_utils.py` & `frontend/src/pages/IPTools.jsx`). Strict CIDR parsing, usable host calculation, mask derivation. |
| **Unit III** | **Routing Protocols** | Link-State (Dijkstra) & Distance-Vector (Bellman-Ford), Link Failures, Convergence | Module D (`backend/services/routing_engine.py` & `frontend/src/pages/RoutingLab.jsx`). Step-by-step convergence trace and dynamic rerouting around down links. |
| **Unit IV** | **Transport Layer** | TCP vs UDP, Connection-Oriented vs Connectionless, Sockets, RTT Latency, Jitter, Loss | Module C (`backend/services/socket_engine.py`, `client/tcp_client.py`, `client/udp_client.py`). Real BSD-style sockets on ports 9001 and 9002. |
| **Unit IV** | **Network Performance** | Round-Trip Time (RTT), Throughput, Packet Loss Simulation | Module E (`backend/services/metrics.py` & `frontend/src/pages/PerformanceLab.jsx`). Empirical RTT test with charts + mathematical loss models. |
| **Unit V** | **Application Layer** | DNS (Domain Name System), Resource Records, Forward & Reverse Lookups | Module G (`backend/services/dns_resolver.py` & `frontend/src/pages/IPTools.jsx`). Python `dnspython` integration for live A/PTR resolution. |
| **Unit VI** | **Network Security** | Access Control Lists (ACLs), Allow/Block Rules, Anomaly/Flooding Detection | Module F (`backend/services/security_engine.py` & `frontend/src/pages/SecurityEvents.jsx`). CIDR subnet matching, priority evaluation, rate-limiting. |

---

## 3. Key Architectural Distinction: Real Sockets vs Browser WebSockets

A common question asked by examiners is: **"Why do you use WebSockets if you claim to demonstrate TCP and UDP?"**

NetSentry maintains a clear, rigorous architectural separation:
1. **Browser WebSockets (`ws://localhost:8000/ws`):**
   - The browser sandbox forbids raw TCP and UDP socket manipulation due to web security models.
   - WebSockets provide a full-duplex framing protocol over HTTP to stream live telemetry, server CPU/memory metrics, and event logs to the UI.
2. **Real Socket Servers (`0.0.0.0:9001` TCP, `0.0.0.0:9002` UDP):**
   - Created with Python's native `asyncio.start_server` and `create_datagram_endpoint`.
   - External CLI clients or physical laptops open real BSD OS sockets over the network to exchange raw frames/packets, perform handshakes, and measure true hardware latency.

---

## 4. Academic Viva Voce: Top 15 Questions & Answers

### Q1: What is the primary difference between Dijkstra and Distance Vector algorithms?
**Answer:** Dijkstra is a **link-state algorithm** requiring complete global topology information (each router floods link-state advertisements so all nodes have an identical topology map). Distance-Vector (Bellman-Ford) is **decentralized and iterative**: each router knows only the cost to its immediate neighbors and periodically shares its distance vector. In NetSentry, the Routing Lab visually shows Dijkstra computing the tree in $O(V^2)$ / $O(E \log V)$ and Distance-Vector converging over multiple exchange rounds.

### Q2: How does NetSentry simulate a link failure without disrupting the laptop's internet connection?
**Answer:** NetSentry isolates physical network interfaces from virtual topology graphs. The virtual network is modeled in `services/network_graph.py` as an in-memory graph $G=(V, E)$. Toggling a link changes edge status in memory from `up` to `down` and recalculates shortest paths. It does **not** alter the Windows OS routing table (`route print`), ensuring complete system safety.

### Q3: Why does TCP require a 3-way handshake while UDP does not?
**Answer:** TCP is a connection-oriented, reliable byte-stream protocol. The SYN, SYN-ACK, ACK sequence synchronizes initial sequence numbers (ISNs), negotiates buffer parameters (MSS, window scale), and confirms mutual reachability. UDP is connectionless and message-oriented; it immediately transmits datagrams without state establishment, trading reliability for lower overhead and lower latency.

### Q4: How is application-level security implemented in NetSentry?
**Answer:** The security engine implements a two-tier filter:
1. **Rate Limiting:** A sliding window queue tracks connection timestamps per IP address. If connection frequency exceeds threshold (e.g. 10 conns/min), connections are dropped to prevent denial-of-service floods.
2. **CIDR Access Control:** Stored rules in SQLite match client IP addresses using subnet mask bitwise comparisons (`target_ip in ip_network(rule)`). Block rules take precedence over allow rules.

### Q5: How is Subnetting and CIDR calculated mathematically?
**Answer:** In IPv4, CIDR notation `/n` specifies that the first $n$ bits constitute the network prefix and the remaining $32-n$ bits constitute the host identifier. The total addresses are $2^{32-n}$, and usable hosts are $2^{32-n} - 2$ (excluding the network address where host bits are all 0, and the broadcast address where host bits are all 1).

### Q6: What is the difference between latency, jitter, and throughput?
**Answer:** 
- **Latency (RTT):** The time required for a packet to travel from source to destination and return.
- **Jitter:** The statistical variance in packet arrival delay over time.
- **Throughput:** The actual rate of successful data delivery over a communication channel (measured in bps or KB/s).

---

## 5. Live Demonstration Script for Examiners

1. **Start System:** Run `run_netsentry.bat`. Open `http://localhost:8000`. Show the green status indicator and active interface IPs.
2. **Demonstrate Real Socket Communication:**
   - Open a terminal and run `python client/tcp_client.py`.
   - Observe the `client_connected` event appear instantaneously in the Live Events feed via WebSocket.
   - Send `Hello Examiner` from the client; show the real-time RTT measurement in milliseconds and the server timestamp.
3. **Demonstrate Virtual Topology & Dynamic Rerouting:**
   - Navigate to **Topology** or **Routing Lab**.
   - Compute shortest path from `Client-1 (c1)` to `Server-A (s1)`. Show optimal path: `c1 -> r3 -> r1 -> s1` with cost `6.0`.
   - Click to disable link `r1 <-> r3`.
   - Recompute path: the algorithm dynamically reroutes via `r2`: `c1 -> r3 -> r2 -> r1 -> s1` with cost `16.0`.
4. **Demonstrate Application Security:**
   - Go to **Security & Events** -> **Rules**.
   - Add a Block rule for `127.0.0.1` on TCP.
   - Attempt to run `python client/tcp_client.py` again.
   - The connection is immediately rejected, and a `security_block` warning appears in the security audit log.
5. **Demonstrate IP Tools:**
   - Go to **IP & DNS Tools**. Enter `192.168.10.0/27`.
   - Explain network address, broadcast address, and the 30 usable host range to the examiner.
