"""Routing Lab router — Module D: Virtual routing and resilience."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.network_graph import graph
from services.routing_engine import dijkstra, distance_vector, compute_routing_tables
from ws.manager import manager

router = APIRouter(prefix="/routing", tags=["routing"])


class PathRequest(BaseModel):
    src: str
    dst: str
    algorithm: str = "dijkstra"  # dijkstra | distance_vector


class LinkFailureRequest(BaseModel):
    edge_id: str
    status: str = "down"  # down | up


@router.post("/path")
async def find_path(body: PathRequest):
    """Find shortest path between two virtual nodes."""
    adj = graph.active_adjacency()
    if body.src not in adj:
        raise HTTPException(404, f"Node '{body.src}' not in topology")
    if body.dst not in adj:
        raise HTTPException(404, f"Node '{body.dst}' not in topology")

    if body.algorithm == "distance_vector":
        result = distance_vector(adj, body.src, body.dst)
    else:
        result = dijkstra(adj, body.src, body.dst)

    return result


@router.post("/simulate-failure")
async def simulate_failure(body: LinkFailureRequest):
    """Toggle a virtual link up/down and return updated routing."""
    edge = graph.set_link_status(body.edge_id, body.status)
    if not edge:
        raise HTTPException(404, f"Edge '{body.edge_id}' not found")

    adj = graph.active_adjacency()
    tables = compute_routing_tables(adj)

    await manager.broadcast("topology_changed", {
        "action": "link_status_changed",
        "edge": edge,
        "routing_tables": tables,
    })
    return {
        "edge": edge,
        "routing_tables": tables,
        "data_source": "simulated",
    }


@router.get("/tables")
async def get_routing_tables():
    """Compute and return full routing tables for all virtual nodes."""
    adj = graph.active_adjacency()
    return {
        "tables": compute_routing_tables(adj),
        "data_source": "simulated",
    }
