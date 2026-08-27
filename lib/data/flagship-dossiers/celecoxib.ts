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

const moleculeId = "molecule:celecoxib" as const;
const labelSource = "source:fda-celecoxib-020998-s058-2024" as const;
const identitySource = "source:pubchem-2662" as const;
const parentNodeId = "metabolite-node:molecule:celecoxib:parent";

export function createCelecoxibFlagshipSeed(
  locale: DossierLocale,
): FlagshipDossierSeed {
  const productConditions = {
    note: localized(
      locale,
      "Güncel FDA 2024 CELEBREX oral kapsül etiketi; bu genel ürün/form bağlamı tek doz PK kohortu anlamına gelmez.",
      "Current 2024 FDA CELEBREX oral-capsule label; this general product/form context does not imply the single-dose PK cohort.",
    ),
    route: "ORAL",
    formulation: "CAPSULE",
  };
  const table4Conditions = {
    ...productConditions,
    note: localized(
      locale,
      "Tek 200 mg oral kapsül, açlık, sağlıklı erişkinler (n=36, 19–52 yaş); FDA 2024 etiketi.",
      "Single 200 mg oral capsule, fasted healthy adults (n=36, age 19–52); 2024 FDA label.",
    ),
    dose: "200 mg",
    fedState: "fasted",
    population: "Healthy adults, age 19–52",
    cohortSize: 36,
    studyDesign: "Single-dose pharmacokinetic study",
  };
  const table4FieldConditions = (coefficientOfVariationPercent: number) => ({
    ...table4Conditions,
    coefficientOfVariationPercent,
  });
  const proteinBindingConditions = {
    ...productConditions,
    note: localized(
      locale,
      "Etikette bildirilen yaklaşık %97 plazma protein bağlanması; Table 4'teki n=36 tek-doz kohortuna atanmaz.",
      "Approximately 97% plasma-protein binding reported in the label; not assigned to the Table 4 n=36 single-dose cohort.",
    ),
  };
  const foodEffectConditions = {
    ...productConditions,
    note: localized(
      locale,
      "Etiketteki yüksek yağlı öğün karşılaştırması; Table 4'ün açlık n=36 koşulları bu alana aktarılmaz.",
      "High-fat-meal comparison from the label; the fasted Table 4 n=36 conditions are not transferred to this field.",
    ),
    fedState: "high-fat meal comparison",
    studyDesign: "Food-effect comparison",
  };
  const metabolismConditions = {
    ...productConditions,
    note: localized(
      locale,
      "Etiket-geneli metabolizma yolu; 200 mg açlık Table 4 kohortuna özel ölçüm değildir.",
      "Label-level metabolic pathway; not a measurement specific to the 200 mg fasted Table 4 cohort.",
    ),
  };
  const radiolabelConditions = {
    note: localized(
      locale,
      "Tek oral radyoişaretli celecoxib dozu kütle-denge bağlamı; etiket doz miktarını ve formülasyonu bu pasajda belirtmez, bu nedenle kapsül PK profiliyle birleştirilmez.",
      "Single oral radiolabeled celecoxib-dose mass-balance context; the label does not state the dose amount or formulation in this passage, so it is not merged with the capsule PK profile.",
    ),
    route: "ORAL",
    formulation: "FORMULATION NOT STATED IN SOURCE",
    studyDesign: "Single-dose radiolabel mass-balance study",
  };
  const halfLife = admeField("adme:celecoxib:half-life", "excretion", localized(locale, "Efektif yarı ömür", "Effective half-life"), 11.2, labelSource, table4FieldConditions(31), "h");
  const proteinBinding = admeField("adme:celecoxib:protein-binding", "distribution", localized(locale, "Plazma proteinlerine bağlanma", "Plasma protein binding"), 97, labelSource, proteinBindingConditions, "%", "approximately");
  const distribution = admeField("adme:celecoxib:vss-f", "distribution", "Vss/F", 429, labelSource, table4FieldConditions(34), "L");
  const clearance = admeField("adme:celecoxib:cl-f", "excretion", "CL/F", 27.7, labelSource, table4FieldConditions(28), "L/h");
  const radiolabelFeces = admeField("adme:celecoxib:radiolabel-feces", "excretion", localized(locale, "Dozun feçeste geri kazanılan payı", "Dose recovered in feces"), 57, labelSource, radiolabelConditions, "%", "approximately");
  const radiolabelUrine = admeField("adme:celecoxib:radiolabel-urine", "excretion", localized(locale, "Dozun idrarda geri kazanılan payı", "Dose recovered in urine"), 27, labelSource, radiolabelConditions, "%", "approximately");
  const admeProfile: AdmeProfile = {
    id: "adme:flagship:celecoxib:oral-capsule",
    molecularEntityId: moleculeId,
    chemicalFormId: "form:celecoxib:neutral",
    administration: {
      route: evidenceField("ORAL", labelSource, productConditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
      formulation: evidenceField("CAPSULE", labelSource, productConditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
    },
    absorption: [
      admeField("adme:celecoxib:cmax", "absorption", "Cmax", 705, labelSource, table4FieldConditions(38), "ng/mL"),
      admeField("adme:celecoxib:tmax", "absorption", "Tmax", 2.8, labelSource, table4FieldConditions(37), "h"),
      admeField(
        "adme:celecoxib:food-effect",
        "absorption",
        localized(locale, "Yüksek yağlı öğün etkisi", "High-fat meal effect"),
        localized(locale, "Tmax 1–2 saat gecikir; AUC %10–20 artar", "Tmax is delayed 1–2 h; AUC increases 10–20%"),
        labelSource,
        foodEffectConditions,
      ),
    ],
    distribution: [proteinBinding, distribution],
    metabolism: [
      admeField("adme:celecoxib:cyp2c9", "metabolism", localized(locale, "Birincil enzim bağlamı", "Primary enzyme context"), "CYP2C9", labelSource, metabolismConditions),
      admeField("adme:celecoxib:metabolic-sequence", "metabolism", localized(locale, "Metabolik sıra", "Metabolic sequence"), localized(locale, "Alkol → karboksilik asit → glukuronid", "Alcohol → carboxylic acid → glucuronide"), labelSource, metabolismConditions),
    ],
    excretion: [halfLife, clearance],
    halfLife,
    bioavailability: null,
    proteinBinding,
    volumeOfDistribution: distribution,
    clearance,
    metabolites: [],
    sourceIds: [labelSource],
    reviewStatus: "source-supported",
    evidenceAvailability: "source-supported",
    limitations: [
      localized(locale, "Mutlak oral biyoyararlanım anchor etikette çalışılmamıştır; null bırakılır.", "Absolute oral bioavailability was not studied in the anchor label and remains null."),
      localized(locale, "Table 4 Cmax, Tmax, yarı ömür, Vss/F ve CL/F değerleri tek 200 mg açlık çalışması koşullarından ayrılmaz; genel etiket alanları bu kohorta atanmaz.", "Table 4 Cmax, Tmax, half-life, Vss/F, and CL/F values remain attached to the single 200 mg fasted study; general label fields are not assigned to that cohort."),
    ],
  };
  const massBalanceProfile: AdmeProfile = {
    id: "adme:flagship:celecoxib:oral-radiolabel-mass-balance",
    molecularEntityId: moleculeId,
    chemicalFormId: "form:celecoxib:neutral",
    administration: {
      route: evidenceField("ORAL", labelSource, radiolabelConditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
      formulation: evidenceField("FORMULATION NOT STATED IN SOURCE", labelSource, radiolabelConditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
    },
    absorption: [],
    distribution: [],
    metabolism: [],
    excretion: [radiolabelFeces, radiolabelUrine],
    halfLife: null,
    bioavailability: null,
    proteinBinding: null,
    volumeOfDistribution: null,
    clearance: null,
    metabolites: [],
    sourceIds: [labelSource],
    reviewStatus: "source-supported",
    evidenceAvailability: "source-supported",
    limitations: [
      localized(locale, "Etiket pasajında formülasyon ve doz miktarı verilmediği için ikisi de çıkarılmaz veya tahmin edilmez.", "Because the label passage does not state the formulation or dose amount, neither is inferred or estimated."),
      localized(locale, "Bu kütle-denge profili, 200 mg açlık kapsül Table 4 PK profiliyle birleştirilmez.", "This mass-balance profile is not merged with the 200 mg fasted-capsule Table 4 PK profile."),
    ],
  };

  const classifications = classificationProfile("celecoxib", {
    therapeutic: [["nsaid", localized(locale, "Nonsteroidal antiinflamatuvar ilaç", "Nonsteroidal anti-inflammatory drug"), labelSource, localized(locale, "Etiket bağlamlı terapötik aile; klinik karşılaştırma değildir.", "Label-context therapeutic family; not a clinical comparison.")]],
    pharmacological: [["cox2-primary-inhibition", localized(locale, "Başlıca COX-2 üzerinden prostaglandin sentezi inhibitörü", "Prostaglandin-synthesis inhibitor acting primarily through COX-2"), labelSource, localized(locale, "“Yalnız COX-2” iddiası değildir.", "This is not a “COX-2 only” claim.")]],
    chemical: [["diaryl-pyrazole-sulfonamide", localized(locale, "Diaril pirazol / benzensülfonamid", "Diaryl pyrazole / benzenesulfonamide"), identitySource, localized(locale, "Yapıdan türetilmiş kimyasal aile.", "Structure-derived chemical family.")]],
  });
  const primaryTargets = [
    targetClaim(
      "target-claim:celecoxib:ptgs2",
      "PTGS2 · cyclooxygenase-2",
      localized(locale, "Prostaglandin-endoperoksit sentaz", "Prostaglandin-endoperoxide synthase"),
      "inhibitor",
      localized(locale, "Desteklenen etiket bağlamında başlıca COX-2 inhibisyonu ile prostaglandin sentezini azaltır", "In the supported label context, primarily inhibits COX-2 and thereby reduces prostaglandin synthesis"),
      "source:uniprot-p35354",
      labelSource,
      localized(locale, "Birincil hedef; tek moleküler etkileşim iddiası değildir.", "Primary target; not an only-molecular-interaction claim."),
    ),
  ];
  const metaboliteNodes = [
    metaboliteNode("metabolite-node:celecoxib:hydroxy", "Hydroxycelecoxib", "source:pubchem-9908776", localized(locale, "Metabolit kimliği ve 2B bağlantı doğrudan CID ile çözülür.", "Metabolite identity and 2D connectivity resolve to the direct CID."), "C1=CC(=CC=C1CO)C2=CC(=NN2C3=CC=C(C=C3)S(=O)(=O)N)C(F)(F)F"),
    metaboliteNode("metabolite-node:celecoxib:carboxy", "Carboxycelecoxib", "source:pubchem-10047220", localized(locale, "Metabolit kimliği ve 2B bağlantı doğrudan CID ile çözülür.", "Metabolite identity and 2D connectivity resolve to the direct CID."), "C1=CC(=CC=C1C2=CC(=NN2C3=CC=C(C=C3)S(=O)(=O)N)C(F)(F)F)C(=O)O"),
  ];
  const inactiveNote = localized(locale, "Etiket bu dolaşımdaki metabolitleri COX-1/COX-2 inhibitörleri olarak inaktif bağlamında tanımlar; bu başka aktivitelere genellenmez.", "The label describes these circulating metabolites as inactive as COX-1/COX-2 inhibitors; this is not generalized to every activity.");
  const metaboliteEdges = [
    metaboliteEdge("metabolite-edge:celecoxib:hydroxy", parentNodeId, metaboliteNodes[0].id, localized(locale, "Oksidasyon: alkol oluşumu", "Oxidation: alcohol formation"), "inactive", labelSource, inactiveNote, "CYP2C9"),
    metaboliteEdge("metabolite-edge:celecoxib:carboxy", parentNodeId, metaboliteNodes[1].id, localized(locale, "İleri oksidasyon: karboksilik asit", "Further oxidation: carboxylic acid"), "inactive", labelSource, inactiveNote),
  ];
  const curatedBacked = { evidenceType: "curated-database" as const, reviewStatus: "source-supported" as const };
  const regulatoryBacked = { evidenceType: "regulatory" as const, reviewStatus: "source-supported" as const };
  const journey = (
    value: string,
    fieldConditions = productConditions,
  ) => evidenceField(value, labelSource, fieldConditions, regulatoryBacked);

  return {
    moleculeId,
    classifications,
    primaryTargets,
    interactions: [],
    mechanismClaims: [
      mechanismClaim(
        "claim:celecoxib:flagship-mechanism",
        moleculeId,
        localized(locale, "Celecoxib desteklenen etiket bağlamında başlıca COX-2 inhibisyonu üzerinden prostaglandin sentezini azaltır.", "Celecoxib reduces prostaglandin synthesis primarily through COX-2 inhibition in the supported label context."),
        [labelSource],
        [localized(locale, "“Yalnız COX-2”, evrensel potency veya üstünlük sonucu üretilmez.", "No “COX-2 only,” universal potency, or superiority conclusion is generated.")],
      ),
    ],
    admeProfiles: [
      { ...admeProfile, metabolites: metaboliteEdges },
      massBalanceProfile,
    ],
    metaboliteNodes,
    metaboliteEdges,
    content: {
      productAnchor: {
        label: localized(locale, "CELEBREX oral kapsül — güncel FDA etiketi", "CELEBREX oral capsule — current FDA label"),
        route: "ORAL",
        formulation: "CAPSULE",
        chemicalFormId: "form:celecoxib:neutral",
        sourceId: labelSource,
        sourceEffectiveDate: "2024-11",
        boundary: productConditions.note,
        secondarySources: [{
          sourceId: "source:dailymed-celecoxib-stale-8d52185d",
          role: "stale-secondary",
          note: localized(
            locale,
            "2021 DailyMed kaydı yalnız stale ikincil locator olarak görünür tutulur; 2024 FDA anchorını geçersiz kılamaz.",
            "The 2021 DailyMed record remains visible only as a stale secondary locator and cannot override the 2024 FDA anchor.",
          ),
        }],
      },
      chemistryAnnotations: section("source-supported", [
        { id: "annotation:celecoxib:sulfonamide", kind: "functional-group", label: evidenceField(localized(locale, "Primer sülfonamid", "Primary sulfonamide"), identitySource, { note: localized(locale, "Yapıdan türetilmiş grup.", "Structure-derived group.") }, curatedBacked), ...atomMap(18, 19, 20, 21) },
        { id: "annotation:celecoxib:pyrazole", kind: "functional-group", label: evidenceField(localized(locale, "N-aril pirazol", "N-aryl pyrazole"), identitySource, { note: localized(locale, "Yapıdan türetilmiş grup.", "Structure-derived group.") }, curatedBacked), ...atomMap(7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17) },
        { id: "annotation:celecoxib:trifluoromethyl", kind: "functional-group", label: evidenceField(localized(locale, "Trifluorometil", "Trifluoromethyl"), identitySource, { note: localized(locale, "PubChem bağlantısından türetilmiş, kaynak-bağlı substitüent sınıflandırması.", "Source-bound substituent classification derived from the PubChem connectivity.") }, curatedBacked), ...atomMap(22, 23, 24, 25) },
        { id: "annotation:celecoxib:p-tolyl", kind: "functional-group", label: evidenceField(localized(locale, "4-metilfenil (p-tolil)", "4-Methylphenyl (p-tolyl)"), identitySource, { note: localized(locale, "PubChem bağlantısından türetilmiş, kaynak-bağlı substitüent sınıflandırması.", "Source-bound substituent classification derived from the PubChem connectivity.") }, curatedBacked), ...atomMap(0, 1, 2, 3, 4, 5, 6) },
        { id: "annotation:celecoxib:scaffold", kind: "scaffold", label: evidenceField(localized(locale, "1,5-diarilpirazol / benzensülfonamid", "1,5-diarylpyrazole / benzenesulfonamide"), identitySource, { note: localized(locale, "Yapıdan türetilmiş scaffold yorumu.", "Structure-derived scaffold interpretation.") }, curatedBacked), ...atomMap(1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21) },
      ], [identitySource]),
      descriptors: section("source-supported", [
        { id: "descriptor:celecoxib:pka", label: "pKa", field: evidenceField(11.1, labelSource, { note: localized(locale, "Etiket tarafından bildirilen boyutsuz değer.", "Dimensionless value reported by the label.") }, { unit: null, dimensionless: true, evidenceType: "regulatory", reviewStatus: "source-supported" }), provenance: "source-reported", unavailableReason: null },
        { id: "descriptor:celecoxib:logp", label: "logP", field: evidenceField(3.5, labelSource, { note: localized(locale, "Etiket tarafından bildirilen boyutsuz değer.", "Dimensionless value reported by the label.") }, { unit: null, dimensionless: true, evidenceType: "regulatory", reviewStatus: "source-supported" }), provenance: "source-reported", unavailableReason: null },
        { id: "descriptor:celecoxib:absolute-bioavailability", label: localized(locale, "Mutlak biyoyararlanım", "Absolute bioavailability"), field: null, provenance: "unavailable", unavailableReason: localized(locale, "Etiket anchorında çalışılmamıştır; tahmin edilmez.", "Not studied in the anchor label; not estimated.") },
      ], [labelSource]),
      journey: section("source-supported", [
        { id: "journey:celecoxib:route", kind: "route", label: localized(locale, "Uygulama", "Administration"), evidence: journey(localized(locale, "Oral kapsül", "Oral capsule")), unavailableReason: null },
        { id: "journey:celecoxib:absorption", kind: "absorption", label: localized(locale, "Emilim", "Absorption"), evidence: journey(localized(locale, "Açlık 200 mg çalışma bağlamında emilim", "Absorption in the fasted 200 mg study context"), table4Conditions), unavailableReason: null },
        { id: "journey:celecoxib:circulation", kind: "systemic-circulation", label: localized(locale, "Sistemik dolaşım", "Systemic circulation"), evidence: journey(localized(locale, "%97 protein bağlanmasıyla sistemik dağılım", "Systemic distribution with 97% protein binding"), proteinBindingConditions), unavailableReason: null },
        { id: "journey:celecoxib:target", kind: "molecular-target", label: localized(locale, "Moleküler hedef", "Molecular target"), evidence: evidenceField("PTGS2 / COX-2", "source:uniprot-p35354", { note: localized(locale, "Etiket mekanizmasıyla birlikte okunan hedef kimliği.", "Target identity read together with the label mechanism.") }, curatedBacked), unavailableReason: null },
        { id: "journey:celecoxib:downstream", kind: "downstream-effect", label: localized(locale, "Aşağı akım etki", "Downstream effect"), evidence: journey(localized(locale, "Prostaglandin sentezinin azalması", "Reduced prostaglandin synthesis")), unavailableReason: null },
        { id: "journey:celecoxib:metabolism", kind: "metabolism", label: localized(locale, "Metabolizma", "Metabolism"), evidence: journey(localized(locale, "Başlıca CYP2C9 ile oksidatif metabolizma", "Oxidative metabolism primarily through CYP2C9"), metabolismConditions), unavailableReason: null },
        { id: "journey:celecoxib:excretion", kind: "excretion", label: localized(locale, "Atılım", "Excretion"), evidence: journey(localized(locale, "Tek oral radyoişaretli dozdan sonra yaklaşık %57 feçes ve %27 idrar geri kazanımı", "After a single oral radiolabeled dose, approximately 57% is recovered in feces and 27% in urine"), radiolabelConditions), unavailableReason: null },
      ], [labelSource, "source:uniprot-p35354"]),
      synthesis: section("unavailable", null, [], [
        localized(
          locale,
          "Bu statik dossier sentez kanıtı veya rota iddiası yayımlamaz; güncel durum doğrulanmış Sentez Atlası kapsam kaydından okunmalıdır.",
          "This static dossier publishes no synthesis-evidence or route claim; consult the validated Synthesis Atlas coverage record for current status.",
        ),
      ]),
      nomenclature: section("source-supported", {
        variants: [{ id: "name:celecoxib:pubchem", role: "preferred", name: evidenceField("4-[5-(4-methylphenyl)-3-(trifluoromethyl)pyrazol-1-yl]benzenesulfonamide", identitySource, { note: localized(locale, "Kontrol edilen PubChem sistematik adı.", "Checked PubChem systematic name.") }, { evidenceType: "curated-database", reviewStatus: "source-supported" }) }],
        segments: [
          { id: "name-segment:celecoxib:parent", kind: "parent", text: "benzenesulfonamide", ...atomMap(12, 13, 14, 15, 16, 17, 18, 19, 20, 21), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:celecoxib:pyrazole", kind: "substituent", text: "pyrazol-1-yl", ...atomMap(7, 8, 9, 10, 11), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:celecoxib:methylphenyl", kind: "substituent", text: "5-(4-methylphenyl)", ...atomMap(0, 1, 2, 3, 4, 5, 6), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:celecoxib:cf3", kind: "substituent", text: "3-(trifluoromethyl)", ...atomMap(22, 23, 24, 25), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:celecoxib:sulfonamide", kind: "functional-suffix", text: "sulfonamide", ...atomMap(18, 19, 20, 21), sourceIds: [identitySource], reviewStatus: "source-supported" },
        ],
        conflictNote: null,
        sourceIds: [identitySource],
        reviewStatus: "source-supported",
      }, [identitySource]),
      comparisons: section("source-supported", [
        {
          id: "comparison:celecoxib:valdecoxib",
          name: "Valdecoxib",
          pubChemCid: 119607,
          sharedScaffold: evidenceField(localized(locale, "Diaril heterohalka ve primer sülfonamid bağlamı", "Diaryl heterocycle and primary-sulfonamide context"), "source:pubchem-119607", { note: localized(locale, "İki PubChem kimliği üzerinden sınırlı yapı karşılaştırmasıdır.", "Bounded structure comparison across the two PubChem identities.") }, curatedBacked),
          changedGroups: [evidenceField(localized(locale, "Celecoxibin CF3-substitüe pirazolü, valdecoxibde metil-substitüe izoksazol ile yer değiştirir; primer sülfonamid korunur.", "Celecoxib's CF3-substituted pyrazole is replaced by a methyl-substituted isoxazole in valdecoxib; the primary sulfonamide is retained."), "source:pubchem-119607", { note: localized(locale, "Kaynaklı bağlantı farkı; aktivite veya üstünlük sıralaması değildir.", "Sourced connectivity difference; not an activity or superiority ranking.") }, curatedBacked)],
          propertyDifferences: [comparativeEvidence(
            localized(locale, "PubChem, valdecoxib için C16H14N2O3S ve 314.4 g/mol; celecoxib için C17H14F3N3O2S ve 381.4 g/mol bildirir.", "PubChem records C16H14N2O3S and 314.4 g/mol for valdecoxib versus C17H14F3N3O2S and 381.4 g/mol for celecoxib."),
            [identitySource, "source:pubchem-119607"],
            { note: localized(locale, "Hesaplanmış kimlik tanımlayıcılarının kaynaklı karşılaştırmasıdır; klinik özellik veya üstünlük iddiası değildir.", "Sourced comparison of computed identity descriptors; not a clinical-property or superiority claim.") },
          )],
          targetActionDifference: comparativeEvidence(
            localized(locale, "Celecoxib ve tarihsel valdecoxib etiketleri prostaglandin sentezinin COX-2 üzerinden inhibisyonunu tanımlar; bu kaynak çözünürlüğünde ayrı bir hedef/eylem farkı desteklenmez.", "The celecoxib and historical valdecoxib labels describe inhibition of prostaglandin synthesis through COX-2; no distinct target/action difference is supported at this source resolution."),
            [labelSource, "source:fda-valdecoxib-label-21341-2004"],
            { note: localized(locale, "Paylaşılan etiket mekanizması görünürdür; tarihsel geri çekilme bağlamı ayrı tutulur ve klinik sıralama yapılmaz.", "The shared label mechanism is visible; the historical withdrawal context remains separate and no clinical ranking is made.") },
            { evidenceType: "regulatory" },
          ),
          regulatoryContext: evidenceField(localized(locale, "FDA NDA 021341 onayı 2 Ağustos 2013 tarihli Federal Register bildirimiyle geri çekilmiştir.", "FDA approval of NDA 021341 was withdrawn by the Federal Register notice effective 2 August 2013."), "source:federal-register-valdecoxib-withdrawal-2013-18657", { note: localized(locale, "Doğrudan resmi geri çekme bildirimi; güvenlilik veya sınıf sonucu üretilmez.", "Direct formal withdrawal notice; no safety or class conclusion is generated.") }, regulatoryBacked),
          sourceIds: [identitySource, "source:pubchem-119607", "source:drugsfda-valdecoxib-nda021341", "source:federal-register-valdecoxib-withdrawal-2013-18657", "source:fda-valdecoxib-label-21341-2004", labelSource],
          reviewStatus: "source-supported",
          limitations: [localized(locale, "Doğrudan etiketler aynı COX-2 eylem sınıfını destekler; ayrı bir hedef/eylem farkı, klinik sıralama veya güncel kullanım sonucu çıkarılmaz.", "Direct labels support the same COX-2 action class; no distinct target/action difference, clinical ranking, or current-use conclusion is inferred.")],
        },
        {
          id: "comparison:celecoxib:rofecoxib",
          name: "Rofecoxib",
          pubChemCid: 5090,
          sharedScaffold: evidenceField(localized(locale, "Diaril heterohalka bağlamı", "Diaryl heterocycle context"), "source:pubchem-5090", { note: localized(locale, "İki PubChem kimliği üzerinden sınırlı yapı karşılaştırmasıdır.", "Bounded structure comparison across the two PubChem identities.") }, curatedBacked),
          changedGroups: [evidenceField(localized(locale, "Celecoxibin pirazol/primer-sülfonamid düzeni, rofecoxibde diaril furanon/metilsülfon düzeniyle yer değiştirir.", "Celecoxib's pyrazole/primary-sulfonamide pattern is replaced by a diaryl furanone/methylsulfone pattern in rofecoxib."), "source:pubchem-5090", { note: localized(locale, "Kaynaklı bağlantı farkı; aktivite veya üstünlük sıralaması değildir.", "Sourced connectivity difference; not an activity or superiority ranking.") }, curatedBacked)],
          propertyDifferences: [comparativeEvidence(
            localized(locale, "PubChem, rofecoxib için C17H14O4S ve 314.4 g/mol; celecoxib için C17H14F3N3O2S ve 381.4 g/mol bildirir.", "PubChem records C17H14O4S and 314.4 g/mol for rofecoxib versus C17H14F3N3O2S and 381.4 g/mol for celecoxib."),
            [identitySource, "source:pubchem-5090"],
            { note: localized(locale, "Hesaplanmış kimlik tanımlayıcılarının kaynaklı karşılaştırmasıdır; klinik özellik veya üstünlük iddiası değildir.", "Sourced comparison of computed identity descriptors; not a clinical-property or superiority claim.") },
          )],
          targetActionDifference: comparativeEvidence(
            localized(locale, "Celecoxib ve tarihsel rofecoxib etiketleri prostaglandin sentezinin COX-2 üzerinden inhibisyonunu tanımlar; bu kaynak çözünürlüğünde ayrı bir hedef/eylem farkı desteklenmez.", "The celecoxib and historical rofecoxib labels describe inhibition of prostaglandin synthesis through COX-2; no distinct target/action difference is supported at this source resolution."),
            [labelSource, "source:fda-rofecoxib-label-21647-2004"],
            { note: localized(locale, "Paylaşılan etiket mekanizması görünürdür; tarihsel geri çekilme bağlamı ayrı tutulur ve klinik sıralama yapılmaz.", "The shared label mechanism is visible; the historical withdrawal context remains separate and no clinical ranking is made.") },
            { evidenceType: "regulatory" },
          ),
          regulatoryContext: evidenceField(localized(locale, "FDA NDA 021042 onayı 13 Eylül 2022 tarihli Federal Register bildirimiyle geri çekilmiştir.", "FDA approval of NDA 021042 was withdrawn by the Federal Register notice effective 13 September 2022."), "source:federal-register-rofecoxib-withdrawal-2022-19740", { note: localized(locale, "Doğrudan resmi geri çekme bildirimi; güvenlilik veya sınıf sonucu üretilmez.", "Direct formal withdrawal notice; no safety or class conclusion is generated.") }, regulatoryBacked),
          sourceIds: [identitySource, "source:pubchem-5090", "source:drugsfda-rofecoxib-nda021042", "source:federal-register-rofecoxib-withdrawal-2022-19740", "source:fda-rofecoxib-label-21647-2004", labelSource],
          reviewStatus: "source-supported",
          limitations: [localized(locale, "Doğrudan etiketler aynı COX-2 eylem sınıfını destekler; ayrı bir hedef/eylem farkı, klinik sıralama veya güncel kullanım sonucu çıkarılmaz.", "Direct labels support the same COX-2 action class; no distinct target/action difference, clinical ranking, or current-use conclusion is inferred.")],
        },
      ], [identitySource, labelSource, "source:pubchem-119607", "source:pubchem-5090", "source:drugsfda-valdecoxib-nda021341", "source:drugsfda-rofecoxib-nda021042", "source:federal-register-valdecoxib-withdrawal-2013-18657", "source:federal-register-rofecoxib-withdrawal-2022-19740", "source:fda-valdecoxib-label-21341-2004", "source:fda-rofecoxib-label-21647-2004"]),
      learning: section("source-supported", [
        { id: "learning:celecoxib:structure", kind: "structure", prompt: localized(locale, "Celecoxib yapısında hangi iki motif birlikte görünür?", "Which two motifs occur together in celecoxib?"), options: [{ id: "pyrazole-sulfonamide", label: localized(locale, "Diarilpirazol ve primer sülfonamid", "Diarylypyrazole and primary sulfonamide") }, { id: "amino-alcohol", label: localized(locale, "Ariloksi amino-alkol", "Aryloxy amino-alcohol") }], correctOptionId: "pyrazole-sulfonamide", explanation: localized(locale, "Yanıt yapı kimliğiyle sınırlıdır.", "The answer is limited to structure identity."), sourceIds: [identitySource], reviewStatus: "source-supported" },
        { id: "learning:celecoxib:pharmacology", kind: "pharmacology", prompt: localized(locale, "Birincil hedef eşlemesi hangisidir?", "What is the primary target mapping?"), options: [{ id: "ptgs2", label: "PTGS2 / COX-2" }, { id: "adrb1", label: "ADRB1" }], correctOptionId: "ptgs2", explanation: localized(locale, "Bu eşleme “yalnız COX-2” anlamına gelmez.", "This mapping does not mean “COX-2 only.”"), sourceIds: ["source:uniprot-p35354", labelSource], reviewStatus: "source-supported" },
      ], [identitySource, "source:uniprot-p35354", labelSource]),
      explicitMissingFields: [
        localized(locale, "Mutlak oral biyoyararlanım: çalışılmamış — null.", "Absolute oral bioavailability: not studied — null."),
        localized(locale, "Celecoxib glukuronid yapısı: CID çözümü hold; yanlış CID 131770042 dışlandı.", "Celecoxib glucuronide structure: CID resolution on hold; incorrect CID 131770042 excluded."),
      ],
    },
  };
}
