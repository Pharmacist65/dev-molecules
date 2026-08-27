import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  buildSynthesisDiscoverySubjects,
  CHECKED_SYNTHESIS_DISCOVERY_SUBJECT_COUNT,
  loadSynthesisDiscoverySubjects,
} = await tsImport("../scripts/synthesis/catalog-input.mts", import.meta.url);

const snapshotUrl = new URL(
  "../scripts/catalog/source-snapshots/drugcentral-fda-pubchem-eligible-v1.json",
  import.meta.url,
);

const readSnapshot = async () => JSON.parse(await readFile(snapshotUrl, "utf8"));

test("canonical checked catalog yields 1,552 deterministic synthesis discovery subjects", async () => {
  const first = await loadSynthesisDiscoverySubjects();
  const second = await loadSynthesisDiscoverySubjects();

  assert.equal(CHECKED_SYNTHESIS_DISCOVERY_SUBJECT_COUNT, 1_552);
  assert.equal(first.length, 1_552);
  assert.deepEqual(second, first);
  assert.deepEqual(
    first.map((subject) => subject.catalogEntityId),
    first.map((subject) => subject.catalogEntityId).toSorted(),
  );

  for (const valueFor of [
    (subject) => subject.subjectId,
    (subject) => subject.catalogEntityId,
    (subject) => subject.identity.pubChemCid,
    (subject) => subject.identity.inchiKey,
    (subject) => subject.sourceIdentity.sourceRecordId,
  ]) {
    assert.equal(new Set(first.map(valueFor)).size, first.length);
  }
});

test("subjects retain exact source, form, stereo and parent-resolution boundaries", async () => {
  const subjects = await loadSynthesisDiscoverySubjects();

  assert.equal(subjects.filter((subject) => subject.aliases.length > 0).length, 225);
  assert.equal(
    subjects.filter((subject) => subject.stereochemistryIdentity.specifiedInSourceInchi)
      .length,
    682,
  );
  assert.equal(
    subjects.filter((subject) => subject.identity.isomericSmiles !== null).length,
    696,
  );
  assert.equal(
    subjects.filter((subject) => subject.formIdentity.chargeLayer !== "none").length,
    48,
  );

  for (const subject of subjects) {
    assert.match(subject.subjectId, /^synthesis-discovery-subject:[a-z0-9-]+$/u);
    assert.ok(subject.preferredName.length > 0);
    assert.ok(subject.sourceIdentity.casNumber.length > 0);
    assert.ok(subject.formIdentity.sourceInchi.startsWith("InChI="));
    assert.ok(subject.formIdentity.sourceFormSmiles.length > 0);
    assert.equal(subject.formIdentity.sourceInchiKey, subject.identity.inchiKey);
    assert.equal(subject.formIdentity.componentCount, 1);
    assert.equal(subject.formIdentity.kind, "single-component-source-form");
    assert.equal(subject.parentResolution.parentInchiKey, null);
    assert.equal(
      subject.parentResolution.freeParentSaltHydrateSolvateRelation,
      "unresolved",
    );
    assert.ok(subject.parentResolution.limitations.length > 0);
    assert.equal(subject.sourceIdentity.snapshotId, "drugcentral-fda-pubchem-eligible-2026-08-22");
  }
});

test("catalog input reads the checked snapshot rather than duplicated public shards", async () => {
  const source = await readFile(
    new URL("../scripts/synthesis/catalog-input.mts", import.meta.url),
    "utf8",
  );

  assert.doesNotMatch(source, /public\/catalog|shards\/alphabetic|shards\/therapeutic/u);
  assert.match(source, /buildCatalogSnapshot/u);
  assert.match(source, /sourceRecordId/u);
});

test("source identity collisions and incomplete normalized populations fail closed", async () => {
  const duplicateSourceSnapshot = await readSnapshot();
  duplicateSourceSnapshot.records[1].approval.drugCentralId =
    duplicateSourceSnapshot.records[0].approval.drugCentralId;
  assert.throws(
    () => buildSynthesisDiscoverySubjects(duplicateSourceSnapshot),
    /Duplicate catalog source identity/u,
  );

  const incompleteSnapshot = await readSnapshot();
  const resolved = incompleteSnapshot.records.find(
    (record) => record.unresolvedReason === null,
  );
  assert.ok(resolved?.pubChem);
  resolved.pubChem.inchiKey = "AAAAAAAAAAAAAA-UHFFFAOYSA-N";
  assert.throws(
    () => buildSynthesisDiscoverySubjects(incompleteSnapshot),
    /subject count mismatch/u,
  );
});
