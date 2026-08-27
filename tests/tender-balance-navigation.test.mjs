import assert from "node:assert/strict";
import test from "node:test";

import {
  balanceNavigationHref,
  parseBalanceNavigation,
  resolveBalanceCase,
} from "../apps/tender-apps/src/balance-sheet-navigation.ts";

const caseA = { reviewId: "case-a" };
const caseB = { reviewId: "case-b" };

test("keeps Agent-level pages independent from a selected Case", () => {
  assert.deepEqual(parseBalanceNavigation("https://example.test/balance-sheet-review?view=overview&case=stale"), { surface: "welcome", caseId: "", demo: false });
  assert.deepEqual(parseBalanceNavigation("https://example.test/balance-sheet-review?view=new&case=stale"), { surface: "intake", caseId: "", demo: false });
  assert.deepEqual(parseBalanceNavigation("https://example.test/balance-sheet-review?view=cases&case=stale"), { surface: "cases", caseId: "", demo: false });
});

test("requires an explicit Case for Result and FIN Forms", () => {
  assert.deepEqual(parseBalanceNavigation("https://example.test/balance-sheet-review?view=result"), { surface: "cases", caseId: "", demo: false });
  assert.deepEqual(parseBalanceNavigation("https://example.test/balance-sheet-review?view=fin&case=case-a"), { surface: "fin", caseId: "case-a", demo: false });
  assert.equal(balanceNavigationHref({ surface: "review", caseId: "case-a", demo: false }), "/balance-sheet-review?view=result&case=case-a");
  assert.equal(balanceNavigationHref({ surface: "fin", caseId: "case-b", demo: true }), "/balance-sheet-review?view=fin&case=case-b&demo=1");
});

test("switching Cases resolves only the requested Case and never falls back to latest", () => {
  const reviews = [caseB, caseA];
  assert.equal(resolveBalanceCase(reviews, "case-a"), caseA);
  assert.equal(resolveBalanceCase(reviews, "case-b"), caseB);
  assert.equal(resolveBalanceCase(reviews, "missing-case"), undefined);
  assert.equal(resolveBalanceCase(reviews, ""), undefined);
});
