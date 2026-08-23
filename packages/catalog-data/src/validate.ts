import { assertUniqueCatalogueRecords } from "../../catalog-schema/src";
import { actorTypes, tenderSides } from "./actors";
import { dataFamilies, dataSources, tenderDatasets } from "./datasets";
import { glossaryTerms } from "./glossary";

export function validateEcosystemCatalogues() {
  assertUniqueCatalogueRecords(tenderSides, "Tender sides");
  assertUniqueCatalogueRecords(actorTypes, "Actor types");
  assertUniqueCatalogueRecords(dataFamilies, "Data families");
  assertUniqueCatalogueRecords(tenderDatasets, "Tender datasets");
  assertUniqueCatalogueRecords(dataSources, "Data sources");
  assertUniqueCatalogueRecords(glossaryTerms, "Glossary");

  const sideIds = new Set(tenderSides.map((item) => item.id));
  const familyIds = new Set(dataFamilies.map((item) => item.id));

  for (const item of actorTypes) {
    for (const sideId of item.sideIds) {
      if (!sideIds.has(sideId)) throw new Error(`Actor ${item.id} references unknown side ${sideId}`);
    }
  }

  for (const item of tenderDatasets) {
    if (!familyIds.has(item.familyId)) throw new Error(`Dataset ${item.id} references unknown family ${item.familyId}`);
    if (!item.demo || item.demo.columns.length < 3) throw new Error(`Dataset ${item.id} needs at least three demo columns`);
    if (item.demo.rows.length !== 3) throw new Error(`Dataset ${item.id} needs exactly three demo rows`);
    if (item.demo.rows.some((row) => row.length !== item.demo.columns.length)) throw new Error(`Dataset ${item.id} has a malformed demo row`);
    if ([...item.demo.columns, ...item.demo.rows.flat()].some((value) => !value.trim())) throw new Error(`Dataset ${item.id} has an empty demo value`);
  }

  return {
    sides: tenderSides.length,
    actorTypes: actorTypes.length,
    dataFamilies: dataFamilies.length,
    datasets: tenderDatasets.length,
    sources: dataSources.length,
    glossaryTerms: glossaryTerms.length,
  };
}
