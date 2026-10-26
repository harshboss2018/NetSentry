"""
dns_resolver.py — DNS forward and reverse lookup utilities.
Uses non-blocking executor thread with timeouts and safe error catching.
"""
import socket
import asyncio
from typing import Any


async def lookup_hostname(hostname: str, timeout: float = 5.0) -> dict[str, Any]:
    """Forward DNS lookup: hostname → IP addresses."""
    target = hostname.strip()
    if not target:
        return {"hostname": "", "addresses": [], "success": False, "error": "Empty hostname", "data_source": "real"}

    try:
        loop = asyncio.get_running_loop()
        results = await asyncio.wait_for(
            loop.run_in_executor(None, socket.getaddrinfo, target, None),
            timeout=timeout,
        )
        ips = sorted(list({r[4][0] for r in results}))
        return {
            "hostname": target,
            "addresses": ips,
            "count": len(ips),
            "success": True,
            "data_source": "real",
        }
    except asyncio.TimeoutError:
        return {"hostname": target, "addresses": [], "success": False,
                "error": "DNS resolution timed out (resolver unreachable)", "data_source": "real"}
    except socket.gaierror as e:
        return {"hostname": target, "addresses": [], "success": False,
                "error": f"Address resolution failed: {e.strerror}", "data_source": "real"}
    except Exception as e:
        return {"hostname": target, "addresses": [], "success": False,
                "error": str(e), "data_source": "real"}


async def reverse_lookup(ip: str, timeout: float = 5.0) -> dict[str, Any]:
    """Reverse DNS lookup: IP → hostname."""
    target = ip.strip()
    if not target:
        return {"ip": "", "hostname": None, "success": False, "error": "Empty IP", "data_source": "real"}

    try:
        loop = asyncio.get_running_loop()
        result = await asyncio.wait_for(
            loop.run_in_executor(None, socket.gethostbyaddr, target),
            timeout=timeout,
        )
        return {
            "ip": target,
            "hostname": result[0],
            "aliases": result[1],
            "success": True,
            "data_source": "real",
        }
    except asyncio.TimeoutError:
        return {"ip": target, "hostname": None, "success": False,
                "error": "Reverse DNS timed out", "data_source": "real"}
    except socket.herror as e:
        return {"ip": target, "hostname": None, "success": False,
                "error": f"Host not found: {e.strerror}", "data_source": "real"}
    except Exception as e:
        return {"ip": target, "hostname": None, "success": False,
                "error": str(e), "data_source": "real"}
