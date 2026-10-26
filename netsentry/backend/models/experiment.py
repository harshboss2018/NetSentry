"""Experiment ORM model — stores performance lab run history."""
from datetime import datetime
from sqlalchemy import Integer, String, DateTime, Text, Float
from sqlalchemy.orm import Mapped, mapped_column
from database import Base


class Experiment(Base):
    __tablename__ = "experiments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow, index=True)
    name: Mapped[str] = mapped_column(String(100))
    experiment_type: Mapped[str] = mapped_column(String(50))  # latency|throughput|packet_loss|simulated
    config_json: Mapped[str] = mapped_column(Text)   # JSON of experiment parameters
    result_json: Mapped[str] = mapped_column(Text)   # JSON of results
    data_source: Mapped[str] = mapped_column(String(20), default="real")  # real|simulated
    duration_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
