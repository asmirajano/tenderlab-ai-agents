import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const css = await readFile(new URL("../app/globals.css", import.meta.url), "utf8");

test("Agent Comparison uses the practical full viewport without an ultrawide cap", () => {
  assert.match(css, /\.comparison-modal-shell \{[^}]*padding: clamp\(7px, \.65vw, 12px\)/);
  assert.match(css, /\.comparison-modal \{[^}]*height: 100%[^}]*max-width: none[^}]*width: 100%/);
  assert.doesNotMatch(css, /\.comparison-modal \{[^}]*max-width: 1900px/);
});

test("Agent Comparison keeps one matrix scroll area with sticky headers and dimension column", () => {
  assert.match(css, /\.comparison-table-scroll \{[^}]*overflow: auto[^}]*scrollbar-gutter: stable both-edges/);
  assert.match(css, /\.comparison-table thead th \{[^}]*position: sticky[^}]*top: 0/);
  assert.match(css, /\.comparison-table thead th:first-child \{[^}]*left: 0/);
  assert.match(css, /\.comparison-table tbody th \{[^}]*left: 0[^}]*position: sticky/);
});

test("Agent Comparison becomes edge-to-edge on smaller screens", () => {
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.comparison-modal-shell \{ padding: 0; \}/);
  assert.match(css, /@media \(max-width: 980px\)[\s\S]*?\.comparison-modal \{ border: 0; border-radius: 0; height: 100dvh; width: 100vw; \}/);
});
