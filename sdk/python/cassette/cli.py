"""`cassette` CLI — used in CI to push recorded cassettes to the team registry.

    cassette push --ref pr-42

Reads from env (so CI just sets them once):
    CASSETTE_PROJECT   owner/repo   (GitHub Actions: ${{ github.repository }})
    CASSETTE_TOKEN     the CI token from your welcome page
    CASSETTE_DIR       local cassette dir (default ./.cassettes)
    CASSETTE_BACKEND   registry base url (default https://api.cassette.dev)
"""
from __future__ import annotations

import argparse
import os
import sys

from .registry import push_dir


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(prog="cassette")
    sub = parser.add_subparsers(dest="cmd", required=True)

    push = sub.add_parser("push", help="upload recorded cassettes to the team registry")
    push.add_argument("--project", default=os.environ.get("CASSETTE_PROJECT"))
    push.add_argument("--ref", default=os.environ.get("CASSETTE_REF", "blessed"))
    push.add_argument("--dir", default=os.environ.get("CASSETTE_DIR", ".cassettes"))
    push.add_argument("--token", default=os.environ.get("CASSETTE_TOKEN"))

    args = parser.parse_args(argv)

    if args.cmd == "push":
        if not args.project:
            print("error: set --project or CASSETTE_PROJECT (owner/repo)", file=sys.stderr)
            return 2
        if not args.token:
            print("error: set --token or CASSETTE_TOKEN", file=sys.stderr)
            return 2
        n = push_dir(args.dir, project=args.project, ref=args.ref, token=args.token)
        print(f"pushed {n} cassette(s) to {args.project} @ {args.ref}")
        return 0
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
