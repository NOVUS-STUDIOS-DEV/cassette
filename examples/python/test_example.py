"""Minimal example: the same test hits the real model once (record), then runs free &
deterministically forever after (replay/auto).

Recorder-first — NO gateway, no extra CI infra. This is the surface Cassette owns.

    pip install openai httpx
    pip install -e ../../sdk/python
    export OPENAI_API_KEY="sk-..."           # only needed on the first (record) run
    python test_example.py                   # 1st run records to ./.cassettes
    python test_example.py                   # 2nd run replays — no token spend, instant
"""
import os

from cassette.recorder import http_client
from openai import OpenAI

# Records/replays at the HTTP-client layer, inside this process. No gateway required.
client = OpenAI(http_client=http_client(project="demo", mode=os.environ.get("CASSETTE_MODE", "auto")))


def get_haiku() -> str:
    resp = client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[{"role": "user", "content": "Write a haiku about deterministic tests."}],
        temperature=0,
    )
    return resp.choices[0].message.content


def test_haiku_is_returned():
    out = get_haiku()
    assert isinstance(out, str) and len(out) > 0
    print("model said:\n", out)


if __name__ == "__main__":
    test_haiku_is_returned()
    print("\nOK — run again to see it replay for free (check ./.cassettes).")

# --- Optional: route through the hosted gateway transport instead (one ingest mode, not required) ---
#   import cassette
#   cassette.use(project="demo")            # sets OPENAI_BASE_URL to the gateway
#   client = OpenAI()                        # picks it up automatically
