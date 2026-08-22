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
  const datasetExamples = new Set<string>();

  for (const item of actorTypes) {
    for (const sideId of item.sideIds) {
      if (!sideIds.has(sideId)) throw new Error(`Actor ${item.id} references unknown side ${sideId}`);
    }
  }

  for (const item of tenderDatasets) {
    if (!familyIds.has(item.familyId)) throw new Error(`Dataset ${item.id} references unknown family ${item.familyId}`);
    if (!item.exampleRu?.trim() || !/[А-Яа-яЁё]/.test(item.exampleRu)) throw new Error(`Dataset ${item.id} needs a Russian example`);
    if (datasetExamples.has(item.exampleRu)) throw new Error(`Dataset ${item.id} duplicates another example`);
    datasetExamples.add(item.exampleRu);
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
