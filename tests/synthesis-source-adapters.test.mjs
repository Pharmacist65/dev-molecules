import assert from "node:assert/strict";
import test from "node:test";

import reactionPb from "ord-schema";
import { tsImport } from "tsx/esm/api";

const {
  decodeOrdCandidate,
  discoverEuropePmc,
  discoverOpenReactionDatabase,
  runAllDiscoveryAdapters,
} = await tsImport("../scripts/synthesis/source-adapters.mts", import.meta.url);

const context = {
  searchedAt: "2026-08-27T00:00:00.000Z",
  timeoutMs: 2_000,
  maxRetries: 0,
  maxCandidatesPerAdapter: 10,
};

const jsonResponse = (value, status = 200) =>
  new Response(JSON.stringify(value), {
    status,
    headers: { "content-type": "application/json" },
  });

const syntheticSubject = {
  schemaVersion: 1,
  subjectId: "synthesis-discovery-subject:synthetic-compound-alpha",
  catalogEntityId: "molecule:synthetic-fixture-alpha",
  preferredName: "Synthetic Compound Alpha",
  aliases: ["Synthetic Alpha", "Fixture Compound Alpha"],
  identity: {
    pubChemCid: 990_000_001,
    inchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBB-N",
    connectivityKey: "AAAAAAAAAAAAAA",
    stereochemicalAndProtonationKey: "BBBBBBBBBB-N",
    canonicalSmiles: "C",
    isomericSmiles: null,
    molecularFormula: "CH4",
  },
  formIdentity: {
    chemicalFormId: "chemical-form:synthetic-fixture-alpha",
    kind: "single_component",
    componentCount: 1,
    sourceFormSmiles: "C",
    sourceInchi: "InChI=1S/CH4/h1H4",
    sourceInchiKey: "AAAAAAAAAAAAAA-BBBBBBBBBB-N",
    chargeLayer: "N",
  },
  stereochemistryIdentity: {
    stereoisomerId: "stereoisomer:synthetic-fixture-alpha",
    specifiedInSourceInchi: false,
    isomericSmiles: null,
    inchiKeyStereoAndProtonationBlock: "BBBBBBBBBB-N",
  },
  parentResolution: {
    catalogParentEntityId: "molecule:synthetic-fixture-alpha",
    catalogRelation: "self",
    catalogResolutionStatus: "self",
    chemicalFormParentResolutionStatus: "not-applicable",
    parentInchiKey: null,
    freeParentSaltHydrateSolvateRelation: "unresolved",
    limitations: ["Synthetic test fixture; no scientific identity is asserted."],
  },
  sourceIdentity: {
    snapshotId: "snapshot:synthetic-fixture",
    sourceRecordId: "drugcentral:990000001",
    drugCentralId: 990_000_001,
    approvalName: "Synthetic Compound Alpha",
    inn: "synthetic-compound-alpha",
    casNumber: "0000-00-0",
    sourceIds: ["source:synthetic-fixture-alpha"],
    capturedAt: "2026-08-27T00:00:00.000Z",
  },
};

test("automated source adapters retain PubChem, Europe PMC and exact ORD hits as candidates", async () => {
  const subject = syntheticSubject;
  const requestedUrls = [];
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (request) => {
    const url = new URL(String(request));
    requestedUrls.push(url);

    if (url.host === "pubchem.ncbi.nlm.nih.gov" && url.pathname.includes("/pug_view/")) {
      return jsonResponse({
        Record: {
          Section: [
            {
              TOCHeading: "Methods of Manufacturing",
              Information: [
                {
                  Reference: ["Synthetic patent fixture citation"],
                  ExtendedReference: [{ Citation: "Synthetic journal fixture citation" }],
                  Value: {
                    StringWithMarkup: [
                      {
                        Markup: [
                          { Type: "PubChem Internal Link", Extra: "CID-12345" },
                        ],
                      },
                    ],
                  },
                },
              ],
            },
          ],
        },
      });
    }
    if (url.host === "pubchem.ncbi.nlm.nih.gov" && url.pathname.endsWith("/synonyms/JSON")) {
      return jsonResponse({
        InformationList: {
          Information: [
            {
              Synonym: [
                "Synthetic Compound Alpha",
                "Synthetic Alpha",
                "Fixture Compound Alpha",
                "0000-00-0",
                "InChI=not-an-alias",
              ],
            },
          ],
        },
      });
    }
    if (url.host === "pubchem.ncbi.nlm.nih.gov" && url.pathname.endsWith("/cids/JSON")) {
      return jsonResponse({ IdentifierList: { CID: [990_000_002] } });
    }
    if (url.host === "www.ebi.ac.uk") {
      const query = url.searchParams.get("query") ?? "";
      if (query.startsWith("SRC:PAT")) {
        return jsonResponse({
          resultList: {
            result: [
              {
                source: "PAT",
                id: "synthetic-patent-document-alpha",
                title: "Process for preparation of Synthetic Compound Alpha",
                pubYear: "2099",
              },
            ],
          },
        });
      }
      return jsonResponse({
        resultList: {
          result: [
            {
              title: "Synthesis of Synthetic Compound Alpha",
              pmcid: "PMC-SYNTHETIC-FIXTURE-ALPHA",
              pubYear: "2099",
              isOpenAccess: "Y",
              journalTitle: "Synthetic Fixture Journal",
            },
            {
              title: "Unrelated clinical observation",
              pmid: "fixture-unrelated-record",
              pubYear: "2098",
              isOpenAccess: "N",
            },
            {
              source: "PAT",
              title: "Synthesis of Synthetic Compound Alpha",
              pubYear: "2099",
              isOpenAccess: "N",
            },
          ],
        },
      });
    }
    if (url.host === "open-reaction-database.org") {
      return jsonResponse([
        {
          dataset_id: "ord-dataset-example",
          reaction_id: "ord-reaction-exact-output",
        },
      ]);
    }
    throw new Error(`Unexpected source-adapter request: ${url}`);
  };

  try {
    const results = await runAllDiscoveryAdapters(subject, context);
    assert.equal(results.length, 4);

    const byAdapter = new Map(results.map((result) => [result.adapterId, result]));
    const pubChem = byAdapter.get("pubchem-manufacturing");
    const journal = byAdapter.get("europe-pmc");
    const patent = byAdapter.get("europe-pmc-patents");
    const ord = byAdapter.get("open-reaction-database");
    assert.ok(pubChem && journal && patent && ord);

    assert.deepEqual(
      results.map((result) => result.attempt.status),
      ["completed", "completed", "completed", "completed"],
    );
    assert.deepEqual(
      results.map((result) => result.attempt.candidateCount),
      [1, 1, 1, 1],
    );

    const allEvidence = results.flatMap((result) => result.evidence);
    assert.equal(allEvidence.length, 4);
    assert.ok(allEvidence.every((evidence) => evidence.resolutionState === "candidate"));
    assert.ok(allEvidence.every((evidence) => evidence.sourceId === null));
    assert.ok(allEvidence.every((evidence) => evidence.supportScope !== "complete_route"));

    assert.equal(pubChem.evidence[0].sourceKind, "aggregator");
    assert.equal(pubChem.attempt.provider, "aggregator");
    assert.equal(pubChem.evidence[0].licenseState, "mixed");
    assert.equal(pubChem.evidence[0].reuseMode, "metadata_and_link_only");
    assert.equal(pubChem.evidence[0].locator, null);
    assert.match(pubChem.evidence[0].url, /Methods-of-Manufacturing/u);
    assert.deepEqual(pubChem.metadata.identityAliases, [
      "Synthetic Compound Alpha",
      "Synthetic Alpha",
      "Fixture Compound Alpha",
    ]);
    assert.deepEqual(pubChem.metadata.parentCids, [990_000_002]);
    assert.equal(pubChem.metadata.parentRelationCandidate, "different_parent_candidate");

    assert.equal(journal.evidence[0].sourceKind, "journal");
    assert.equal(
      journal.evidence[0].documentId,
      "pmcid:PMC-SYNTHETIC-FIXTURE-ALPHA",
    );
    assert.equal(
      journal.evidence[0].url,
      "https://europepmc.org/articles/PMC-SYNTHETIC-FIXTURE-ALPHA",
    );
    assert.equal(journal.evidence[0].licenseState, "unknown");
    assert.equal(journal.evidence[0].reuseMode, "metadata_and_link_only");
    assert.equal(journal.evidence[0].locator, null);
    assert.equal(journal.metadata.rejectedMissingStableDocumentIdentityCount, 1);
    assert.equal(journal.metadata.stableDocumentIdentityRequired, true);
    assert.match(journal.metadata.apiUrl, /SRC%3AMED/u);

    assert.equal(patent.evidence[0].sourceKind, "patent");
    assert.equal(patent.evidence[0].documentId, "SYNTHETICPATENTDOCUMENTALPHA");
    assert.equal(patent.evidence[0].licenseState, "link_only");
    assert.equal(patent.evidence[0].reuseMode, "metadata_and_link_only");
    assert.equal(patent.evidence[0].locator, null);
    assert.match(patent.metadata.coverageLimitation, /not the complete patent universe/iu);

    const exactOrdEvidence = ord.evidence[0];
    assert.equal(exactOrdEvidence.resolutionState, "candidate");
    assert.equal(exactOrdEvidence.sourceKind, "open_reaction_dataset");
    assert.equal(exactOrdEvidence.documentId, "ord-reaction-exact-output");
    assert.equal(exactOrdEvidence.supportScope, "single_step");
    assert.equal(exactOrdEvidence.licenseState, "attribution_required");
    assert.equal(exactOrdEvidence.reuseMode, "derived_facts_with_attribution");
    assert.deepEqual(exactOrdEvidence.locator, {
      kind: "dataset_record",
      value: "ord-dataset-example/ord-reaction-exact-output",
      page: null,
      scheme: null,
      example: null,
    });

    const [ordFragment] = ord.metadata.reactionCandidates;
    assert.equal(ordFragment.candidateKind, "single_step_reaction_fragment");
    assert.equal(ordFragment.candidateState, "candidate");
    assert.equal(ordFragment.reviewState, "pending");
    assert.equal(ordFragment.decodeState, "missing_proto");
    assert.equal(ordFragment.routeCompleteness, "upstream_gap");
    assert.deepEqual(ordFragment.inputs, []);
    assert.deepEqual(ordFragment.products, []);
    assert.deepEqual(ordFragment.reactionClass, {
      taxonomyId: null,
      label: "Unclassified",
      normalizationState: "unclassified",
    });
    assert.deepEqual(ordFragment.bondChanges, {
      mappingState: "not_mapped",
      formed: [],
      broken: [],
      orderChanged: [],
    });
    assert.deepEqual(ordFragment.sourceEvidence, {
      evidenceId: exactOrdEvidence.id,
      resolutionState: "candidate",
      sourceKind: "open_reaction_dataset",
    });
    assert.equal(ordFragment.licenseState, "attribution_required");
    assert.equal(ordFragment.reuseMode, "derived_facts_with_attribution");
    assert.equal(ordFragment.operationalDetailsIncluded, false);
    assert.ok(ordFragment.limitations.length >= 5);
    assert.ok(!("routeType" in ordFragment));

    const ordRequest = requestedUrls.find(
      (url) => url.host === "open-reaction-database.org",
    );
    assert.ok(ordRequest);
    assert.deepEqual(JSON.parse(ordRequest.searchParams.get("component")), {
      pattern: subject.identity.canonicalSmiles,
      target: "OUTPUT",
      mode: "EXACT",
    });
    assert.equal(ordRequest.searchParams.get("use_stereochemistry"), "true");
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("decoded exact ORD product match is a normalized pending fragment, never a route", () => {
  const reaction = new reactionPb.Reaction();
  const input = new reactionPb.ReactionInput();
  const reactant = input.addComponents();
  reactant.setReactionRole(reactionPb.ReactionRole.ReactionRoleType.REACTANT);
  const reactantName = reactant.addIdentifiers();
  reactantName.setType(reactionPb.CompoundIdentifier.CompoundIdentifierType.NAME);
  reactantName.setValue("Example precursor");
  const reactantSmiles = reactant.addIdentifiers();
  reactantSmiles.setType(reactionPb.CompoundIdentifier.CompoundIdentifierType.SMILES);
  reactantSmiles.setValue("CCO");
  reaction.getInputsMap().set("input-0", input);

  const outcome = reaction.addOutcomes();
  const product = outcome.addProducts();
  product.setReactionRole(reactionPb.ReactionRole.ReactionRoleType.PRODUCT);
  const productInchiKey = product.addIdentifiers();
  productInchiKey.setType(
    reactionPb.CompoundIdentifier.CompoundIdentifierType.INCHI_KEY,
  );
  productInchiKey.setValue("CCCCCCCCCCCCCC-DDDDDDDDDD-N");
  const productSmiles = product.addIdentifiers();
  productSmiles.setType(reactionPb.CompoundIdentifier.CompoundIdentifierType.SMILES);
  productSmiles.setValue("CC=O");

  const provenance = new reactionPb.ReactionProvenance();
  provenance.setDoi("10.1000/example");
  provenance.setPatent("synthetic-patent-document-beta");
  provenance.setPublicationUrl("https://example.test/source");
  provenance.setIsMined(true);
  reaction.setProvenance(provenance);

  const fragment = decodeOrdCandidate({
    dataset_id: "ord-dataset-example",
    reaction_id: "ord-reaction-decoded",
    proto: Buffer.from(reaction.serializeBinary()).toString("base64"),
  }, "CCCCCCCCCCCCCC-DDDDDDDDDD-N");

  assert.equal(fragment.candidateState, "candidate");
  assert.equal(fragment.reviewState, "pending");
  assert.equal(fragment.decodeState, "decoded");
  assert.equal(fragment.routeCompleteness, "partial");
  assert.deepEqual(fragment.inputs, [
    {
      role: "reactant",
      name: "Example precursor",
      smiles: "CCO",
      inchi: null,
      inchiKey: null,
      casNumber: null,
      pubChemCid: null,
      identityResolution: "structure_only",
    },
  ]);
  assert.deepEqual(fragment.products, [
    {
      role: "product",
      name: null,
      smiles: "CC=O",
      inchi: null,
      inchiKey: "CCCCCCCCCCCCCC-DDDDDDDDDD-N",
      casNumber: null,
      pubChemCid: null,
      identityResolution: "exact_inchi_key",
    },
  ]);
  assert.deepEqual(fragment.reactionClass, {
    taxonomyId: null,
    label: "Unclassified",
    normalizationState: "unclassified",
  });
  assert.deepEqual(fragment.bondChanges, {
    mappingState: "not_mapped",
    formed: [],
    broken: [],
    orderChanged: [],
  });
  assert.deepEqual(fragment.provenance, {
    datasetId: "ord-dataset-example",
    reactionId: "ord-reaction-decoded",
    doi: "10.1000/example",
    patent: "synthetic-patent-document-beta",
    publicationUrl: "https://example.test/source",
    isMined: true,
  });
  assert.deepEqual(fragment.sourceEvidence, {
    evidenceId: fragment.sourceEvidence.evidenceId,
    resolutionState: "candidate",
    sourceKind: "open_reaction_dataset",
  });
  assert.match(fragment.sourceEvidence.evidenceId, /^synthesis-source-evidence:ord:/u);
  assert.equal(fragment.licenseState, "attribution_required");
  assert.equal(fragment.operationalDetailsIncluded, false);
  for (const canonicalRouteField of [
    "routeType",
    "steps",
    "materials",
    "reportedCompleteRouteSourceIds",
    "segments",
    "proposal",
  ]) {
    assert.ok(!(canonicalRouteField in fragment));
  }

  const objectKeys = new Set();
  const collectObjectKeys = (value) => {
    if (Array.isArray(value)) {
      value.forEach(collectObjectKeys);
      return;
    }
    if (!value || typeof value !== "object") return;
    for (const [key, child] of Object.entries(value)) {
      objectKeys.add(key);
      collectObjectKeys(child);
    }
  };
  collectObjectKeys(fragment);
  for (const forbidden of [
    "proto",
    "conditions",
    "workups",
    "amount",
    "yield",
    "procedure",
  ]) {
    assert.ok(!objectKeys.has(forbidden), `must omit ${forbidden}`);
  }
});

test("candidate evidence assertions are scoped to the exact target identity", async () => {
  const subject = syntheticSubject;
  const secondIdentity = {
    ...subject,
    subjectId: "synthesis-discovery-subject:synthetic-compound-beta",
    catalogEntityId: "molecule:synthetic-fixture-alpha-second-identity",
    identity: {
      ...subject.identity,
      inchiKey: "EEEEEEEEEEEEEE-FFFFFFFFFF-N",
    },
  };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({
    resultList: {
      result: [{
        title: "Synthesis of Synthetic Compound Alpha",
        doi: "10.1000/shared-document",
        pubYear: "2000",
        isOpenAccess: "N",
      }],
    },
  });
  try {
    const [first, second] = await Promise.all([
      discoverEuropePmc(subject, context),
      discoverEuropePmc(secondIdentity, context),
    ]);
    assert.equal(first.evidence[0].documentId, second.evidence[0].documentId);
    assert.notEqual(first.evidence[0].id, second.evidence[0].id);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test("adapter HTTP failure is retained as completed_with_errors without evidence", async () => {
  const subject = syntheticSubject;
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => jsonResponse({ error: "temporarily unavailable" }, 503);

  try {
    const result = await discoverOpenReactionDatabase(subject, context);
    assert.equal(result.adapterId, "open-reaction-database");
    assert.equal(result.attempt.status, "completed_with_errors");
    assert.equal(result.attempt.queryCount, 1);
    assert.equal(result.attempt.candidateCount, 0);
    assert.equal(result.evidence.length, 0);
    assert.equal(result.attempt.errors.length, 1);
    assert.match(result.attempt.errors[0], /HTTP 503/iu);
  } finally {
    globalThis.fetch = originalFetch;
  }
});
