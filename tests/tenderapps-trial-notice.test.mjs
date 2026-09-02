import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8").replaceAll("\r\n", "\n");
const component = read("apps/tender-apps/src/trial-notice.tsx");
const styles = read("apps/tender-apps/src/trial-notice.css");
const balance = read("apps/tender-apps/src/balance-sheet-app.tsx");
const logistics = read("apps/tender-apps/src/logistics-costing-app.tsx");
const match = read("apps/tender-apps/src/tendermatch-app.tsx");

test("shared trial notice contains the approved informational copy and five-second timing", () => {
  assert.match(component, />3 free uses</);
  assert.match(component, /You can use this service <b>3 times for free<\/b>/);
  assert.match(component, /usage will be based on your <b>TenderApps Plan<\/b>/);
  assert.match(component, />View Plan</);
  assert.match(component, /visibleDurationMs: 5_000/);
  assert.match(component, /shownDuringThisPageLoad = new Set<string>/);
  assert.doesNotMatch(component, /localStorage|sessionStorage|payment|entitlement|usageCount/i);
});

test("notice is mounted exactly once in each product Overview", () => {
  const balanceOverview = balance.slice(balance.indexOf('if (surface === "welcome")'), balance.indexOf('if (surface === "intake")'));
  const logisticsOverview = logistics.slice(logistics.indexOf('if (clientSurface === "welcome")'), logistics.indexOf('if (clientSurface === "intake")'));
  const matchOverview = match.slice(match.indexOf("function DashboardView"), match.indexOf("function TenderRadarView"));

  assert.match(balanceOverview, /<TrialNotice product="balance" productId="product:TA-BALANCE" \/>/);
  assert.match(logisticsOverview, /<TrialNotice product="logistics" productId="product:TA-LANDED-COST" \/>/);
  assert.match(matchOverview, /<TrialNotice product="match" productId="product:TA-TENDERBOOST" \/>/);
  assert.equal((balanceOverview.match(/<TrialNotice /g) ?? []).length, 1);
  assert.equal((logisticsOverview.match(/<TrialNotice /g) ?? []).length, 1);
  assert.equal((matchOverview.match(/<TrialNotice /g) ?? []).length, 1);
});

test("notice overlays without layout shift and keeps text opaque over a translucent panel", () => {
  assert.match(styles, /position: fixed/);
  assert.match(styles, /background: var\(--trial-surface\)/);
  assert.match(styles, /rgba\([^;]+, 0\.52\)/);
  assert.match(styles, /\.trial-notice\.is-visible \{\n {2}opacity: 1/);
  assert.match(styles, /translateX\(calc\(-100% - 2rem\)\)/);
  assert.match(styles, /backdrop-filter: blur\(14px\)/);
  assert.match(styles, /prefers-reduced-motion: reduce/);
});
