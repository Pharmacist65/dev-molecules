import type { AdmeProfile } from "@/lib/domain/adme";
import type { DossierLocale, FlagshipDossierSeed } from "@/lib/domain/dossier";

import {
  admeField,
  atomMap,
  classificationProfile,
  evidenceField,
  localized,
  mechanismClaim,
  metaboliteEdge,
  metaboliteNode,
  section,
  targetClaim,
} from "./common";
import { comparativeEvidence } from "./comparative";

const moleculeId = "molecule:propranolol" as const;
const labelSource = "source:dailymed-propranolol-tablet-554c7446" as const;
const identitySource = "source:pubchem-4946" as const;
const parentNodeId = "metabolite-node:molecule:propranolol:parent";

export function createPropranololFlagshipSeed(
  locale: DossierLocale,
): FlagshipDossierSeed {
  const oralConditions = {
    note: localized(
      locale,
      "Oral propranolol hidroklorür tablet etiketi; salım tipi çıkarılmaz ve farklı form veya uygulama yollarına aktarılmaz.",
      "Oral propranolol hydrochloride tablet label; release type is not inferred and the evidence is not transferred to other forms or routes.",
    ),
    route: "ORAL",
    formulation: "TABLET",
  };
  const bioavailability = admeField(
    "adme:propranolol-tablet:systemic-bioavailability",
    "absorption",
    localized(locale, "Sistemik biyoyararlanım", "Systemic bioavailability"),
    25,
    labelSource,
    oralConditions,
    "%",
    "approximately",
  );
  const proteinBinding = admeField(
    "adme:propranolol-tablet:protein-binding",
    "distribution",
    localized(locale, "Plazma proteinlerine bağlanma", "Plasma protein binding"),
    90,
    labelSource,
    oralConditions,
    "%",
    "approximately",
  );
  const volume = admeField(
    "adme:propranolol-tablet:apparent-distribution",
    "distribution",
    localized(locale, "Görünür dağılım", "Apparent distribution"),
    4,
    labelSource,
    oralConditions,
    "L/kg",
    "approximately",
  );
  const halfLife = admeField(
    "adme:propranolol-tablet:half-life",
    "excretion",
    localized(locale, "Plazma yarı ömrü", "Plasma half-life"),
    "3–6",
    labelSource,
    oralConditions,
    "h",
    "range",
  );
  const urinaryMetaboliteExcretion = admeField(
    "adme:propranolol-tablet:urinary-metabolite-excretion",
    "excretion",
    localized(locale, "Metabolitlerin atılımı", "Metabolite excretion"),
    localized(
      locale,
      "Metabolitlerin çoğu idrarda atılır",
      "Most metabolites are excreted in the urine",
    ),
    labelSource,
    oralConditions,
  );
  const admeProfile: AdmeProfile = {
    id: "adme:flagship:propranolol:oral-hcl-tablet",
    molecularEntityId: moleculeId,
    chemicalFormId: "form:propranolol:hydrochloride",
    administration: {
      route: evidenceField("ORAL", labelSource, oralConditions, {
        evidenceType: "regulatory",
        reviewStatus: "source-supported",
      }),
      formulation: evidenceField("TABLET", labelSource, oralConditions, {
        evidenceType: "regulatory",
        reviewStatus: "source-supported",
      }),
    },
    absorption: [
      admeField(
        "adme:propranolol-tablet:absorption",
        "absorption",
        localized(locale, "Emilim", "Absorption"),
        localized(locale, "Oral dozdan sonra neredeyse tam emilim", "Nearly complete absorption after an oral dose"),
        labelSource,
        oralConditions,
      ),
      bioavailability,
      admeField(
        "adme:propranolol-tablet:tmax",
        "absorption",
        "Tmax",
        "1–4",
        labelSource,
        oralConditions,
        "h",
        "range",
      ),
    ],
    distribution: [proteinBinding, volume],
    metabolism: [
      admeField(
        "adme:propranolol-tablet:metabolism-pathways",
        "metabolism",
        localized(locale, "Metabolizma yolları", "Metabolic pathways"),
        localized(
          locale,
          "Aromatik hidroksilasyon, N-dealkilasyon/yan zincir oksidasyonu ve doğrudan glukuronidasyon",
          "Aromatic hydroxylation, N-dealkylation/side-chain oxidation, and direct glucuronidation",
        ),
        labelSource,
        oralConditions,
      ),
      admeField(
        "adme:propranolol-tablet:enzymes",
        "metabolism",
        localized(locale, "Kaynakta adı geçen enzim bağlamları", "Source-named enzyme contexts"),
        "CYP2D6 · CYP1A2 · CYP2C19",
        labelSource,
        oralConditions,
      ),
    ],
    excretion: [halfLife, urinaryMetaboliteExcretion],
    halfLife,
    bioavailability,
    proteinBinding,
    volumeOfDistribution: volume,
    clearance: null,
    metabolites: [],
    sourceIds: [labelSource],
    reviewStatus: "source-supported",
    evidenceAvailability: "source-supported",
    limitations: [
      localized(locale, "Sağlıklı erişkin oral clearance değeri bulunamadı; tahmin edilmedi.", "Healthy-adult oral clearance was not found and is not estimated."),
      localized(locale, "Bu profil uzatılmış salımlı kapsül veya intravenöz uygulamaya aktarılmaz.", "This profile is not transferred to extended-release capsules or intravenous administration."),
    ],
  };

  const classifications = classificationProfile("propranolol", {
    therapeutic: [["beta-blocker", localized(locale, "Beta bloker", "Beta blocker"), labelSource, localized(locale, "Etiket bağlamlı terapötik aile; klinik öneri değildir.", "Label-context therapeutic family; not clinical guidance.")]],
    pharmacological: [["nonselective-beta-antagonist", localized(locale, "Nonselektif beta-adrenoseptör antagonisti", "Nonselective beta-adrenoceptor antagonist"), labelSource, localized(locale, "ADRB1/ADRB2 antagonizması kaynak bağlamıyla tutulur.", "ADRB1/ADRB2 antagonism remains source-context qualified.")]],
    chemical: [["aryloxypropanolamine", localized(locale, "Ariloksipropanolamin / naftoksipropanolamin", "Aryloxypropanolamine / naphthoxypropanolamine"), identitySource, localized(locale, "Yapıdan türetilmiş kimyasal aile; uzman incelemesi gerekir.", "Structure-derived chemical family; expert review is required.")]],
  });

  const primaryTargets = [
    targetClaim(
      "target-claim:propranolol:adrb1",
      "ADRB1 · beta-1 adrenergic receptor",
      localized(locale, "Beta adrenerjik GPCR", "Beta-adrenergic GPCR"),
      "antagonist",
      localized(locale, "Beta-adrenerjik reseptör bölgesinde yarışmalı antagonizma", "Competitive antagonism at beta-adrenergic receptor sites"),
      "source:uniprot-p08588",
      labelSource,
      localized(locale, "Birincil hedef eşlemesi; tek etkileşim iddiası değildir.", "Primary target mapping; not an only-interaction claim."),
    ),
    targetClaim(
      "target-claim:propranolol:adrb2",
      "ADRB2 · beta-2 adrenergic receptor",
      localized(locale, "Beta adrenerjik GPCR", "Beta-adrenergic GPCR"),
      "antagonist",
      localized(locale, "Beta-adrenerjik reseptör bölgesinde yarışmalı antagonizma", "Competitive antagonism at beta-adrenergic receptor sites"),
      "source:uniprot-p07550",
      labelSource,
      localized(locale, "Birincil hedef eşlemesi; klinik selektivite sıralaması değildir.", "Primary target mapping; not a clinical selectivity ranking."),
    ),
  ];

  const metaboliteNodes = [
    metaboliteNode("metabolite-node:propranolol:4-hydroxy", "4-Hydroxypropranolol", "source:pubchem-91565", localized(locale, "Kimlik ve 2B bağlantı doğrudan CID ile çözülür; aktivite genellenmez.", "Identity and 2D connectivity resolve to the direct CID; activity is not generalized."), "CC(C)NCC(COC1=CC=C(C2=CC=CC=C21)O)O"),
    metaboliteNode("metabolite-node:propranolol:naphthoxylactic", "Naphthoxylactic acid", "source:pubchem-115274", localized(locale, "Kimlik ve 2B bağlantı doğrudan CID ile çözülür.", "Identity and 2D connectivity resolve to the direct CID."), "C1=CC=C2C(=C1)C=CC=C2OCC(C(=O)O)O"),
    metaboliteNode("metabolite-node:propranolol:glucuronide", "Propranolol glucuronide", "source:pubchem-119515", localized(locale, "Konjugasyon konumu ve tam stereokimya inceleme bekler; yapı gösterilmez.", "Conjugation position and complete stereochemistry remain held; no structure is shown."), null),
  ];
  const metaboliteEdges = [
    metaboliteEdge(
      "metabolite-edge:propranolol:4-hydroxy",
      parentNodeId,
      metaboliteNodes[0].id,
      localized(locale, "Aromatik hidroksilasyon", "Aromatic hydroxylation"),
      "active-beta-blocker-preclinical",
      labelSource,
      localized(locale, "Etiket-bağlamlı metabolit yolu; dönüşüm kanıtı insan klinik etkisi anlamına gelmez.", "Label-context metabolite pathway; transformation evidence does not imply a human clinical effect."),
      "CYP2D6",
      {
        sourceId: "source:pubmed-4400184",
        note: localized(locale, "Kedi, kobay, sıçan ve anestezi altındaki köpek modellerinde beta-adrenoseptör blokajı; insan klinik etki iddiası değildir.", "Beta-adrenoceptor blockade in cat, guinea-pig, rat, and anesthetized-dog models; not a human clinical-effect claim."),
        evidenceType: "direct-experimental",
      },
    ),
    metaboliteEdge("metabolite-edge:propranolol:naphthoxylactic", parentNodeId, metaboliteNodes[1].id, localized(locale, "Yan zincir oksidasyonu", "Side-chain oxidation"), "unknown", labelSource, localized(locale, "Etiket-bağlamlı dönüşüm.", "Label-context transformation.")),
    metaboliteEdge("metabolite-edge:propranolol:glucuronide", parentNodeId, metaboliteNodes[2].id, localized(locale, "Doğrudan glukuronidasyon", "Direct glucuronidation"), "unknown", labelSource, localized(locale, "Konjugat yapı ayrıntısı hold durumundadır.", "Conjugate structure detail remains on hold.")),
  ];

  const curatedBacked = { evidenceType: "curated-database" as const, reviewStatus: "source-supported" as const };
  const regulatoryBacked = { evidenceType: "regulatory" as const, reviewStatus: "source-supported" as const };
  const journeyField = (value: string) => evidenceField(value, labelSource, oralConditions, regulatoryBacked);

  return {
    moleculeId,
    classifications,
    primaryTargets,
    interactions: [],
    mechanismClaims: [
      mechanismClaim(
        "claim:propranolol:flagship-mechanism",
        moleculeId,
        localized(locale, "Propranolol beta-adrenerjik reseptör bölgelerinde yarışmalı antagonizma gösterir; hipertansif etkinin tam mekanizması etikette belirlenmiş değildir.", "Propranolol competitively antagonizes beta-adrenergic receptor sites; the label does not establish the full mechanism of its antihypertensive effect."),
        [labelSource],
        [localized(locale, "Etiketteki mekanizma belirsizliği korunur.", "The label's mechanism uncertainty is preserved.")],
      ),
    ],
    admeProfiles: [{ ...admeProfile, metabolites: metaboliteEdges }],
    metaboliteNodes,
    metaboliteEdges,
    content: {
      productAnchor: {
        label: localized(locale, "Propranolol hidroklorür oral tablet", "Propranolol hydrochloride oral tablet"),
        route: "ORAL",
        formulation: "TABLET",
        chemicalFormId: "form:propranolol:hydrochloride",
        sourceId: labelSource,
        sourceEffectiveDate: "2026-07-14",
        boundary: oralConditions.note,
        secondarySources: [],
      },
      chemistryAnnotations: section("source-supported", [
        { id: "annotation:propranolol:naphthalene", kind: "functional-group", label: evidenceField(localized(locale, "Naftalen", "Naphthalene"), identitySource, { note: localized(locale, "Yapıdan türetilmiş ve kaynak kimliğine bağlı halka sistemi.", "Structure-derived ring system bound to the source identity.") }, curatedBacked), ...atomMap(8, 9, 10, 11, 12, 13, 14, 15, 16, 17) },
        { id: "annotation:propranolol:aryl-ether", kind: "functional-group", label: evidenceField(localized(locale, "Aril eter", "Aryl ether"), identitySource, { note: localized(locale, "PubChem bağlantısından türetilmiş, kaynak-bağlı grup sınıflandırması.", "Source-bound group classification derived from the PubChem connectivity.") }, curatedBacked), ...atomMap(6, 7, 8) },
        { id: "annotation:propranolol:secondary-amine", kind: "functional-group", label: evidenceField(localized(locale, "Sekonder amin", "Secondary amine"), identitySource, { note: localized(locale, "PubChem bağlantısından türetilmiş, kaynak-bağlı grup sınıflandırması.", "Source-bound group classification derived from the PubChem connectivity.") }, curatedBacked), ...atomMap(1, 3, 4) },
        { id: "annotation:propranolol:secondary-alcohol", kind: "functional-group", label: evidenceField(localized(locale, "Sekonder alkol", "Secondary alcohol"), identitySource, { note: localized(locale, "Yapıdan türetilmiş ve kaynak kimliğine bağlı grup.", "Structure-derived group bound to the source identity.") }, curatedBacked), ...atomMap(5, 18) },
        { id: "annotation:propranolol:aryloxypropanolamine", kind: "scaffold", label: evidenceField(localized(locale, "Ariloksipropanolamin", "Aryloxypropanolamine"), identitySource, { note: localized(locale, "Yapıdan türetilmiş scaffold yorumu.", "Structure-derived scaffold interpretation.") }, curatedBacked), ...atomMap(3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18) },
      ], [identitySource]),
      descriptors: section("unavailable", [
        { id: "descriptor:propranolol:clearance", label: localized(locale, "Oral clearance", "Oral clearance"), field: null, provenance: "unavailable", unavailableReason: localized(locale, "Sağlıklı erişkin oral değer bulunamadı; tahmin edilmedi.", "No healthy-adult oral value was found; it is not estimated.") },
      ], [labelSource]),
      journey: section("source-supported", [
        { id: "journey:propranolol:route", kind: "route", label: localized(locale, "Uygulama", "Administration"), evidence: journeyField(localized(locale, "Oral propranolol HCl tablet", "Oral propranolol HCl tablet")), unavailableReason: null },
        { id: "journey:propranolol:absorption", kind: "absorption", label: localized(locale, "Emilim", "Absorption"), evidence: journeyField(localized(locale, "Neredeyse tam emilim; belirgin first-pass sınırı", "Nearly complete absorption with a substantial first-pass boundary")), unavailableReason: null },
        { id: "journey:propranolol:circulation", kind: "systemic-circulation", label: localized(locale, "Sistemik dolaşım", "Systemic circulation"), evidence: journeyField(localized(locale, "Etiket-bağlamlı sistemik maruziyet", "Label-context systemic exposure")), unavailableReason: null },
        { id: "journey:propranolol:target", kind: "molecular-target", label: localized(locale, "Moleküler hedef", "Molecular target"), evidence: journeyField(localized(locale, "Nonselektif beta-adrenerjik reseptörler", "Nonselective beta-adrenergic receptors")), unavailableReason: null },
        { id: "journey:propranolol:metabolism", kind: "metabolism", label: localized(locale, "Metabolizma", "Metabolism"), evidence: journeyField(localized(locale, "Hepatik oksidasyon ve glukuronidasyon", "Hepatic oxidation and glucuronidation")), unavailableReason: null },
        { id: "journey:propranolol:excretion", kind: "excretion", label: localized(locale, "Atılım", "Excretion"), evidence: journeyField(localized(locale, "Metabolitlerin çoğu idrarda atılır", "Most metabolites are excreted in the urine")), unavailableReason: null },
      ], [labelSource, "source:uniprot-p08588", "source:uniprot-p07550"]),
      synthesis: section("source-supported", {
        id: "synthesis:propranolol-flagship-phase-a",
        title: localized(locale, "Propranolol: raporlanmış epoksit rotası", "Propranolol: reported epoxide route"),
        summary: localized(locale, "1-naftol ve epiklorohidrinden glisidil eter/epoksit; izopropilaminle halka açılması; serbest baz ve ayrı HCl form sınırı.", "1-Naphthol and epichlorohydrin to a glycidyl ether/epoxide; isopropylamine ring opening; free-base and separate HCl-form boundary."),
        materials: [
          { id: "material:propranolol:1-naphthol", label: "1-naphthol", role: "starting-material", smiles: "C1=CC=C2C(=C1)C=CC=C2O", structureReviewStatus: "source-supported", sourceIds: ["source:pubchem-7005", "source:patent-gb2238786a"] },
          { id: "material:propranolol:epichlorohydrin", label: "epichlorohydrin", role: "starting-material", smiles: "C1C(O1)CCl", structureReviewStatus: "source-supported", sourceIds: ["source:pubchem-7835", "source:patent-gb2238786a"] },
          { id: "material:propranolol:isopropylamine", label: "isopropylamine", role: "starting-material", smiles: "CC(C)N", structureReviewStatus: "source-supported", sourceIds: ["source:pubchem-6363", "source:patent-gb2238786a"] },
          { id: "material:propranolol:glycidyl-ether", label: "2-(naphthalen-1-yloxymethyl)oxirane", role: "intermediate", smiles: "C1C(O1)COC2=CC=CC3=CC=CC=C32", structureReviewStatus: "source-supported", sourceIds: ["source:pubchem-91521", "source:patent-gb2238786a"] },
          { id: "material:propranolol:free-base", label: "propranolol free-base connectivity", role: "final-product", smiles: "CC(C)NCC(COC1=CC=CC2=CC=CC=C21)O", structureReviewStatus: "source-supported", sourceIds: [identitySource, "source:patent-gb2238786a"] },
        ],
        steps: [
          { id: "flagship-step:propranolol:epoxide", order: 1, title: localized(locale, "Glisidil eter/epoksit bağlantısı", "Glycidyl ether/epoxide connectivity"), inputMaterialIds: ["material:propranolol:1-naphthol", "material:propranolol:epichlorohydrin"], outputMaterialId: "material:propranolol:glycidyl-ether", reactionClass: localized(locale, "O-alkilasyon / epoksit korunumu", "O-alkylation / epoxide retention"), bondChangeSummary: localized(locale, "Kaynak-bağlı bağlantı özeti; atom map inceleme bekler.", "Source-bound connectivity summary; atom mapping awaits review."), sourceIds: ["source:patent-gb2238786a"], reviewStatus: "source-supported" },
          { id: "flagship-step:propranolol:ring-opening", order: 2, title: localized(locale, "Aminle epoksit halka açılması", "Amine epoxide ring opening"), inputMaterialIds: ["material:propranolol:glycidyl-ether", "material:propranolol:isopropylamine"], outputMaterialId: "material:propranolol:free-base", reactionClass: localized(locale, "Nükleofilik epoksit halka açılması", "Nucleophilic epoxide ring opening"), bondChangeSummary: localized(locale, "Amino-alkol bağlantısı oluşur; stereokimya atanmaz.", "Amino-alcohol connectivity forms; stereochemistry is not assigned."), sourceIds: ["source:patent-gb2238786a"], reviewStatus: "source-supported" },
        ],
        sourceIds: ["source:patent-gb2238786a", identitySource],
        reviewStatus: "source-supported",
        operationalDetailsIncluded: false,
        limitations: [localized(locale, "Miktar, koşul, work-up veya üretim talimatı içermez.", "Contains no quantities, conditions, work-up, or manufacturing instruction.")],
      }, ["source:patent-gb2238786a", identitySource]),
      nomenclature: section("source-supported", {
        variants: [{ id: "name:propranolol:pubchem", role: "preferred", name: evidenceField("1-naphthalen-1-yloxy-3-(propan-2-ylamino)propan-2-ol", identitySource, { note: localized(locale, "PubChem exact sistematik ad biçimi; etkileşimli segment locantları ayrıca düzeltilmiştir.", "Exact PubChem systematic-name form; interactive segment locants are corrected separately.") }, { evidenceType: "curated-database", reviewStatus: "source-supported" }) }],
        segments: [
          { id: "name-segment:propranolol:parent", kind: "parent", text: "propan-2-ol", ...atomMap(4, 5, 6, 18), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:propranolol:amino", kind: "substituent", text: "3-(propan-2-ylamino)", ...atomMap(0, 1, 2, 3), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:propranolol:naphthoxy", kind: "substituent", text: "1-(naphthalen-1-yloxy)", ...atomMap(7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:propranolol:ol", kind: "functional-suffix", text: "-ol", ...atomMap(18), sourceIds: [identitySource], reviewStatus: "source-supported" },
        ],
        conflictNote: null,
        sourceIds: [identitySource],
        reviewStatus: "source-supported",
      }, [identitySource]),
      comparisons: section("source-supported", [
        {
          id: "comparison:propranolol:metoprolol",
          name: "Metoprolol",
          pubChemCid: 4171,
          sharedScaffold: evidenceField(localized(locale, "Ariloksipropanolamin amino-alkol motifi", "Aryloxypropanolamine amino-alcohol motif"), "source:pubchem-4171", { note: localized(locale, "İki PubChem kimliği üzerinden sınırlı yapı karşılaştırmasıdır.", "Bounded structure comparison across the two PubChem identities.") }, curatedBacked),
          changedGroups: [evidenceField(localized(locale, "Propranololün naftalen bölgesi, metoprololde para-(2-metoksietil)fenoksi düzeniyle yer değiştirir.", "Propranolol's naphthalene region is replaced by a para-(2-methoxyethyl)phenoxy pattern in metoprolol."), "source:pubchem-4171", { note: localized(locale, "Bağlantı farkı; SAR, üstünlük veya etkililik sonucu değildir.", "Connectivity difference; not an SAR, superiority, or efficacy conclusion.") }, curatedBacked)],
          propertyDifferences: [comparativeEvidence(
            localized(locale, "PubChem, metoprolol için C15H25NO3 ve 267.36 g/mol; propranolol için C16H21NO2 ve 259.34 g/mol bildirir.", "PubChem records C15H25NO3 and 267.36 g/mol for metoprolol versus C16H21NO2 and 259.34 g/mol for propranolol."),
            [identitySource, "source:pubchem-4171"],
            { note: localized(locale, "Hesaplanmış kimlik tanımlayıcılarının kaynaklı karşılaştırmasıdır; klinik özellik veya üstünlük iddiası değildir.", "Sourced comparison of computed identity descriptors; not a clinical-property or superiority claim.") },
          )],
          targetActionDifference: comparativeEvidence(
            localized(locale, "Metoprolol etiketi beta-1-selektif adrenerjik blokajı, propranolol anchor etiketi ise nonselektif beta-adrenerjik blokajı tanımlar.", "The metoprolol label describes beta-1-selective adrenergic blockade, whereas the propranolol anchor label describes nonselective beta-adrenergic blockade."),
            ["source:dailymed-metoprolol-52c822f2", labelSource],
            { note: localized(locale, "İki doğrudan ürün etiketine bağlı eylem-aile farkı; klinik seçicilik veya üstünlük sıralaması değildir.", "Action-family difference bound to two direct product labels; not a clinical selectivity or superiority ranking.") },
            { evidenceType: "regulatory" },
          ),
          regulatoryContext: null,
          sourceIds: [identitySource, "source:pubchem-4171", "source:dailymed-metoprolol-52c822f2", labelSource],
          reviewStatus: "source-supported",
          limitations: [localized(locale, "Ürün, doz, yol, etkililik, güvenlilik ve düzenleyici eşdeğerlik karşılaştırılmaz.", "Products, doses, routes, efficacy, safety, and regulatory equivalence are not compared.")],
        },
        {
          id: "comparison:propranolol:atenolol",
          name: "Atenolol",
          pubChemCid: 2249,
          sharedScaffold: evidenceField(localized(locale, "Ariloksipropanolamin amino-alkol motifi", "Aryloxypropanolamine amino-alcohol motif"), "source:pubchem-2249", { note: localized(locale, "İki PubChem kimliği üzerinden sınırlı yapı karşılaştırmasıdır.", "Bounded structure comparison across the two PubChem identities.") }, curatedBacked),
          changedGroups: [evidenceField(localized(locale, "Propranololün naftalen bölgesi, atenololde para-(karbamoilmetil)fenoksi düzeniyle yer değiştirir.", "Propranolol's naphthalene region is replaced by a para-(carbamoylmethyl)phenoxy pattern in atenolol."), "source:pubchem-2249", { note: localized(locale, "Bağlantı farkı; SAR, üstünlük veya etkililik sonucu değildir.", "Connectivity difference; not an SAR, superiority, or efficacy conclusion.") }, curatedBacked)],
          propertyDifferences: [comparativeEvidence(
            localized(locale, "PubChem, atenolol için C14H22N2O3 ve 266.34 g/mol; propranolol için C16H21NO2 ve 259.34 g/mol bildirir.", "PubChem records C14H22N2O3 and 266.34 g/mol for atenolol versus C16H21NO2 and 259.34 g/mol for propranolol."),
            [identitySource, "source:pubchem-2249"],
            { note: localized(locale, "Hesaplanmış kimlik tanımlayıcılarının kaynaklı karşılaştırmasıdır; klinik özellik veya üstünlük iddiası değildir.", "Sourced comparison of computed identity descriptors; not a clinical-property or superiority claim.") },
          )],
          targetActionDifference: comparativeEvidence(
            localized(locale, "Atenolol etiketi beta-1-selektif adrenerjik blokajı, propranolol anchor etiketi ise nonselektif beta-adrenerjik blokajı tanımlar.", "The atenolol label describes beta-1-selective adrenergic blockade, whereas the propranolol anchor label describes nonselective beta-adrenergic blockade."),
            ["source:dailymed-atenolol-db801706", labelSource],
            { note: localized(locale, "İki doğrudan ürün etiketine bağlı eylem-aile farkı; klinik seçicilik veya üstünlük sıralaması değildir.", "Action-family difference bound to two direct product labels; not a clinical selectivity or superiority ranking.") },
            { evidenceType: "regulatory" },
          ),
          regulatoryContext: null,
          sourceIds: [identitySource, "source:pubchem-2249", "source:dailymed-atenolol-db801706", labelSource],
          reviewStatus: "source-supported",
          limitations: [localized(locale, "Ürün, doz, yol, etkililik, güvenlilik ve düzenleyici eşdeğerlik karşılaştırılmaz.", "Products, doses, routes, efficacy, safety, and regulatory equivalence are not compared.")],
        },
      ], [identitySource, "source:pubchem-4171", "source:pubchem-2249", "source:dailymed-metoprolol-52c822f2", "source:dailymed-atenolol-db801706"]),
      learning: section("source-supported", [
        { id: "learning:propranolol:structure", kind: "structure", prompt: localized(locale, "Hangi motif ariloksipropanolamin scaffoldını tanımaya yardım eder?", "Which motif helps identify the aryloxypropanolamine scaffold?"), options: [{ id: "amino-alcohol", label: localized(locale, "Aril eter bağlı amino-alkol yan zinciri", "Aryl-ether-linked amino-alcohol side chain") }, { id: "sulfonamide", label: localized(locale, "Primer sülfonamid", "Primary sulfonamide") }], correctOptionId: "amino-alcohol", explanation: localized(locale, "Bu yapı görevi kaynaklı kimliği öğretir; farmakolojik sonuç üretmez.", "This structure task teaches sourced identity; it does not generate a pharmacology conclusion."), sourceIds: [identitySource], reviewStatus: "source-supported" },
        { id: "learning:propranolol:pharmacology", kind: "pharmacology", prompt: localized(locale, "Birincil hedef eşlemesi hangi iki reseptörü içerir?", "Which two receptors are included in the primary target mapping?"), options: [{ id: "adrb", label: "ADRB1 · ADRB2" }, { id: "ptgs2", label: "PTGS2" }], correctOptionId: "adrb", explanation: localized(locale, "Eşleme kaynak-bağlıdır ve tek etkileşim iddiası değildir.", "The mapping is source-bound and is not an only-interaction claim."), sourceIds: ["source:uniprot-p08588", "source:uniprot-p07550", labelSource], reviewStatus: "source-supported" },
        { id: "learning:propranolol:synthesis", kind: "synthesis", prompt: localized(locale, "Amino-alkol bağlantısını hangi dönüşüm açıklar?", "Which transformation explains the amino-alcohol connectivity?"), options: [{ id: "epoxide-opening", label: localized(locale, "Aminle epoksit halka açılması", "Amine epoxide ring opening") }, { id: "hydrolysis", label: localized(locale, "Basit ester hidrolizi", "Simple ester hydrolysis") }], correctOptionId: "epoxide-opening", explanation: localized(locale, "Bu, kaynaklandırılmış bağlantı hikâyesidir; laboratuvar protokolü değildir.", "This is a sourced connectivity story, not a laboratory protocol."), sourceIds: ["source:patent-gb2238786a"], reviewStatus: "source-supported" },
      ], [identitySource, "source:uniprot-p08588", "source:uniprot-p07550", labelSource, "source:patent-gb2238786a"]),
      explicitMissingFields: [
        localized(locale, "Sağlıklı erişkin oral clearance: bulunamadı — tahmin edilmedi.", "Healthy-adult oral clearance: not found — not estimated."),
        localized(locale, "Propranolol glukuronid konjugasyon konumu ve stereokimyası: hold.", "Propranolol glucuronide conjugation position and stereochemistry: hold."),
      ],
    },
  };
}
