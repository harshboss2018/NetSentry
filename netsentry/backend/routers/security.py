"""Security and Events router — Module F."""
import json
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc, and_
from database import get_db
from models.security_rule import SecurityRule
from models.event import Event
from services.security_engine import security_engine

router = APIRouter(prefix="/security", tags=["security"])


class RuleCreate(BaseModel):
    rule_type: str   # allow | block
    target: str      # IP or CIDR
    protocol: str = "*"
    description: str = ""


# ── Rules ────────────────────────────────────────────────────────────────────
@router.get("/rules")
async def list_rules(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SecurityRule).order_by(SecurityRule.created_at))
    rules = result.scalars().all()
    return [
        {"id": r.id, "rule_type": r.rule_type, "target": r.target,
         "protocol": r.protocol, "description": r.description,
         "enabled": r.enabled, "hit_count": r.hit_count,
         "created_at": r.created_at.isoformat() + "Z"}
        for r in rules
    ]


@router.post("/rules")
async def create_rule(body: RuleCreate, db: AsyncSession = Depends(get_db)):
    rule = SecurityRule(**body.model_dump())
    db.add(rule)
    await db.commit()
    await db.refresh(rule)
    security_engine.add_rule_cache({
        "id": rule.id, "rule_type": rule.rule_type, "target": rule.target,
        "protocol": rule.protocol, "description": rule.description, "enabled": True,
    })
    return {"id": rule.id, "created": True}


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(SecurityRule).where(SecurityRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise HTTPException(404, "Rule not found")
    await db.delete(rule)
    await db.commit()
    security_engine.remove_rule_cache(rule_id)
    return {"deleted": rule_id}


# ── Events ────────────────────────────────────────────────────────────────────
@router.get("/events")
async def list_events(
    limit: int = 100,
    category: str | None = Query(None),
    severity: str | None = Query(None),
    source_ip: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    filters = []
    if category:
        filters.append(Event.category == category)
    if severity:
        filters.append(Event.severity == severity)
    if source_ip:
        filters.append(Event.source_ip == source_ip)

    q = select(Event).order_by(desc(Event.timestamp)).limit(limit)
    if filters:
        q = q.where(and_(*filters))

    result = await db.execute(q)
    events = result.scalars().all()
    return [
        {
            "id": e.id, "timestamp": e.timestamp.isoformat() + "Z",
            "category": e.category, "severity": e.severity,
            "source_ip": e.source_ip, "source_port": e.source_port,
            "protocol": e.protocol, "message": e.message,
            "detail": json.loads(e.detail) if e.detail else None,
        }
        for e in events
    ]
