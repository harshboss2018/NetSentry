import asyncio
import sys
import os
import json
import socket

# Ensure unbuffered stdout
sys.stdout.reconfigure(line_buffering=True)
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from database import init_db, AsyncSessionLocal
from models import Event, Experiment, SecurityRule, TopologySnapshot
from services.network_graph import graph
from services.routing_engine import dijkstra, distance_vector
from services.security_engine import security_engine
from services.ip_utils import calculate_subnet, validate_ip
from services import socket_engine
from config import TCP_PORT, UDP_PORT

def test_udp_sync():
    """Runs in a separate thread so asyncio loop is not blocked."""
    s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    s.settimeout(3.0)
    s.sendto(b"UDP_PING: NetSentry Test", ("127.0.0.1", UDP_PORT))
    data, addr = s.recvfrom(1024)
    s.close()
    return data

async def run_tests():
    print("=" * 60)
    print("NetSentry Automated Verification Suite")
    print("=" * 60)

    # 1. Database Initialization
    print("[1/6] Testing Database initialization...")
    await init_db()
    async with AsyncSessionLocal() as session:
        rule = SecurityRule(rule_type="block", target="10.99.99.99", protocol="*", description="Test Block Rule")
        session.add(rule)
        await session.commit()
    print("  -> Database tables initialized and test record saved successfully.")

    # 2. Security Engine
    print("[2/6] Testing Security Engine (Rules & Access Control)...")
    security_engine.load_rules([
        {"id": 1, "rule_type": "block", "target": "10.99.99.99", "protocol": "*", "description": "Test Block", "enabled": True}
    ])
    allowed_1, reason_1 = await security_engine.check("192.168.1.50", "TCP")
    assert allowed_1 is True, f"Failed: {reason_1}"
    allowed_2, reason_2 = await security_engine.check("10.99.99.99", "TCP")
    assert allowed_2 is False, f"Failed: expected blocked but got {allowed_2}"
    print(f"  -> Security rule verified: 10.99.99.99 blocked ({reason_2}).")

    # 3. Topology & Routing Algorithms
    print("[3/6] Testing Network Topology & Routing (Dijkstra + Distance Vector)...")
    adj = graph.active_adjacency()
    nodes = list(graph.nodes.values())
    assert len(nodes) >= 6, f"Expected at least 6 nodes, got {len(nodes)}"

    # Dijkstra test: c1 (Client-1) to s1 (Server-A)
    dijkstra_res = dijkstra(adj, "c1", "s1")
    assert dijkstra_res["reachable"] is True, "Dijkstra failed to find path from c1 to s1"
    print(f"  -> Dijkstra: Path={dijkstra_res['path']}, Cost={dijkstra_res['cost']}, Hops={dijkstra_res['hops']}")

    # Distance Vector test: c1 to s1
    dv_res = distance_vector(adj, "c1", "s1")
    assert dv_res["reachable"] is True, "Distance Vector failed to find path"
    print(f"  -> Distance Vector: Path={dv_res['path']}, Converged in {len(dv_res['steps'])} rounds.")

    # Link failure test: disable edge e2 (r1 <-> r3) and re-evaluate
    edge = graph.toggle_link("e2")
    assert edge["status"] == "down", "Link toggle failed"
    adj_after = graph.active_adjacency()
    dijkstra_rerouted = dijkstra(adj_after, "c1", "s1")
    print(f"  -> Post-failure reroute: Path={dijkstra_rerouted['path']}, Cost={dijkstra_rerouted['cost']}")
    # Restore link
    graph.toggle_link("e2")

    # 4. IP / Subnet Utilities
    print("[4/6] Testing IP & Subnetting calculation...")
    sub = calculate_subnet("192.168.1.0/24")
    assert sub["network_address"] == "192.168.1.0"
    assert sub["broadcast_address"] == "192.168.1.255"
    assert sub["usable_hosts"] == 254
    print(f"  -> Subnet calc: {sub['input']} -> Usable hosts: {sub['first_host']} to {sub['last_host']} ({sub['usable_hosts']} total)")

    ip_info = validate_ip("127.0.0.1")
    assert ip_info["valid"] is True and ip_info["is_loopback"] is True
    print(f"  -> IP Validate: 127.0.0.1 (Loopback: {ip_info['is_loopback']}, Private: {ip_info['is_private']})")

    # 5. Socket Engine (Real TCP & UDP Sockets)
    print("[5/6] Testing Real TCP & UDP Socket Servers...")
    async def dummy_event(evt, data):
        pass
    async def dummy_sec(ip, proto):
        return await security_engine.check(ip, proto)
    socket_engine.register_callbacks(dummy_event, dummy_sec)

    tcp_task = asyncio.create_task(socket_engine.start_tcp_server())
    udp_task = asyncio.create_task(socket_engine.start_udp_server())
    await asyncio.sleep(0.3)

    # Test TCP Client Connection using async StreamReader/StreamWriter
    reader, writer = await asyncio.open_connection("127.0.0.1", TCP_PORT)
    welcome = await reader.readline()
    assert b"NETSENTRY TCP SERVER" in welcome, f"Unexpected banner: {welcome}"

    test_msg = "PING: NetSentry Test\n"
    writer.write(test_msg.encode())
    await writer.drain()
    resp = await reader.readline()
    resp_data = json.loads(resp.decode().strip())
    assert resp_data.get("echo") == "PING: NetSentry Test", f"Unexpected TCP response: {resp}"
    print(f"  -> Real TCP socket communication verified: Sent '{test_msg.strip()}', Received '{resp_data}'")
    writer.close()
    await writer.wait_closed()

    # Test UDP Client running in a worker thread
    udp_raw = await asyncio.to_thread(test_udp_sync)
    resp_udp = json.loads(udp_raw.decode().strip())
    assert resp_udp.get("echo") == "UDP_PING: NetSentry Test", f"Unexpected UDP response: {udp_raw}"
    print(f"  -> Real UDP socket communication verified: Received '{resp_udp}'")

    tcp_task.cancel()
    udp_task.cancel()

    # 6. Summary
    print("[6/6] All components passed verification successfully!")
    print("=" * 60)

if __name__ == "__main__":
    asyncio.run(run_tests())
