"""TopologySnapshot ORM model — persists virtual network graph state."""
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Text
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class TopologySnapshot(Base):
    __tablename__ = "topology_snapshots"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    name: Mapped[str] = mapped_column(String(100), default="default")
    nodes_json: Mapped[str] = mapped_column(Text)   # JSON array of nodes
    edges_json: Mapped[str] = mapped_column(Text)   # JSON array of edges
    is_active: Mapped[bool] = mapped_column(default=True)
