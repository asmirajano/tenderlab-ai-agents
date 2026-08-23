import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(new URL("../app/page.tsx", import.meta.url), "utf8");
const cssSource = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("canonical Agent drawer separates structural labels from body values", () => {
  assert.match(pageSource, /className="drawer-field-label">SIMPLY \/ ПРОСТО/);
  assert.match(cssSource, /\.drawer-purpose > \.drawer-field-label/);
  assert.match(cssSource, /\.drawer-contract-flow article > span/);
  assert.doesNotMatch(cssSource, /\.drawer-contract-flow span[,\s{]/);
  assert.doesNotMatch(cssSource, /\.drawer-purpose > span[,\s{]/);
});

test("canonical Agent drawer applies readable body typography and normal-weight links", () => {
  assert.match(cssSource, /\.agent-drawer p,[\s\S]*?\.agent-drawer li[\s\S]*?font-family: var\(--font-geist-sans\)/);
  assert.match(cssSource, /--drawer-body-weight: 400/);
  assert.match(cssSource, /\.agent-drawer \.agent-inline-reference[\s\S]*?font-weight: 520/);
});
