"""
NetSentry TCP Test Client
=========================
Usage:
  python tcp_client.py                          # connect to localhost:9001
  python tcp_client.py --host 192.168.1.5       # connect to LAN host
  python tcp_client.py --host 192.168.1.5 --port 9001

Type messages and press Enter to send. Type 'quit' to exit.
"""
import argparse
import socket
import json
import sys
import time

def main():
    parser = argparse.ArgumentParser(description="NetSentry TCP Test Client")
    parser.add_argument("--host", default="127.0.0.1", help="Server IP address")
    parser.add_argument("--port", type=int, default=9001, help="Server TCP port")
    args = parser.parse_args()

    print(f"[NetSentry TCP Client] Connecting to {args.host}:{args.port}...")
    try:
        sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        sock.settimeout(10)
        sock.connect((args.host, args.port))
        sock.settimeout(None)
    except ConnectionRefusedError:
        print(f"[ERROR] Connection refused. Is NetSentry backend running on {args.host}:{args.port}?")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] {e}")
        sys.exit(1)

    # Read welcome banner
    banner = sock.makefile().readline().strip()
    print(f"[Connected] {banner}\n")
    print("Type a message and press Enter. Type 'quit' to exit.\n")

    f = sock.makefile("r")
    try:
        while True:
            try:
                msg = input("> ").strip()
            except (EOFError, KeyboardInterrupt):
                break
            if msg.lower() == "quit":
                break
            if not msg:
                continue

            t_send = time.perf_counter()
            sock.sendall((msg + "\n").encode())

            # Read echo response
            line = f.readline().strip()
            t_recv = time.perf_counter()
            rtt_ms = round((t_recv - t_send) * 1000, 2)

            try:
                resp = json.loads(line)
                print(f"  ← Echo: '{resp.get('echo')}' | RTT: {rtt_ms}ms | Server ts: {resp.get('server_ts')}")
            except json.JSONDecodeError:
                print(f"  ← {line}")
    finally:
        sock.close()
        print("[Disconnected]")


if __name__ == "__main__":
    main()
