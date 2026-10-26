"""
security_engine.py — Application-level security rules.

IMPORTANT: This is application-layer access control only.
It does NOT modify the Windows OS firewall, routing table,
or intercept traffic from other applications.

Optimizations:
  - Strict block precedence: evaluates all matching block rules first.
  - Rate-limit queue cleanup: prunes empty IP queues to prevent memory leaks.
"""
import asyncio
from collections import defaultdict, deque
from datetime import datetime, timedelta
from ipaddress import ip_address, ip_network
from config import MAX_CONNECTIONS_PER_MINUTE


class SecurityEngine:
    def __init__(self):
        # In-memory rule cache: list of {type, target, protocol, description, id}
        self._rules: list[dict] = []
        # Connection rate: ip → deque of timestamps
        self._rate: dict[str, deque] = defaultdict(deque)
        self._lock = asyncio.Lock()

    def load_rules(self, rules: list[dict]):
        """Refresh in-memory cache from DB records."""
        self._rules = [r for r in rules if r.get("enabled", True)]

    def add_rule_cache(self, rule: dict):
        self._rules.append(rule)

    def remove_rule_cache(self, rule_id: int):
        self._rules = [r for r in self._rules if r.get("id") != rule_id]

    async def check(self, client_ip: str, protocol: str) -> tuple[bool, str]:
        """
        Returns (allowed: bool, reason: str).
        Block rules take absolute priority over allow rules.
        """
        async with self._lock:
            now = datetime.utcnow()
            q = self._rate[client_ip]
            # Evict entries older than 1 minute
            while q and (now - q[0]) > timedelta(minutes=1):
                q.popleft()
            q.append(now)
            if len(q) > MAX_CONNECTIONS_PER_MINUTE:
                return False, f"Rate limit exceeded: {len(q)} connections/min"

            # Periodic cleanup of empty rate-limit queues
            if len(self._rate) > 500:
                empty_keys = [k for k, v in self._rate.items() if len(v) == 0]
                for k in empty_keys:
                    self._rate.pop(k, None)

        try:
            target_ip = ip_address(client_ip)
        except ValueError:
            return True, "bypass (invalid IP format)"

        # Priority Phase 1: Check ALL BLOCK rules first
        for rule in self._rules:
            if rule.get("rule_type") != "block":
                continue
            rule_proto = rule.get("protocol", "*")
            if rule_proto != "*" and rule_proto.upper() != protocol.upper():
                continue
            try:
                net = ip_network(rule["target"], strict=False)
                if target_ip in net:
                    desc = rule.get("description") or rule.get("target")
                    return False, f"Blocked by rule #{rule.get('id')}: {desc}"
            except ValueError:
                continue

        # Priority Phase 2: Check ALLOW rules (if any exist for this protocol)
        allow_rules = [r for r in self._rules if r.get("rule_type") == "allow"]
        for rule in allow_rules:
            rule_proto = rule.get("protocol", "*")
            if rule_proto != "*" and rule_proto.upper() != protocol.upper():
                continue
            try:
                net = ip_network(rule["target"], strict=False)
                if target_ip in net:
                    return True, f"Allowed by rule #{rule.get('id')}"
            except ValueError:
                continue

        return True, "default allow"


# Singleton
security_engine = SecurityEngine()
