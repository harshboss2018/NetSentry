"""Topology router — Module B: Interactive Network Topology."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.network_graph import graph
from ws.manager import manager

router = APIRouter(prefix="/topology", tags=["topology"])


class NodeCreate(BaseModel):
    label: str
    type: str = "client"  # client|server|router|switch
    ip: str | None = None
    x: float = 0
    y: float = 0


class EdgeCreate(BaseModel):
    source: str
    target: str
    weight: float = 1.0
    latency_ms: float = 1.0
    bandwidth_mbps: float = 100.0


@router.get("")
async def get_topology():
    """Return the full virtual network graph."""
    return graph.to_dict()


@router.post("/nodes")
async def add_node(body: NodeCreate):
    node = graph.add_node(body.model_dump())
    await manager.broadcast("topology_changed", {"action": "node_added", "node": node})
    return node


@router.delete("/nodes/{node_id}")
async def delete_node(node_id: str):
    ok = graph.remove_node(node_id)
    if not ok:
        raise HTTPException(404, f"Node '{node_id}' not found")
    await manager.broadcast("topology_changed", {"action": "node_removed", "node_id": node_id})
    return {"deleted": node_id}


@router.post("/edges")
async def add_edge(body: EdgeCreate):
    edge = graph.add_edge(body.model_dump())
    await manager.broadcast("topology_changed", {"action": "edge_added", "edge": edge})
    return edge


@router.patch("/links/{edge_id}/toggle")
async def toggle_link(edge_id: str):
    edge = graph.toggle_link(edge_id)
    if not edge:
        raise HTTPException(404, f"Edge '{edge_id}' not found")
    await manager.broadcast("topology_changed", {"action": "link_toggled", "edge": edge})
    return edge


@router.post("/reset")
async def reset_topology():
    """Reset to the default pre-built topology."""
    graph._load_default()
    await manager.broadcast("topology_changed", {"action": "reset"})
    return graph.to_dict()
