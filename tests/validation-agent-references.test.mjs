import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("Validation comparison reuses canonical clickable Agent references", async () => {
  const [mapSource, comparisonSource, referenceSource, drawerSource] = await Promise.all([
    readFile(path.join(projectRoot, "app", "case-simulation", "case-orchestration-map.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-comparison.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "agent-reference-text.tsx"), "utf8"),
    readFile(path.join(projectRoot, "app", "page.tsx"), "utf8"),
  ]);

  assert.match(mapSource, /<AgentComparisonModal[\s\S]*?onOpenAgent=\{\(agent\) => onOpenAgent\(agent\.id, selected\.eventStep\)\}[\s\S]*?onClose=/);
  assert.match(comparisonSource, /buildAgentValidationRows\(analyses, "comparison", onOpenAgent\)/);
  assert.match(comparisonSource, /Responsibility boundary[\s\S]*?AgentReferenceText/);
  assert.match(comparisonSource, /Potential overlap[\s\S]*?StructuredOverlapCell/);
  assert.match(comparisonSource, /Related workflow role[\s\S]*?RelationshipCell/);
  assert.match(comparisonSource, /ProfileList items=\{agent\.profile\.typicalInputs\}/);
  assert.match(referenceSource, /const label = `\$\{agent\.name\} \(\$\{agent\.id\}\)`/);
  assert.match(referenceSource, /data-agent-reference-id=\{agent\.id\}/);
  assert.match(referenceSource, /closest\("\.agent-drawer"\)/);
  assert.match(referenceSource, /tenderlab:navigate-agent-drawer/);
  assert.doesNotMatch(referenceSource, /dispatchEvent\(new CustomEvent\("tenderlab:open-agent-reference"/);
  assert.match(drawerSource, /setAgentPath\(\(current\) => \[\.\.\.current, nextAgent\.id\]\)/);
  assert.match(drawerSource, /addEventListener\("tenderlab:navigate-agent-drawer", followReference\)/);
  assert.match(drawerSource, /drawer-agent-back/);
});
