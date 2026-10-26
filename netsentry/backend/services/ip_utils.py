"""
ip_utils.py — IPv4 subnet and CIDR calculation utilities.
Uses Python stdlib `ipaddress` module only.
Robust error handling for edge cases (/31, /32, loopbacks, private networks).
"""
import ipaddress
from typing import Any


def calculate_subnet(cidr: str) -> dict[str, Any]:
    """
    Given a CIDR string (e.g. '192.168.1.0/24'), returns full subnet breakdown.
    Raises ValueError on invalid input.
    data_source = 'calculated'
    """
    try:
        net = ipaddress.IPv4Network(cidr.strip(), strict=False)
    except Exception as e:
        raise ValueError(f"Invalid CIDR: {e}")

    hosts = list(net.hosts())
    first_host = str(hosts[0]) if hosts else str(net.network_address)
    last_host = str(hosts[-1]) if hosts else str(net.broadcast_address)

    return {
        "input": str(net),
        "network_address": str(net.network_address),
        "broadcast_address": str(net.broadcast_address),
        "subnet_mask": str(net.netmask),
        "wildcard_mask": str(net.hostmask),
        "prefix_length": net.prefixlen,
        "total_addresses": net.num_addresses,
        "usable_hosts": len(hosts),
        "first_host": first_host,
        "last_host": last_host,
        "ip_class": _get_class(str(net.network_address)),
        "is_private": net.is_private,
        "is_loopback": net.is_loopback,
        "data_source": "calculated",
    }


def validate_ip(ip: str) -> dict[str, Any]:
    try:
        addr = ipaddress.IPv4Address(ip.strip())
        return {
            "valid": True,
            "ip": str(addr),
            "is_private": addr.is_private,
            "is_loopback": addr.is_loopback,
            "is_multicast": addr.is_multicast,
            "is_global": addr.is_global,
            "ip_class": _get_class(str(addr)),
            "data_source": "calculated",
        }
    except Exception:
        return {"valid": False, "ip": ip, "data_source": "calculated"}


def _get_class(ip: str) -> str:
    try:
        first = int(ip.split(".")[0])
        if first == 127:
            return "A (Loopback)"
        elif first < 128:
            return "A"
        elif first < 192:
            return "B"
        elif first < 224:
            return "C"
        elif first < 240:
            return "D (Multicast)"
        return "E (Experimental)"
    except Exception:
        return "Unknown"
