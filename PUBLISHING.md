# Publishing the OSS recorder

The packages are **ship-ready**. Actually pushing them needs YOUR registry accounts + tokens (I
can't and shouldn't publish under your name). Two paths:

## One-time setup
1. Create a **PyPI** account + project API token → add as repo secret `PYPI_API_TOKEN`.
2. Create an **npm** account + automation token → add as repo secret `NPM_TOKEN`.
3. Claim the names: confirm `cassette-sdk` is free on both registries (rename in
   `sdk/python/pyproject.toml` and `sdk/typescript/package.json` if taken).
4. Replace placeholder repo URLs (`github.com/cassette-dev/cassette`) with your real repo.

## Automated (recommended) — push a tag, CI publishes
```bash
git tag py-v0.1.0 && git push origin py-v0.1.0   # → release-python.yml → PyPI
git tag ts-v0.1.0 && git push origin ts-v0.1.0   # → release-npm.yml → npm
```

## Manual (first release / dry run)
```bash
# Python
cd sdk/python && python -m pip install build twine
python -m build && python -m twine upload dist/*

# TypeScript
cd sdk/typescript && npm install && npm run build && npm publish --access public
```

## Before you publish (pre-flight)
- [ ] Run the quickstart on a clean machine — a broken `pip install`/quickstart on launch day is unrecoverable.
- [ ] Bump versions in `pyproject.toml` / `package.json`.
- [ ] Tag a GitHub release with notes.
- [ ] Only the **recorder/SDK** is published. The `backend/` (paid layer) is deployed to Cloudflare, never published to a public registry.
