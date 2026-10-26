"""IP and DNS Tools router — Module G."""
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.ip_utils import calculate_subnet, validate_ip
from services.dns_resolver import lookup_hostname, reverse_lookup

router = APIRouter(prefix="/tools", tags=["tools"])


class SubnetRequest(BaseModel):
    cidr: str


class DNSRequest(BaseModel):
    hostname: str
    timeout: float = 5.0


class ReverseDNSRequest(BaseModel):
    ip: str
    timeout: float = 5.0


class IPValidateRequest(BaseModel):
    ip: str


@router.post("/subnet")
async def subnet_calc(body: SubnetRequest):
    try:
        return calculate_subnet(body.cidr)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.post("/ip/validate")
async def ip_validate(body: IPValidateRequest):
    return validate_ip(body.ip)


@router.post("/dns/lookup")
async def dns_lookup(body: DNSRequest):
    return await lookup_hostname(body.hostname, body.timeout)


@router.post("/dns/reverse")
async def dns_reverse(body: ReverseDNSRequest):
    return await reverse_lookup(body.ip, body.timeout)
