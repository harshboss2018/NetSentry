"""
NetSentry UDP Test Client
=========================
Usage:
  python udp_client.py                          # send to localhost:9002
  python udp_client.py --host 192.168.1.5       # send to LAN host
  python udp_client.py --host 192.168.1.5 --port 9002 --count 10

Sends datagrams and listens for echo replies. Calculates packet loss %.
"""
import argparse
import socket
import json
import sys
import time


def main():
    parser = argparse.ArgumentParser(description="NetSentry UDP Test Client")
    parser.add_argument("--host", default="127.0.0.1", help="Server IP address")
    parser.add_argument("--port", type=int, default=9002, help="Server UDP port")
    parser.add_argument("--count", type=int, default=5, help="Number of datagrams to send")
    parser.add_argument("--interval", type=float, default=0.5, help="Seconds between sends")
    args = parser.parse_args()

    print(f"[NetSentry UDP Client] Sending {args.count} datagrams to {args.host}:{args.port}")

    sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
    sock.settimeout(2.0)

    sent = 0
    received = 0
    rtts = []

    try:
        for i in range(args.count):
            msg = f"DATAGRAM {i} ts={time.time()}"
            t_send = time.perf_counter()
            sock.sendto(msg.encode(), (args.host, args.port))
            sent += 1
            try:
                data, _ = sock.recvfrom(4096)
                t_recv = time.perf_counter()
                rtt_ms = round((t_recv - t_send) * 1000, 2)
                rtts.append(rtt_ms)
                received += 1
                try:
                    resp = json.loads(data.decode())
                    print(f"  [{i}] Sent: '{msg[:30]}' | Echo received | RTT: {rtt_ms}ms")
                except json.JSONDecodeError:
                    print(f"  [{i}] Received: {data[:60]!r} | RTT: {rtt_ms}ms")
            except socket.timeout:
                print(f"  [{i}] TIMEOUT — datagram lost or server unreachable")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        pass
    finally:
        sock.close()

    loss = ((sent - received) / sent * 100) if sent > 0 else 0
    print(f"\n--- UDP Statistics ---")
    print(f"  Sent:     {sent}")
    print(f"  Received: {received}")
    print(f"  Lost:     {sent - received} ({loss:.1f}%)")
    if rtts:
        print(f"  RTT min/avg/max: {min(rtts)}/{round(sum(rtts)/len(rtts),2)}/{max(rtts)} ms")


if __name__ == "__main__":
    main()
