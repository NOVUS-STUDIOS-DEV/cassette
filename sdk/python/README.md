# cassette-sdk

Record/replay LLM & agent API calls so your tests run **fast, free, and deterministic**.

The first time your tests run, Cassette records each LLM response to a local file. After that it
replays the saved response — no network, no API key, no token cost, and no random failures from the
model wording things differently.

## Install

```bash
pip install cassette-sdk
```

## Use (in-process, no gateway)

```python
from cassette.recorder import http_client
from openai import OpenAI

client = OpenAI(http_client=http_client(project="demo"))  # records → replays locally
```

Modes via `CASSETTE_MODE`: `record` | `replay` | `auto` (default). Cassettes are plain JSON in
`./.cassettes` and diff cleanly in PRs.

## Detect real regressions

```python
from cassette.drift import compare_cassette_files
result = compare_cassette_files("baseline.json", "new.json")
print(result.verdict)  # identical | benign | regression
```

It ignores harmless rewording but flags changed tool calls, structured-output shape changes, and
truncation as regressions.

Free and open source (MIT). Team features (shared registry + GitHub PR merge-gate) at
[cassette.dev](https://cassette.dev).
