import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  clientProducts,
  practicalAgentOverviewRequiredParts,
} from "../packages/catalog-data/src/client-products.ts";
import { realAgentImplementations } from "../packages/catalog-data/src/real-agent-development.ts";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const coreParts = practicalAgentOverviewRequiredParts.filter((part) => part !== "trust-boundary");
const firstViewportParts = coreParts.filter((part) => part !== "primary-action");

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

test("requires one audience-neutral practical-Agent Overview contract for every registered real implementation", async () => {
  const productsById = new Map(clientProducts.map((product) => [product.id, product]));
  const evidenceCache = new Map();
  assert.equal(realAgentImplementations.length, clientProducts.length);

  for (const implementation of realAgentImplementations) {
    const product = productsById.get(implementation.clientProductId);
    assert.ok(product, `${implementation.id} must resolve to a client product`);

    const { overviewContract } = product;
    assert.deepEqual(overviewContract.requiredParts, practicalAgentOverviewRequiredParts, product.id);
    assert.deepEqual(overviewContract.renderedGate.firstViewportParts, firstViewportParts, product.id);
    assert.deepEqual(overviewContract.renderedGate.desktopViewports, [
      { width: 1280, height: 720 },
      { width: 1440, height: 900 },
    ]);
    assert.ok(overviewContract.renderedGate.finishedOutputMinimumAreaRatio >= 1.25);
    assert.equal(overviewContract.renderedGate.trustBoundaryMustBeVisible, true);

    const [implementationSource, compositionSource] = await Promise.all([
      readFile(path.join(projectRoot, overviewContract.implementationSourcePath), "utf8"),
      readFile(path.join(projectRoot, overviewContract.compositionSourcePath), "utf8"),
    ]);
    assert.match(implementationSource, new RegExp(`productId=["']${escapeRegExp(product.id)}["']`), product.id);
    assert.match(implementationSource, new RegExp(`audience=["']${overviewContract.audience}["']`), product.id);
    assert.match(implementationSource, /PracticalAgentOverviewBoundary/, product.id);
    assert.match(compositionSource, /PracticalAgentOverview/, product.id);

    const renderedPartOrder = [...compositionSource.matchAll(/part=["']([^"']+)["']/g)]
      .map((match) => match[1])
      .filter((part) => coreParts.includes(part));
    assert.deepEqual(renderedPartOrder, coreParts, `${product.id} semantic Overview order`);

    if (!evidenceCache.has(overviewContract.renderedEvidencePath)) {
      evidenceCache.set(
        overviewContract.renderedEvidencePath,
        JSON.parse(await readFile(path.join(projectRoot, overviewContract.renderedEvidencePath), "utf8")),
      );
    }
    const evidence = evidenceCache.get(overviewContract.renderedEvidencePath);
    const productEvidence = evidence.products.find((item) => item.productId === product.id);
    assert.ok(productEvidence, `${product.id} rendered Overview evidence`);
    assert.equal(productEvidence.route, product.clientRoute);
    assert.equal(productEvidence.trustBoundaryPresent, true);
    assert.equal(productEvidence.viewports.length, overviewContract.renderedGate.desktopViewports.length);
    for (const expectedViewport of overviewContract.renderedGate.desktopViewports) {
      const measured = productEvidence.viewports.find((item) => item.width === expectedViewport.width && item.height === expectedViewport.height);
      assert.ok(measured, `${product.id} ${expectedViewport.width}×${expectedViewport.height}`);
      assert.equal(measured.firstViewportPartsVisible, true);
      assert.ok(measured.outputAreaRatioToInput >= overviewContract.renderedGate.finishedOutputMinimumAreaRatio);
      assert.ok(measured.outputAreaRatioToTransformation >= overviewContract.renderedGate.finishedOutputMinimumAreaRatio);
      assert.equal(measured.horizontalOverflowPx, 0);
      if (product.id === "product:TA-TENDERBOOST") assert.equal(measured.primaryActionVisible, true);
    }
  }
});

test("keeps the finished output as the only semantically dominant Overview part", async () => {
  const component = await readFile(path.join(projectRoot, "apps/tender-apps/src/practical-agent-overview.tsx"), "utf8");
  assert.match(component, /data-practical-agent-overview-part/);
  assert.match(component, /part === "finished-output"[\s\S]+data-overview-visual-priority/);
  assert.doesNotMatch(component, /part === "(?:input|agent-transformation|outcome-promise|primary-action)"[\s\S]{0,80}data-overview-visual-priority/);
});
