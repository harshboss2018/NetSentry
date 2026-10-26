"""Performance Lab router — Module E: Measurement and experiments."""
import time
import json
import asyncio
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, desc
from database import get_db
from models.experiment import Experiment

router = APIRouter(prefix="/performance", tags=["performance"])


class LatencyRequest(BaseModel):
    target_ip: str = "127.0.0.1"
    target_port: int = 9001
    count: int = 5


class ThroughputRequest(BaseModel):
    target_ip: str = "127.0.0.1"
    target_port: int = 9001
    payload_kb: int = 256  # Transfer payload size in KB (e.g. 64, 256, 1024)


class SimulatedExperiment(BaseModel):
    name: str
    delay_ms: float = 0
    loss_pct: float = 0
    path: list[str] = []
    notes: str = ""


@router.post("/latency")
async def measure_latency(body: LatencyRequest, db: AsyncSession = Depends(get_db)):
    """
    Measure round-trip latency via TCP echo to our own server.
    data_source = 'real'
    """
    rtts = []
    errors = []
    for i in range(body.count):
        try:
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(body.target_ip, body.target_port),
                timeout=5.0,
            )
            # Read welcome banner
            await asyncio.wait_for(reader.readline(), timeout=3.0)
            msg = f"PING {i}\n"
            t1 = time.perf_counter()
            writer.write(msg.encode())
            await writer.drain()
            await asyncio.wait_for(reader.readline(), timeout=3.0)
            t2 = time.perf_counter()
            rtts.append(round((t2 - t1) * 1000, 3))
            writer.close()
            try:
                await writer.wait_closed()
            except Exception:
                pass
            await asyncio.sleep(0.05)
        except Exception as e:
            errors.append(str(e))

    result = {
        "target": f"{body.target_ip}:{body.target_port}",
        "count": body.count,
        "sent": body.count,
        "received": len(rtts),
        "lost": body.count - len(rtts),
        "rtt_ms": rtts,
        "min_ms": min(rtts) if rtts else None,
        "max_ms": max(rtts) if rtts else None,
        "avg_ms": round(sum(rtts) / len(rtts), 3) if rtts else None,
        "errors": errors,
        "data_source": "real",
    }

    # Persist experiment
    exp = Experiment(
        name=f"Latency to {body.target_ip}:{body.target_port}",
        experiment_type="latency",
        config_json=json.dumps(body.model_dump()),
        result_json=json.dumps(result),
        data_source="real",
    )
    db.add(exp)
    await db.commit()
    result["experiment_id"] = exp.id
    return result


@router.post("/throughput")
async def measure_throughput(body: ThroughputRequest, db: AsyncSession = Depends(get_db)):
    """
    Measure real TCP socket throughput by transmitting controlled payload chunks.
    data_source = 'real'
    """
    payload_bytes = min(max(body.payload_kb, 16), 4096) * 1024
    chunk = b"X" * 4096
    chunks_count = payload_bytes // 4096

    try:
        reader, writer = await asyncio.wait_for(
            asyncio.open_connection(body.target_ip, body.target_port),
            timeout=5.0,
        )
        # Read welcome banner
        await asyncio.wait_for(reader.readline(), timeout=3.0)

        t_start = time.perf_counter()
        bytes_transferred = 0
        for _ in range(chunks_count):
            writer.write(chunk)
            bytes_transferred += len(chunk)
        # Final newline to frame
        writer.write(b"\n")
        await writer.drain()

        # Read echo response
        await asyncio.wait_for(reader.readline(), timeout=10.0)
        t_end = time.perf_counter()

        writer.close()
        try:
            await writer.wait_closed()
        except Exception:
            pass

        duration_sec = max(t_end - t_start, 0.0001)
        kb_transferred = bytes_transferred / 1024
        throughput_kbps = round(kb_transferred / duration_sec, 2)
        throughput_mbps = round((throughput_kbps * 8) / 1024, 2)

        result = {
            "target": f"{body.target_ip}:{body.target_port}",
            "payload_kb": body.payload_kb,
            "bytes_transferred": bytes_transferred,
            "duration_sec": round(duration_sec, 4),
            "throughput_kbps": throughput_kbps,
            "throughput_mbps": throughput_mbps,
            "success": True,
            "data_source": "real",
        }
    except Exception as e:
        result = {
            "target": f"{body.target_ip}:{body.target_port}",
            "payload_kb": body.payload_kb,
            "success": False,
            "error": str(e),
            "data_source": "real",
        }

    # Persist experiment
    exp = Experiment(
        name=f"Throughput ({body.payload_kb} KB) to {body.target_ip}",
        experiment_type="throughput",
        config_json=json.dumps(body.model_dump()),
        result_json=json.dumps(result),
        data_source="real",
    )
    db.add(exp)
    await db.commit()
    result["experiment_id"] = exp.id
    return result


@router.post("/simulated")
async def run_simulated(body: SimulatedExperiment, db: AsyncSession = Depends(get_db)):
    """
    Simulated delay/loss experiment on a virtual path.
    data_source = 'simulated'
    """
    import random
    results = []
    for i in range(10):
        if random.random() * 100 < body.loss_pct:
            results.append({"seq": i + 1, "status": "lost"})
        else:
            jitter = random.uniform(-body.delay_ms * 0.1, body.delay_ms * 0.1)
            rtt = max(body.delay_ms * 2 + jitter, 1.0)
            results.append({"seq": i + 1, "status": "received", "rtt_ms": round(rtt, 2)})

    received = [r for r in results if r["status"] == "received"]
    rtts = [r["rtt_ms"] for r in received]

    result = {
        "name": body.name,
        "path": body.path,
        "simulated_delay_ms": body.delay_ms,
        "simulated_loss_pct": body.loss_pct,
        "samples": results,
        "received": len(received),
        "lost": len(results) - len(received),
        "avg_rtt_ms": round(sum(rtts) / len(rtts), 2) if rtts else None,
        "min_rtt_ms": min(rtts) if rtts else None,
        "max_rtt_ms": max(rtts) if rtts else None,
        "data_source": "simulated",
    }

    exp = Experiment(
        name=body.name,
        experiment_type="simulated",
        config_json=json.dumps(body.model_dump()),
        result_json=json.dumps(result),
        data_source="simulated",
        notes=body.notes,
    )
    db.add(exp)
    await db.commit()
    result["experiment_id"] = exp.id
    return result


@router.get("/history")
async def get_history(limit: int = 50, db: AsyncSession = Depends(get_db)):
    """Return experiment history from SQLite."""
    result = await db.execute(
        select(Experiment).order_by(desc(Experiment.timestamp)).limit(limit)
    )
    experiments = result.scalars().all()
    return [
        {
            "id": e.id,
            "timestamp": e.timestamp.isoformat() + "Z",
            "name": e.name,
            "type": e.experiment_type,
            "data_source": e.data_source,
            "result": json.loads(e.result_json),
        }
        for e in experiments
    ]
