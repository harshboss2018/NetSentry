"""
metrics.py — Host system metrics collection using psutil.
Returns real measured values from the local machine.
Non-blocking and calculates bandwidth rates (KB/s).
"""
import time
import psutil
from datetime import datetime
from typing import Any

_start_time = time.time()
_last_sample_time = time.time()
_last_bytes_sent = 0
_last_bytes_recv = 0

# Initialize psutil non-blocking baseline
try:
    psutil.cpu_percent(interval=None)
    _initial_net = psutil.net_io_counters()
    _last_bytes_sent = _initial_net.bytes_sent
    _last_bytes_recv = _initial_net.bytes_recv
except Exception:
    pass


def get_system_snapshot() -> dict[str, Any]:
    """
    Collect current CPU, RAM, and network I/O metrics non-blocking.
    Calculates network transfer rates (KB/s) based on elapsed time.
    """
    global _last_sample_time, _last_bytes_sent, _last_bytes_recv

    now = time.time()
    elapsed = max(now - _last_sample_time, 0.001)
    _last_sample_time = now

    net = psutil.net_io_counters()
    mem = psutil.virtual_memory()
    # interval=None is non-blocking (computes since last call)
    cpu = psutil.cpu_percent(interval=None)

    # Compute transfer rates
    bytes_sent_delta = max(0, net.bytes_sent - _last_bytes_sent)
    bytes_recv_delta = max(0, net.bytes_recv - _last_bytes_recv)
    _last_bytes_sent = net.bytes_sent
    _last_bytes_recv = net.bytes_recv

    kb_sent_per_sec = round((bytes_sent_delta / elapsed) / 1024, 2)
    kb_recv_per_sec = round((bytes_recv_delta / elapsed) / 1024, 2)

    interfaces = {}
    try:
        for iface, addrs in psutil.net_if_addrs().items():
            for addr in addrs:
                if addr.family.name == "AF_INET":
                    interfaces[iface] = addr.address
                    break
    except Exception:
        pass

    return {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "uptime_seconds": int(now - _start_time),
        "cpu_percent": round(cpu, 1),
        "memory_percent": round(mem.percent, 1),
        "memory_used_mb": round(mem.used / 1024 / 1024, 1),
        "memory_total_mb": round(mem.total / 1024 / 1024, 1),
        "net_bytes_sent": net.bytes_sent,
        "net_bytes_recv": net.bytes_recv,
        "net_kb_sent_per_sec": kb_sent_per_sec,
        "net_kb_recv_per_sec": kb_recv_per_sec,
        "net_packets_sent": net.packets_sent,
        "net_packets_recv": net.packets_recv,
        "interfaces": interfaces,
        "data_source": "real",
    }
