"""SecurityRule ORM model — application-level allowlist/blocklist rules."""
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Boolean, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class SecurityRule(Base):
    __tablename__ = "security_rules"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    rule_type: Mapped[str] = mapped_column(String(20))      # allow|block
    target: Mapped[str] = mapped_column(String(100))         # IP address or CIDR
    protocol: Mapped[str] = mapped_column(String(10), default="*")  # TCP|UDP|*
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    enabled: Mapped[bool] = mapped_column(Boolean, default=True)
    hit_count: Mapped[int] = mapped_column(Integer, default=0)
