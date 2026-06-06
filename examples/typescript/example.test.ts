// vitest/jest example: first run records, every run after replays for free & deterministically.
//
//   npm i openai vitest cassette-sdk
//   OPENAI_API_KEY=sk-...  npx vitest run     # 1st run records to ./.cassettes
//   npx vitest run                            # 2nd run replays — no key, no cost
//
import { expect, test } from "vitest";
import OpenAI from "openai";
import { recordingFetch } from "cassette-sdk/recorder";

const client = new OpenAI({
  fetch: recordingFetch({ project: "demo" }), // in-process record/replay; no gateway
});

test("haiku is returned (recorded once, replayed forever)", async () => {
  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: "Write a haiku about deterministic tests." }],
    temperature: 0,
  });
  expect(resp.choices[0].message.content).toBeTruthy();
});
