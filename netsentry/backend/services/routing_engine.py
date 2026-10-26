"""
routing_engine.py — Virtual routing algorithms (simulated, NOT OS routing).

Implements:
  1. Dijkstra's Shortest Path (Link-State concept)
  2. Distance-Vector (Bellman-Ford) with step-by-step trace

These operate on the virtual NetworkGraph. Results are purely
mathematical simulations for educational demonstration.
"""
import heapq
import math
from typing import Any


# ── Dijkstra's Shortest Path ─────────────────────────────────────────────────
def dijkstra(adj: dict[str, list], src: str, dst: str) -> dict[str, Any]:
    """
    Standard Dijkstra on weighted adjacency list.
    Returns path, total cost, and hop count.
    data_source = 'simulated'
    """
    dist = {n: math.inf for n in adj}
    prev: dict[str, str | None] = {n: None for n in adj}
    dist[src] = 0
    pq = [(0.0, src)]

    while pq:
        d, u = heapq.heappop(pq)
        if d > dist[u]:
            continue
        for v, w in adj.get(u, []):
            nd = dist[u] + w
            if nd < dist[v]:
                dist[v] = nd
                prev[v] = u
                heapq.heappush(pq, (nd, v))

    if dist.get(dst, math.inf) == math.inf:
        return {"reachable": False, "path": [], "cost": None, "hops": 0, "data_source": "simulated"}

    # Reconstruct path
    path, cur = [], dst
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    path.reverse()

    return {
        "reachable": True,
        "path": path,
        "cost": dist[dst],
        "hops": len(path) - 1,
        "algorithm": "dijkstra",
        "data_source": "simulated",
    }


# ── Distance-Vector (Bellman-Ford) with step trace ──────────────────────────
def distance_vector(adj: dict[str, list], src: str, dst: str) -> dict[str, Any]:
    """
    Bellman-Ford from src. Records each relaxation step for UI visualization.
    Returns final path + per-step convergence trace.
    data_source = 'simulated'
    """
    nodes = list(adj.keys())
    dist = {n: math.inf for n in nodes}
    prev: dict[str, str | None] = {n: None for n in nodes}
    dist[src] = 0

    steps = []  # Each step: {round, updated_nodes, dist_snapshot}

    # Build edge list from adjacency
    edges = []
    for u, neighbors in adj.items():
        for v, w in neighbors:
            edges.append((u, v, w))

    for rnd in range(len(nodes) - 1):
        updated = []
        for u, v, w in edges:
            if dist[u] != math.inf and dist[u] + w < dist[v]:
                dist[v] = dist[u] + w
                prev[v] = u
                updated.append({"node": v, "via": u, "new_cost": dist[v]})
        steps.append({
            "round": rnd + 1,
            "updates": updated,
            "dist_snapshot": {k: (v if v != math.inf else None) for k, v in dist.items()},
        })
        if not updated:
            break  # Converged early

    if dist.get(dst, math.inf) == math.inf:
        return {
            "reachable": False, "path": [], "cost": None,
            "hops": 0, "steps": steps, "data_source": "simulated",
        }

    path, cur = [], dst
    while cur is not None:
        path.append(cur)
        cur = prev[cur]
    path.reverse()

    return {
        "reachable": True,
        "path": path,
        "cost": dist[dst],
        "hops": len(path) - 1,
        "algorithm": "distance_vector",
        "steps": steps,
        "data_source": "simulated",
    }


# ── All-pairs routing tables ─────────────────────────────────────────────────
def compute_routing_tables(adj: dict[str, list]) -> dict[str, dict]:
    """Compute Dijkstra from every node → full routing tables."""
    tables = {}
    for src in adj:
        row = {}
        for dst in adj:
            if src == dst:
                continue
            r = dijkstra(adj, src, dst)
            row[dst] = {
                "next_hop": r["path"][1] if r["reachable"] and len(r["path"]) > 1 else None,
                "cost": r["cost"],
                "hops": r["hops"],
                "reachable": r["reachable"],
            }
        tables[src] = row
    return tables
