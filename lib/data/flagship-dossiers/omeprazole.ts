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

const moleculeId = "molecule:omeprazole" as const;
const labelSource = "source:dailymed-omeprazole-dr-92201fb1" as const;
const identitySource = "source:pubchem-4594" as const;
const parentNodeId = "metabolite-node:molecule:omeprazole:parent";

export function createOmeprazoleFlagshipSeed(
  locale: DossierLocale,
): FlagshipDossierSeed {
  const conditions = {
    note: localized(
      locale,
      "Omeprazole delayed-release oral kapsül (10/20/40 mg) etiketi; serbest rasemik ana kimlik magnezyum ve sodyum formlarından ayrı tutulur.",
      "Omeprazole delayed-release oral capsule label (10/20/40 mg); the racemic free-parent identity remains separate from magnesium and sodium forms.",
    ),
    route: "ORAL",
    formulation: "DELAYED-RELEASE CAPSULE",
  };
  const bioavailabilityConditions = {
    ...conditions,
    note: localized(
      locale,
      "20–40 mg oral delayed-release omeprazolün intravenöz karşılaştırmaya göre mutlak biyoyararlanımı; 10 mg gücüne genellenmez.",
      "Absolute bioavailability of 20–40 mg oral delayed-release omeprazole versus intravenous comparison; not generalized to the 10 mg strength.",
    ),
    dose: "20–40 mg",
    studyDesign: "Oral versus intravenous absolute-bioavailability comparison",
  };
  const healthySubjectConditions = {
    ...conditions,
    note: localized(
      locale,
      "Etikette sağlıklı gönüllüler için bildirilen farmakokinetik değer; hasta popülasyonlarına veya ayrı kimyasal formlara aktarılmaz.",
      "Pharmacokinetic value reported for healthy subjects in the label; not transferred to patient populations or separate chemical forms.",
    ),
    population: "Healthy subjects",
  };
  const proteinBindingConditions = {
    ...conditions,
    note: localized(
      locale,
      "Etikette yaklaşık %95 plazma protein bağlanması olarak bildirilir; ürün güçleri arasında ayrı ölçüm varsayılmaz.",
      "Reported in the label as approximately 95% plasma-protein bound; no separate measurement across product strengths is assumed.",
    ),
  };
  const tmaxConditions = {
    ...conditions,
    note: localized(
      locale,
      "Delayed-release kapsül etiketi tarafından bildirilen Tmax aralığı; güçler arasında ayrı bir karşılaştırma olarak yorumlanmaz.",
      "Tmax range reported by the delayed-release capsule label; not interpreted as a separate comparison across strengths.",
    ),
  };
  const metabolismConditions = {
    ...conditions,
    note: localized(
      locale,
      "Etiket-geneli CYP2C19/CYP3A4 yol bağlamı; belirli bir doz, kohort veya göreli enzim katkısı varsayılmaz.",
      "Label-level CYP2C19/CYP3A4 pathway context; no specific dose, cohort, or relative enzyme contribution is assumed.",
    ),
  };
  const radiolabelConditions = {
    note: localized(
      locale,
      "Tek doz oral tamponlanmış omeprazol çözeltisi kütle-denge bağlamı; delayed-release kapsül formuna aktarılmaz.",
      "Single-dose oral buffered omeprazole solution mass-balance context; not transferred to the delayed-release capsule formulation.",
    ),
    route: "ORAL",
    formulation: "BUFFERED ORAL SOLUTION",
    studyDesign: "Single-dose mass-balance study",
  };
  const bioavailability = admeField("adme:omeprazole-dr:bioavailability", "absorption", localized(locale, "Mutlak biyoyararlanım", "Absolute bioavailability"), "30–40", labelSource, bioavailabilityConditions, "%", "range");
  const proteinBinding = admeField("adme:omeprazole-dr:protein-binding", "distribution", localized(locale, "Plazma proteinlerine bağlanma", "Plasma protein binding"), 95, labelSource, proteinBindingConditions, "%", "approximately");
  const halfLife = admeField("adme:omeprazole-dr:half-life", "excretion", localized(locale, "Plazma yarı ömrü", "Plasma half-life"), "0.5–1", labelSource, healthySubjectConditions, "h", "range");
  const clearance = admeField("adme:omeprazole-dr:clearance", "excretion", localized(locale, "Clearance", "Clearance"), "500–600", labelSource, healthySubjectConditions, "mL/min", "range");
  const radiolabelUrine = admeField("adme:omeprazole-buffered-solution:urine", "excretion", localized(locale, "Dozun idrardaki metabolit payı", "Dose recovered as urinary metabolites"), 77, labelSource, radiolabelConditions, "%", "approximately");
  const radiolabelFeces = admeField("adme:omeprazole-buffered-solution:fecal-remainder", "excretion", localized(locale, "Kalan eliminasyon bağlamı", "Remaining elimination context"), localized(locale, "Kalan doz feçeste; idrarda değişmemiş ana molekül çok az veya yok", "Remainder recovered in feces; little if any unchanged parent in urine"), labelSource, radiolabelConditions);
  const admeProfile: AdmeProfile = {
    id: "adme:flagship:omeprazole:oral-delayed-release-capsule",
    molecularEntityId: moleculeId,
    chemicalFormId: "form:omeprazole:free-parent",
    administration: {
      route: evidenceField("ORAL", labelSource, conditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
      formulation: evidenceField("DELAYED-RELEASE CAPSULE", labelSource, conditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
    },
    absorption: [
      admeField("adme:omeprazole-dr:tmax", "absorption", "Tmax", "0.5–3.5", labelSource, tmaxConditions, "h", "range"),
      bioavailability,
    ],
    distribution: [proteinBinding],
    metabolism: [
      admeField("adme:omeprazole-dr:cyp2c19", "metabolism", "CYP2C19", localized(locale, "5′-hidroksiomeprazol yolu", "5′-hydroxyomeprazole pathway"), labelSource, metabolismConditions),
      admeField("adme:omeprazole-dr:cyp3a4", "metabolism", "CYP3A4", localized(locale, "Omeprazol sülfon yolu", "Omeprazole sulfone pathway"), labelSource, metabolismConditions),
    ],
    excretion: [
      halfLife,
      clearance,
    ],
    halfLife,
    bioavailability,
    proteinBinding,
    volumeOfDistribution: null,
    clearance,
    metabolites: [],
    sourceIds: [labelSource],
    reviewStatus: "source-supported",
    evidenceAvailability: "source-supported",
    limitations: [
      localized(locale, "Etiket-destekli dağılım hacmi yoktur; null bırakılır.", "No label-supported volume of distribution is available; it remains null."),
      localized(locale, "Magnezyum veya sodyum form verileri bu profile aktarılmaz.", "No magnesium- or sodium-form values are transferred into this profile."),
    ],
  };
  const massBalanceProfile: AdmeProfile = {
    id: "adme:flagship:omeprazole:oral-buffered-solution-mass-balance",
    molecularEntityId: moleculeId,
    chemicalFormId: "form:omeprazole:free-parent",
    administration: {
      route: evidenceField("ORAL", labelSource, radiolabelConditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
      formulation: evidenceField("BUFFERED ORAL SOLUTION", labelSource, radiolabelConditions, { evidenceType: "regulatory", reviewStatus: "source-supported" }),
    },
    absorption: [],
    distribution: [],
    metabolism: [],
    excretion: [radiolabelUrine, radiolabelFeces],
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
      localized(locale, "Bu kütle-denge profili tamponlanmış oral çözeltiye aittir; delayed-release kapsül PK profiliyle birleştirilmez.", "This mass-balance profile belongs to a buffered oral solution and is not merged with the delayed-release capsule PK profile."),
      localized(locale, "Etiket pasajı burada doz miktarı vermediği için doz tahmin edilmez.", "The label passage does not state the dose amount here, so no dose is inferred."),
    ],
  };

  const classifications = classificationProfile("omeprazole", {
    therapeutic: [["proton-pump-inhibitor", localized(locale, "Proton pompası inhibitörü", "Proton pump inhibitor"), labelSource, localized(locale, "Etiket bağlamlı terapötik aile; doz önerisi değildir.", "Label-context therapeutic family; not dosing guidance.")]],
    pharmacological: [["proton-pump-inhibition", localized(locale, "Proton pompası inhibitörü", "Proton pump inhibitor"), labelSource, localized(locale, "Etiket farmakolojik sınıfı; asidik aktivasyon ve kovalent inhibisyon ayrı mekanizma iddiasında label + PMID ile çözülür.", "Label pharmacological class; acid activation and covalent inhibition resolve separately in the mechanism claim through the label plus PMID.")]],
    chemical: [["pyridylmethylsulfinyl-benzimidazole", localized(locale, "Piridilmetilsülfinil-benzimidazol", "Pyridylmethylsulfinyl-benzimidazole"), identitySource, localized(locale, "Yapıdan türetilmiş kimyasal aile.", "Structure-derived chemical family.")]],
  });
  const primaryTargets = [
    targetClaim(
      "target-claim:omeprazole:atp4a",
      "ATP4A · gastric H+/K+-ATPase alpha subunit",
      localized(locale, "P-tipi ATPaz", "P-type ATPase"),
      "inhibitor",
      localized(locale, "Asidik bölmede aktivasyondan sonra proton pompasının kovalent inhibisyonu", "Covalent proton-pump inhibition after activation in the acidic compartment"),
      "source:uniprot-p20648",
      labelSource,
      localized(locale, "Birincil hedef eşlemesi; özgül sistein haritası veya evrensel IC50 içermez.", "Primary target mapping; contains no specific cysteine map or universal IC50."),
      ["source:pubmed-9593713"],
    ),
  ];
  const metaboliteNodes = [
    metaboliteNode("metabolite-node:omeprazole:5-hydroxy", "5′-Hydroxyomeprazole", "source:pubchem-119560", localized(locale, "Metabolit kimliği ve 2B bağlantı doğrudan CID ile çözülür.", "Metabolite identity and 2D connectivity resolve to the direct CID."), "CC1=C(C(=CN=C1CS(=O)C2=NC3=C(N2)C=C(C=C3)OC)CO)OC"),
    metaboliteNode("metabolite-node:omeprazole:sulfone", "Omeprazole sulfone", "source:pubchem-145900", localized(locale, "Metabolit kimliği ve 2B bağlantı doğrudan CID ile çözülür.", "Metabolite identity and 2D connectivity resolve to the direct CID."), "CC1=CN=C(C(=C1OC)C)CS(=O)(=O)C2=NC3=C(N2)C=C(C=C3)OC"),
    metaboliteNode("metabolite-node:omeprazole:sulfide", "Omeprazole sulfide", "source:pubchem-155794", localized(locale, "Metabolit kimliği ve 2B bağlantı doğrudan CID ile çözülür.", "Metabolite identity and 2D connectivity resolve to the direct CID."), "CC1=CN=C(C(=C1OC)C)CSC2=NC3=C(N2)C=C(C=C3)OC"),
  ];
  const activityNote = localized(locale, "Etiket bu üç metabolit için çok az veya hiç antisekretuvar aktivite bağlamı verir; “tüm aktivitelerde inaktif” sonucu üretilmez.", "The label gives a very little or no antisecretory activity context for these three metabolites; no “inactive in every activity” conclusion is generated.");
  const metaboliteEdges = [
    metaboliteEdge("metabolite-edge:omeprazole:5-hydroxy", parentNodeId, metaboliteNodes[0].id, localized(locale, "Hidroksilasyon", "Hydroxylation"), "very-little-or-no-antisecretory", labelSource, activityNote, "CYP2C19"),
    metaboliteEdge("metabolite-edge:omeprazole:sulfone", parentNodeId, metaboliteNodes[1].id, localized(locale, "Sülfon oksidasyonu", "Sulfone oxidation"), "very-little-or-no-antisecretory", labelSource, activityNote, "CYP3A4"),
    metaboliteEdge("metabolite-edge:omeprazole:sulfide", parentNodeId, metaboliteNodes[2].id, localized(locale, "Sülfid metabolit yolu", "Sulfide metabolite pathway"), "very-little-or-no-antisecretory", labelSource, activityNote),
  ];
  const curatedBacked = { evidenceType: "curated-database" as const, reviewStatus: "source-supported" as const };
  const regulatoryBacked = { evidenceType: "regulatory" as const, reviewStatus: "source-supported" as const };
  const journey = (
    value: string,
    note: string,
    fieldConditions = conditions,
  ) => evidenceField(value, labelSource, { ...fieldConditions, note }, regulatoryBacked);

  return {
    moleculeId,
    classifications,
    primaryTargets,
    interactions: [],
    mechanismClaims: [
      mechanismClaim(
        "claim:omeprazole:flagship-mechanism",
        moleculeId,
        localized(locale, "Enterik teslimden sonra omeprazole intestinal olarak emilir, asidik pariyetal hücre bölmesinde reaktif sülfenik asit/sülfenamid kimyası üzerinden aktive olur ve proton pompasını kovalent olarak inhibe eder.", "After enteric delivery, omeprazole is absorbed intestinally, activated through reactive sulfenic-acid/sulfenamide chemistry in the acidic parietal-cell compartment, and covalently inhibits the proton pump."),
        [labelSource, "source:pubmed-9593713", "source:pmc-7500594"],
        [localized(locale, "Aktivasyon ürünü yapıları, özgül sistein haritası ve evrensel potency bu kayıtta yayımlanmaz.", "Activation-product structures, a specific cysteine map, and universal potency are not published in this record.")],
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
        label: localized(locale, "Omeprazole delayed-release oral kapsül 10/20/40 mg", "Omeprazole delayed-release oral capsule 10/20/40 mg"),
        route: "ORAL",
        formulation: "DELAYED-RELEASE CAPSULE",
        chemicalFormId: "form:omeprazole:free-parent",
        sourceId: labelSource,
        sourceEffectiveDate: "2023-04-21",
        boundary: conditions.note,
        secondarySources: [],
      },
      chemistryAnnotations: section("source-supported", [
        { id: "annotation:omeprazole:benzimidazole", kind: "functional-group", label: evidenceField(localized(locale, "Benzimidazol", "Benzimidazole"), identitySource, { note: localized(locale, "Yapıdan türetilmiş grup; vurgu, bu kaydın exact canonical SMILES atom sırasına bağlıdır.", "Structure-derived group; highlighting is bound to this record's exact canonical-SMILES atom order.") }, curatedBacked), ...atomMap(13, 14, 15, 16, 17, 18, 19, 20, 21) },
        { id: "annotation:omeprazole:pyridine", kind: "functional-group", label: evidenceField(localized(locale, "Piridin", "Pyridine"), identitySource, { note: localized(locale, "Yapıdan türetilmiş grup; vurgu exact canonical SMILES sırasına bağlıdır.", "Structure-derived group; highlighting is tied to the exact canonical-SMILES order.") }, curatedBacked), ...atomMap(1, 2, 3, 4, 5, 6) },
        { id: "annotation:omeprazole:sulfoxide", kind: "functional-group", label: evidenceField(localized(locale, "Sülfoxit", "Sulfoxide"), identitySource, { note: localized(locale, "Stereojenik kükürt bağlamı ayrıca korunur; komşu bağlam vurgulanır ama mutlak konfigürasyon atanmaz.", "The stereogenic-sulfur boundary is retained separately; neighboring context is highlighted without assigning absolute configuration.") }, curatedBacked), ...atomMap(10, 11, 12, 13) },
        { id: "annotation:omeprazole:methoxy", kind: "functional-group", label: evidenceField(localized(locale, "Metoksi substitüentleri", "Methoxy substituents"), identitySource, { note: localized(locale, "PubChem bağlantısından türetilmiş, kaynak-bağlı substitüent sınıflandırması; kaynakların 5-/6- locant biçimleri aynı kürate bağlantı üzerinde korunur.", "Source-bound substituent classification derived from the PubChem connectivity; source-specific 5-/6-locant forms are preserved over the same curated connectivity.") }, curatedBacked), ...atomMap(7, 8, 19, 22, 23) },
        { id: "annotation:omeprazole:scaffold", kind: "scaffold", label: evidenceField(localized(locale, "Piridilmetilsülfinil-benzimidazol", "Pyridylmethylsulfinyl-benzimidazole"), identitySource, { note: localized(locale, "Yapıdan türetilmiş scaffold yorumu; vurgu exact canonical SMILES serileştirmesine bağlıdır.", "Structure-derived scaffold interpretation; highlighting is bound to the exact canonical-SMILES serialization.") }, curatedBacked), ...atomMap(1, 2, 3, 4, 5, 6, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21) },
      ], [identitySource, "source:chebi-7772"]),
      descriptors: section("unavailable", [
        { id: "descriptor:omeprazole:volume-of-distribution", label: localized(locale, "Dağılım hacmi", "Volume of distribution"), field: null, provenance: "unavailable", unavailableReason: localized(locale, "Anchor etikette desteklenmez; tahmin edilmedi.", "Not supported by the anchor label; not estimated.") },
      ], [labelSource]),
      journey: section("source-supported", [
        { id: "journey:omeprazole:route", kind: "route", label: localized(locale, "Uygulama", "Administration"), evidence: journey(localized(locale, "Enterik mikrotablet içeren delayed-release oral kapsül", "Delayed-release oral capsule containing enteric microtablets"), localized(locale, "Ürün/form anchorı; diğer omeprazol formlarına aktarılmaz.", "Product/form anchor; not transferred to other omeprazole forms.")), unavailableReason: null },
        { id: "journey:omeprazole:absorption", kind: "absorption", label: localized(locale, "Emilim", "Absorption"), evidence: journey(localized(locale, "Gastrik çıkıştan sonra intestinal emilim", "Intestinal absorption after gastric exit"), localized(locale, "Delayed-release ürünün kaynaklı emilim anlatısı; ayrı ölçüm değildir.", "Sourced delayed-release-product absorption narrative; not a separate measurement.")), unavailableReason: null },
        { id: "journey:omeprazole:circulation", kind: "systemic-circulation", label: localized(locale, "Sistemik dolaşım", "Systemic circulation"), evidence: journey(localized(locale, "Kaynak-bağlı sistemik yolculuk", "Source-bound systemic journey"), localized(locale, "Eğitsel yolculuk düğümü; belirli doz veya kohort ölçümü değildir.", "Educational journey node; not a dose- or cohort-specific measurement.")), unavailableReason: null },
        { id: "journey:omeprazole:tissue", kind: "target-tissue", label: localized(locale, "Hedef bölme", "Target compartment"), evidence: journey(localized(locale, "Asidik pariyetal hücre bölmesi", "Acidic parietal-cell compartment"), localized(locale, "Etiket mekanizmasına bağlı hedef-bölme anlatısı.", "Target-compartment narrative bound to the label mechanism.")), unavailableReason: null },
        { id: "journey:omeprazole:target", kind: "molecular-target", label: localized(locale, "Moleküler hedef", "Molecular target"), evidence: evidenceField("ATP4A · gastric H+/K+-ATPase", "source:uniprot-p20648", { note: localized(locale, "Doğrudan hedef kimliği; etki mekanizması label/literatürle ayrı çözülür.", "Direct target identity; action mechanism resolves separately through label/literature.") }, curatedBacked), unavailableReason: null },
        { id: "journey:omeprazole:downstream", kind: "downstream-effect", label: localized(locale, "Aşağı akım etki", "Downstream effect"), evidence: evidenceField(localized(locale, "Aktivasyon sonrası proton pompası inhibisyonu", "Proton-pump inhibition after activation"), "source:pubmed-9593713", { note: localized(locale, "Doğrudan literatür kaynağıyla sınırlı kovalent inhibisyon özeti; asit aktivasyon bağlamı ürün etiketiyle ayrıca çözülür.", "Covalent-inhibition summary bounded to the direct literature source; the acid-activation context resolves separately through the product label.") }, { evidenceType: "literature-reported", reviewStatus: "source-supported" }), unavailableReason: null },
        { id: "journey:omeprazole:metabolism", kind: "metabolism", label: localized(locale, "Metabolizma", "Metabolism"), evidence: journey("CYP2C19 · CYP3A4", metabolismConditions.note, metabolismConditions), unavailableReason: null },
        { id: "journey:omeprazole:excretion", kind: "excretion", label: localized(locale, "Atılım", "Excretion"), evidence: journey(localized(locale, "Tamponlanmış oral çözelti çalışmasında metabolitler halinde üriner ve fekal eliminasyon", "Urinary and fecal elimination as metabolites in the buffered oral-solution study"), radiolabelConditions.note, radiolabelConditions), unavailableReason: null },
      ], [labelSource, "source:uniprot-p20648", "source:pubmed-9593713"]),
      synthesis: section("source-supported", {
        id: "synthesis:omeprazole-flagship-phase-a",
        title: localized(locale, "Omeprazole: raporlanmış sülfid–sülfoxit rotası", "Omeprazole: reported sulfide-to-sulfoxide route"),
        summary: localized(locale, "Sübstitüe 2-merkaptobenzimidazol ve klorometilpiridinden sülfid; kontrollü oksidasyonla sülfoxit.", "A sulfide from substituted 2-mercaptobenzimidazole and chloromethylpyridine; controlled oxidation to the sulfoxide."),
        materials: [
          { id: "material:omeprazole:mercaptobenzimidazole", label: "5-Methoxy-2-mercaptobenzimidazole", role: "starting-material", smiles: "COC1=CC2=C(C=C1)NC(=S)N2", structureReviewStatus: "source-supported", sourceIds: ["source:pubchem-665603"] },
          { id: "material:omeprazole:chloromethylpyridine", label: "2-(chloromethyl)-4-methoxy-3,5-dimethylpyridine hydrochloride", role: "starting-material", smiles: "CC1=CN=C(C(=C1OC)C)CCl.Cl", structureReviewStatus: "source-supported", sourceIds: ["source:pubchem-11694258"] },
          { id: "material:omeprazole:sulfide", label: "Omeprazole sulfide", role: "intermediate", smiles: "CC1=CN=C(C(=C1OC)C)CSC2=NC3=C(N2)C=C(C=C3)OC", structureReviewStatus: "source-supported", sourceIds: ["source:pubchem-155794"] },
          { id: "material:omeprazole:product", label: "Racemic omeprazole connectivity", role: "final-product", smiles: "CC1=CN=C(C(=C1OC)C)CS(=O)C2=NC3=C(N2)C=C(C=C3)OC", structureReviewStatus: "source-supported", sourceIds: [identitySource] },
        ],
        steps: [
          { id: "flagship-step:omeprazole:sulfide", order: 1, title: localized(locale, "Sülfid bağlantısı", "Sulfide connectivity"), inputMaterialIds: ["material:omeprazole:mercaptobenzimidazole", "material:omeprazole:chloromethylpyridine"], outputMaterialId: "material:omeprazole:sulfide", reactionClass: localized(locale, "S-alkilasyon / tiyoeter oluşumu", "S-alkylation / thioether formation"), bondChangeSummary: localized(locale, "Kaynak bağlantısı korunur; atom map inceleme bekler.", "Source linkage is preserved; atom mapping awaits review."), sourceIds: ["source:patent-ep0005129a1"], reviewStatus: "source-supported" },
          { id: "flagship-step:omeprazole:oxidation", order: 2, title: localized(locale, "Sülfoxit oluşumu", "Sulfoxide formation"), inputMaterialIds: ["material:omeprazole:sulfide"], outputMaterialId: "material:omeprazole:product", reactionClass: localized(locale, "Kontrollü sülfid oksidasyonu", "Controlled sulfide oxidation"), bondChangeSummary: localized(locale, "Sülfid sülfoxide dönüşür; mutlak konfigürasyon atanmaz.", "Sulfide becomes sulfoxide; no absolute configuration is assigned."), sourceIds: ["source:patent-ep0005129a1", "source:patent-us5386032a"], reviewStatus: "source-supported" },
        ],
        sourceIds: ["source:patent-ep0005129a1", "source:patent-us5386032a", identitySource],
        reviewStatus: "source-supported",
        operationalDetailsIncluded: false,
        limitations: [
          localized(locale, "Operasyon parametreleri, üretim veya FTO iddiası içermez.", "Contains no operating parameters, manufacturing claim, or FTO opinion."),
          localized(locale, "PubChem başlangıç materyalini thione tautomer biçiminde serileştirir; görsel kimliği destekler, atom-kusursuz mekanizma veya proton aktarımı iddiası oluşturmaz.", "PubChem serializes the starting material in its thione tautomer form; the drawing supports material identity but makes no atom-perfect mechanism or proton-transfer claim."),
          localized(locale, "Klorometilpiridin hidroklorür kaynağı ayrık nötr Cl biçiminde serileştirilir; protonlanma konumu veya yük durumu bu kayıttan çıkarılmaz.", "The chloromethylpyridine hydrochloride source is serialized with disconnected neutral Cl; no protonation site or charge state is inferred from this record."),
        ],
      }, ["source:patent-ep0005129a1", "source:patent-us5386032a", identitySource]),
      nomenclature: section("source-supported", {
        variants: [
          { id: "name:omeprazole:pubchem", role: "source-specific", name: evidenceField("6-methoxy-2-[(4-methoxy-3,5-dimethylpyridin-2-yl)methylsulfinyl]-1H-benzimidazole", identitySource, { note: localized(locale, "PubChem hesaplanmış sistematik ad formu; 6-methoxy locantını kullanır.", "PubChem computed systematic-name form using the 6-methoxy locant.") }, { evidenceType: "curated-database", reviewStatus: "source-supported" }) },
          { id: "name:omeprazole:label", role: "source-specific", name: evidenceField("5-methoxy-2-[[(4-methoxy-3,5-dimethyl-2-pyridinyl)methyl]sulfinyl]-1H-benzimidazole", labelSource, { note: localized(locale, "DailyMed Description bölümündeki exact kimyasal ad; kaynak yazımı normalize edilmiş boşluklarla korunur.", "Exact chemical name from the DailyMed Description section, retaining source wording with normalized spacing.") }, { evidenceType: "regulatory", reviewStatus: "source-supported" }) },
          { id: "name:omeprazole:chebi", role: "source-specific", name: evidenceField("rac-5-methoxy-2-{[(4-methoxy-3,5-dimethylpyridin-2-yl)methyl]sulfinyl}-1H-benzimidazole", "source:chebi-7772", { note: localized(locale, "ChEBI 7772 exact IUPAC adı ve rasemat bağlamı.", "Exact ChEBI 7772 IUPAC name and racemate context.") }, { evidenceType: "curated-database", reviewStatus: "source-supported" }) },
        ],
        segments: [
          { id: "name-segment:omeprazole:benzimidazole", kind: "parent", text: "1H-benzimidazole", ...atomMap(13, 14, 15, 16, 17, 18, 19, 20, 21), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:omeprazole:sulfinyl", kind: "substituent", text: "methylsulfinyl", ...atomMap(10, 11, 12), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:omeprazole:pyridylmethyl", kind: "substituent", text: "(4-methoxy-3,5-dimethylpyridin-2-yl)methyl", ...atomMap(0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:omeprazole:pyridine-methoxy", kind: "substituent", text: "4-methoxy", ...atomMap(7, 8), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:omeprazole:pyridine-dimethyl", kind: "substituent", text: "3,5-dimethyl", ...atomMap(0, 9), sourceIds: [identitySource], reviewStatus: "source-supported" },
          { id: "name-segment:omeprazole:benzimidazole-methoxy", kind: "locant", text: localized(locale, "Kaynağa özgü 5-/6-methoxy biçimi", "Source-specific 5-/6-methoxy form"), ...atomMap(19, 22, 23), sourceIds: [identitySource, labelSource, "source:chebi-7772"], reviewStatus: "source-supported" },
          { id: "name-segment:omeprazole:racemate", kind: "stereodescriptor", text: localized(locale, "R/S rasemat", "R/S racemate"), ...atomMap(11), sourceIds: [identitySource, "source:chebi-7772"], reviewStatus: "source-supported" },
        ],
        conflictNote: localized(locale, "5-methoxy, PubChem 6-methoxy ve ChEBI rac-5 kaynak biçimleri aynı kürate bağlantı için kaynağa özgü adlandırma biçimleridir; atıfları korunur ve buradan bir yapı çatışması çıkarılmaz.", "The 5-methoxy, PubChem 6-methoxy, and ChEBI rac-5 forms are source-specific nomenclature forms for the same curated connectivity; attribution is preserved and no structure conflict is inferred."),
        sourceIds: [identitySource, labelSource, "source:chebi-7772"],
        reviewStatus: "source-supported",
      }, [identitySource, labelSource, "source:chebi-7772"]),
      comparisons: section("source-supported", [
        {
          id: "comparison:omeprazole:esomeprazole",
          name: "Esomeprazole",
          pubChemCid: 9568614,
          sharedScaffold: evidenceField(localized(locale, "Aynı benzimidazol/piridin sülfoxit bağlantısı", "The same benzimidazole/pyridine sulfoxide connectivity"), "source:pubchem-9568614", { note: localized(locale, "İki PubChem kimliği üzerinden stereo-sınırlı yapı karşılaştırmasıdır.", "Stereo-bounded structure comparison across the two PubChem identities.") }, curatedBacked),
          changedGroups: [evidenceField(localized(locale, "Omeprazole R/S rasemat olarak tutulurken esomeprazole S-sülfoxit stereokimyasıyla tanımlanır; bağlantı değişmez.", "Omeprazole is retained as the R/S racemate, whereas esomeprazole is specified as the S-sulfoxide stereoisomer; connectivity is unchanged."), "source:pubchem-9568614", { note: localized(locale, "Stereo farkı; etkinlik, güvenlilik veya üstünlük sonucu değildir.", "Stereochemical difference; not an efficacy, safety, or superiority conclusion.") }, curatedBacked)],
          propertyDifferences: [comparativeEvidence(
            localized(locale, "PubChem her iki kimlik için de C17H19N3O3S ve 345.4 g/mol bildirir; kürate fark bağlantı değil, S-sülfoxit stereo tanımı ile rasemik omeprazol arasındadır.", "PubChem records the same formula and molecular weight (C17H19N3O3S; 345.4 g/mol) for both; the curated difference is S-sulfoxide stereochemical specification versus racemic omeprazole, not connectivity."),
            [identitySource, "source:pubchem-9568614"],
            { note: localized(locale, "Hesaplanmış kimlik tanımlayıcıları ve stereo sınırın kaynaklı karşılaştırmasıdır; klinik özellik iddiası değildir.", "Sourced comparison of computed identity descriptors and the stereochemical boundary; not a clinical-property claim.") },
          )],
          targetActionDifference: comparativeEvidence(
            localized(locale, "Omeprazole ve esomeprazole etiketleri pariyetal hücre H+/K+-ATPaz proton pompasının inhibisyonunu tanımlar; kaynaklı fark hedef/eylemde değil, rasemat ile S-sülfoxit kimliğindedir.", "The omeprazole and esomeprazole labels describe inhibition of the parietal-cell H+/K+-ATPase proton pump; the sourced difference is racemate versus S-sulfoxide identity, not target/action."),
            [labelSource, "source:dailymed-esomeprazole-ea79f802"],
            { note: localized(locale, "İki doğrudan etiketle sınırlı hedef/eylem karşılaştırması; klinik üstünlük veya eşdeğerlik sonucu değildir.", "Target/action comparison bounded to two direct labels; not a clinical superiority or equivalence conclusion.") },
            { evidenceType: "regulatory" },
          ),
          regulatoryContext: null,
          sourceIds: [identitySource, "source:pubchem-9568614", labelSource, "source:dailymed-esomeprazole-ea79f802"],
          reviewStatus: "source-supported",
          limitations: [localized(locale, "Doğrudan etiketler aynı proton-pompası hedef/eylem sınıfını destekler; doz, etkinlik, güvenlilik veya klinik sıralama karşılaştırılmaz.", "Direct labels support the same proton-pump target/action class; dose, efficacy, safety, and clinical ranking are not compared.")],
        },
        {
          id: "comparison:omeprazole:lansoprazole",
          name: "Lansoprazole",
          pubChemCid: 3883,
          sharedScaffold: evidenceField(localized(locale, "Benzimidazol/piridin sülfoxit aile bağlamı", "Benzimidazole/pyridine sulfoxide family context"), "source:pubchem-3883", { note: localized(locale, "İki PubChem kimliği üzerinden sınırlı yapı karşılaştırmasıdır.", "Bounded structure comparison across the two PubChem identities.") }, curatedBacked),
          changedGroups: [evidenceField(localized(locale, "Lansoprazole 3-metil/4-(2,2,2-trifluoroetoksi) piridin ve sübstitüe edilmemiş benzimidazol taşır; omeprazole 3,5-dimetil/4-metoksi piridin ve metoksi-sübstitüe benzimidazol taşır.", "Lansoprazole has a 3-methyl/4-(2,2,2-trifluoroethoxy) pyridine and an unsubstituted benzimidazole; omeprazole has a 3,5-dimethyl/4-methoxy pyridine and a methoxy-substituted benzimidazole."), "source:pubchem-3883", { note: localized(locale, "Kaynaklı bağlantı farkı; SAR veya klinik sıralama değildir.", "Sourced connectivity difference; not an SAR or clinical ranking.") }, curatedBacked)],
          propertyDifferences: [comparativeEvidence(
            localized(locale, "PubChem, lansoprazole için C16H14F3N3O2S ve 369.4 g/mol; omeprazole için C17H19N3O3S ve 345.4 g/mol bildirir.", "PubChem records C16H14F3N3O2S and 369.4 g/mol for lansoprazole versus C17H19N3O3S and 345.4 g/mol for omeprazole."),
            [identitySource, "source:pubchem-3883"],
            { note: localized(locale, "Hesaplanmış kimlik tanımlayıcılarının kaynaklı karşılaştırmasıdır; klinik özellik veya üstünlük iddiası değildir.", "Sourced comparison of computed identity descriptors; not a clinical-property or superiority claim.") },
          )],
          targetActionDifference: comparativeEvidence(
            localized(locale, "Omeprazole ve lansoprazole etiketleri gastrik H+/K+-ATPaz proton pompasının inhibisyonunu tanımlar; bu kaynak çözünürlüğünde ayrı bir hedef/eylem farkı desteklenmez.", "The omeprazole and lansoprazole labels describe inhibition of the gastric H+/K+-ATPase proton pump; no distinct target/action difference is supported at this source resolution."),
            [labelSource, "source:dailymed-lansoprazole-e33ac27f"],
            { note: localized(locale, "İki doğrudan etiketle sınırlı hedef/eylem karşılaştırması; klinik üstünlük veya eşdeğerlik sonucu değildir.", "Target/action comparison bounded to two direct labels; not a clinical superiority or equivalence conclusion.") },
            { evidenceType: "regulatory" },
          ),
          regulatoryContext: null,
          sourceIds: [identitySource, "source:pubchem-3883", labelSource, "source:dailymed-lansoprazole-e33ac27f"],
          reviewStatus: "source-supported",
          limitations: [localized(locale, "Doğrudan etiketler aynı proton-pompası hedef/eylem sınıfını destekler; doz, etkinlik, güvenlilik veya klinik sıralama karşılaştırılmaz.", "Direct labels support the same proton-pump target/action class; dose, efficacy, safety, and clinical ranking are not compared.")],
        },
        {
          id: "comparison:omeprazole:pantoprazole",
          name: "Pantoprazole",
          pubChemCid: 4679,
          sharedScaffold: evidenceField(localized(locale, "Benzimidazol/piridin sülfoxit aile bağlamı", "Benzimidazole/pyridine sulfoxide family context"), "source:pubchem-4679", { note: localized(locale, "İki PubChem kimliği üzerinden sınırlı yapı karşılaştırmasıdır.", "Bounded structure comparison across the two PubChem identities.") }, curatedBacked),
          changedGroups: [evidenceField(localized(locale, "Pantoprazole difluorometoksi-benzimidazol ve 3,4-dimetoksipiridin substitüsyon düzeni taşır; omeprazole 6-metoksi ve 3,5-dimetil/4-metoksi düzenindedir.", "Pantoprazole carries a difluoromethoxy-benzimidazole and 3,4-dimethoxypyridine substitution pattern; omeprazole carries 6-methoxy and 3,5-dimethyl/4-methoxy patterns."), "source:pubchem-4679", { note: localized(locale, "Kaynaklı bağlantı farkı; SAR veya klinik sıralama değildir.", "Sourced connectivity difference; not an SAR or clinical ranking.") }, curatedBacked)],
          propertyDifferences: [comparativeEvidence(
            localized(locale, "PubChem, pantoprazole için C16H15F2N3O4S ve 383.4 g/mol; omeprazole için C17H19N3O3S ve 345.4 g/mol bildirir.", "PubChem records C16H15F2N3O4S and 383.4 g/mol for pantoprazole versus C17H19N3O3S and 345.4 g/mol for omeprazole."),
            [identitySource, "source:pubchem-4679"],
            { note: localized(locale, "Hesaplanmış kimlik tanımlayıcılarının kaynaklı karşılaştırmasıdır; klinik özellik veya üstünlük iddiası değildir.", "Sourced comparison of computed identity descriptors; not a clinical-property or superiority claim.") },
          )],
          targetActionDifference: comparativeEvidence(
            localized(locale, "Omeprazole ve pantoprazole etiketleri gastrik H+/K+-ATPaz proton pompasının inhibisyonunu tanımlar; bu kaynak çözünürlüğünde ayrı bir hedef/eylem farkı desteklenmez.", "The omeprazole and pantoprazole labels describe inhibition of the gastric H+/K+-ATPase proton pump; no distinct target/action difference is supported at this source resolution."),
            [labelSource, "source:dailymed-pantoprazole-3540d01c"],
            { note: localized(locale, "İki doğrudan etiketle sınırlı hedef/eylem karşılaştırması; klinik üstünlük veya eşdeğerlik sonucu değildir.", "Target/action comparison bounded to two direct labels; not a clinical superiority or equivalence conclusion.") },
            { evidenceType: "regulatory" },
          ),
          regulatoryContext: null,
          sourceIds: [identitySource, "source:pubchem-4679", labelSource, "source:dailymed-pantoprazole-3540d01c"],
          reviewStatus: "source-supported",
          limitations: [localized(locale, "Doğrudan etiketler aynı proton-pompası hedef/eylem sınıfını destekler; doz, etkinlik, güvenlilik veya klinik sıralama karşılaştırılmaz.", "Direct labels support the same proton-pump target/action class; dose, efficacy, safety, and clinical ranking are not compared.")],
        },
      ], [identitySource, labelSource, "source:pubchem-9568614", "source:pubchem-3883", "source:pubchem-4679", "source:dailymed-esomeprazole-ea79f802", "source:dailymed-lansoprazole-e33ac27f", "source:dailymed-pantoprazole-3540d01c"]),
      learning: section("source-supported", [
        { id: "learning:omeprazole:structure", kind: "structure", prompt: localized(locale, "Omeprazole stereokimyasının ana sınırı nedir?", "What is the main stereochemical boundary for omeprazole?"), options: [{ id: "sulfoxide-racemate", label: localized(locale, "Stereojenik sülfoxit kükürt ve R/S rasemat", "Stereogenic sulfoxide sulfur and R/S racemate") }, { id: "achiral", label: localized(locale, "Tamamen akiral", "Entirely achiral") }], correctOptionId: "sulfoxide-racemate", explanation: localized(locale, "Tek hesaplanmış 3B konformer rasematın tamamını temsil etmez.", "A single computed 3D conformer does not represent the complete racemate."), sourceIds: [identitySource, "source:chebi-7772"], reviewStatus: "source-supported" },
        { id: "learning:omeprazole:pharmacology", kind: "pharmacology", prompt: localized(locale, "Birincil hedef eşlemesi hangisidir?", "What is the primary target mapping?"), options: [{ id: "atp4a", label: "ATP4A · gastric H+/K+-ATPase" }, { id: "ptgs2", label: "PTGS2" }], correctOptionId: "atp4a", explanation: localized(locale, "Asidik aktivasyon mekanizma zincirinin zorunlu parçasıdır.", "Acid activation is an essential part of the mechanism chain."), sourceIds: ["source:uniprot-p20648", labelSource, "source:pubmed-9593713"], reviewStatus: "source-supported" },
        { id: "learning:omeprazole:nomenclature", kind: "nomenclature", prompt: localized(locale, "Kaynaklar methoxy locantında nasıl ele alınmalıdır?", "How should the methoxy-locant source forms be handled?"), options: [{ id: "preserve-source-form", label: localized(locale, "5-/6-methoxy kaynak biçimlerini atıflarıyla koru", "Keep the 5-/6-methoxy source forms with attribution") }, { id: "silently-merge", label: localized(locale, "Sessizce tek doğru ada birleştir", "Silently merge them into one correct name") }], correctOptionId: "preserve-source-form", explanation: localized(locale, "Aynı bağlantıya ait kaynağa özgü ad biçimleri sessizce yeniden yazılmaz; bu bir yapı çatışması olarak da sunulmaz.", "Source-specific name forms for the same connectivity are not silently rewritten, and are not presented as a structure conflict."), sourceIds: [identitySource, labelSource, "source:chebi-7772"], reviewStatus: "source-supported" },
      ], [identitySource, "source:chebi-7772", "source:uniprot-p20648", labelSource, "source:pubmed-9593713"]),
      explicitMissingFields: [
        localized(locale, "Dağılım hacmi: anchor etikette yok — null.", "Volume of distribution: absent from the anchor label — null."),
        localized(locale, "Aktivasyon ürünü yapıları ve animasyonu: uzman incelemesine kadar hold.", "Activation-product structures and animation: hold until expert review."),
        localized(locale, "Çözümlenmemiş karboksilik metabolit: text-only hold.", "Unresolved carboxylic metabolite: text-only hold."),
      ],
    },
  };
}
