"""
network_graph.py — Virtual network topology model.

This is a pure in-memory simulation layer. It has NO effect on the
Windows OS routing table or real network interfaces. Changes here
are mathematical and visual only.

Graph structure:
  nodes: dict[id, NodeData]
  edges: dict[id, EdgeData]
"""
import json
import uuid
from typing import Any

# ── Type aliases ─────────────────────────────────────────────────────────────
NodeData = dict[str, Any]
EdgeData = dict[str, Any]


class NetworkGraph:
    def __init__(self):
        self.nodes: dict[str, NodeData] = {}
        self.edges: dict[str, EdgeData] = {}
        self._load_default()

    # ── Default topology ─────────────────────────────────────────────────────
    def _load_default(self):
        """Pre-built demo topology: 3 routers, 4 clients, 2 servers."""
        default_nodes = [
            # Routers
            {"id": "r1", "label": "Router-1", "type": "router", "ip": "10.0.1.1", "status": "up", "x": 400, "y": 200},
            {"id": "r2", "label": "Router-2", "type": "router", "ip": "10.0.2.1", "status": "up", "x": 650, "y": 350},
            {"id": "r3", "label": "Router-3", "type": "router", "ip": "10.0.3.1", "status": "up", "x": 150, "y": 350},
            # Servers
            {"id": "s1", "label": "Server-A",  "type": "server", "ip": "10.0.1.10", "status": "up", "x": 400, "y": 50},
            {"id": "s2", "label": "Server-B",  "type": "server", "ip": "10.0.2.10", "status": "up", "x": 800, "y": 200},
            # Clients
            {"id": "c1", "label": "Client-1",  "type": "client", "ip": "10.0.3.11", "status": "up", "x": 50,  "y": 500},
            {"id": "c2", "label": "Client-2",  "type": "client", "ip": "10.0.3.12", "status": "up", "x": 200, "y": 500},
            {"id": "c3", "label": "Client-3",  "type": "client", "ip": "10.0.2.11", "status": "up", "x": 600, "y": 500},
            {"id": "c4", "label": "Client-4",  "type": "client", "ip": "10.0.2.12", "status": "up", "x": 750, "y": 500},
        ]
        default_edges = [
            {"id": "e1",  "source": "r1", "target": "r2", "weight": 5,  "latency_ms": 5,  "bandwidth_mbps": 100, "status": "up"},
            {"id": "e2",  "source": "r1", "target": "r3", "weight": 3,  "latency_ms": 3,  "bandwidth_mbps": 100, "status": "up"},
            {"id": "e3",  "source": "r2", "target": "r3", "weight": 8,  "latency_ms": 8,  "bandwidth_mbps": 50,  "status": "up"},
            {"id": "e4",  "source": "s1", "target": "r1", "weight": 1,  "latency_ms": 1,  "bandwidth_mbps": 1000,"status": "up"},
            {"id": "e5",  "source": "s2", "target": "r2", "weight": 1,  "latency_ms": 1,  "bandwidth_mbps": 1000,"status": "up"},
            {"id": "e6",  "source": "c1", "target": "r3", "weight": 2,  "latency_ms": 2,  "bandwidth_mbps": 100, "status": "up"},
            {"id": "e7",  "source": "c2", "target": "r3", "weight": 2,  "latency_ms": 2,  "bandwidth_mbps": 100, "status": "up"},
            {"id": "e8",  "source": "c3", "target": "r2", "weight": 2,  "latency_ms": 2,  "bandwidth_mbps": 100, "status": "up"},
            {"id": "e9",  "source": "c4", "target": "r2", "weight": 2,  "latency_ms": 2,  "bandwidth_mbps": 100, "status": "up"},
        ]
        for n in default_nodes:
            self.nodes[n["id"]] = n
        for e in default_edges:
            self.edges[e["id"]] = e

    # ── CRUD ─────────────────────────────────────────────────────────────────
    def add_node(self, data: dict) -> NodeData:
        nid = data.get("id") or str(uuid.uuid4())[:8]
        node = {"id": nid, "status": "up", **data}
        self.nodes[nid] = node
        return node

    def remove_node(self, node_id: str) -> bool:
        if node_id not in self.nodes:
            return False
        del self.nodes[node_id]
        # Remove connected edges
        to_del = [eid for eid, e in self.edges.items()
                  if e["source"] == node_id or e["target"] == node_id]
        for eid in to_del:
            del self.edges[eid]
        return True

    def add_edge(self, data: dict) -> EdgeData:
        eid = data.get("id") or str(uuid.uuid4())[:8]
        edge = {"id": eid, "status": "up", "weight": 1, "latency_ms": 1,
                "bandwidth_mbps": 100, **data}
        self.edges[eid] = edge
        return edge

    def toggle_link(self, edge_id: str) -> EdgeData | None:
        if edge_id not in self.edges:
            return None
        e = self.edges[edge_id]
        e["status"] = "down" if e["status"] == "up" else "up"
        return e

    def set_link_status(self, edge_id: str, status: str) -> EdgeData | None:
        if edge_id not in self.edges:
            return None
        self.edges[edge_id]["status"] = status
        return self.edges[edge_id]

    # ── Serialization ─────────────────────────────────────────────────────────
    def to_dict(self) -> dict:
        return {
            "nodes": list(self.nodes.values()),
            "edges": list(self.edges.values()),
            "data_source": "simulated",
        }

    def to_json(self) -> tuple[str, str]:
        return json.dumps(list(self.nodes.values())), json.dumps(list(self.edges.values()))

    def load_from_json(self, nodes_json: str, edges_json: str):
        self.nodes = {n["id"]: n for n in json.loads(nodes_json)}
        self.edges = {e["id"]: e for e in json.loads(edges_json)}

    # ── Adjacency for routing ─────────────────────────────────────────────────
    def active_adjacency(self) -> dict[str, list[tuple[str, float]]]:
        """Returns adjacency list considering only 'up' edges."""
        adj: dict[str, list] = {nid: [] for nid in self.nodes}
        for e in self.edges.values():
            if e["status"] == "up":
                w = float(e.get("weight", 1))
                adj[e["source"]].append((e["target"], w))
                adj[e["target"]].append((e["source"], w))
        return adj


# Singleton
graph = NetworkGraph()
