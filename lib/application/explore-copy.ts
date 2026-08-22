import type { Locale } from "@/lib/i18n";

interface LocalizedExploreRecordCopy {
  readonly summary: string;
}

const summaries: Readonly<Record<string, LocalizedExploreRecordCopy>> = {
  "molecule:propranolol": { summary: "Nonselektif beta-adrenoseptör antagonisti iskeleti için eğitim örneği." },
  "molecule:metoprolol": { summary: "Beta1-selektif ariloksipropanolamin grubu için eğitim örneği." },
  "molecule:atenolol": { summary: "Beta1-selektif beta blokerlerde polar para-sübstitüsyon için karşılaştırma örneği." },
  "molecule:bisoprolol": { summary: "Uzatılmış, eterce zengin para sübstitüent taşıyan beta1-selektif karşılaştırma örneği." },
  "molecule:carvedilol": { summary: "Karma alfa1/beta profilini yalnız beta profillerinden ayıran eğitim örneği." },
  "molecule:labetalol": { summary: "Klasik ariloksipropanolamin çekirdeğini taşımayan karma alfa1/beta karşılaştırması." },
  "molecule:timolol": { summary: "Heterosiklik iskeletli nonselektif beta bloker eğitim örneği." },
  "molecule:nadolol": { summary: "Polihidroksillenmiş kaynaşık halka bölgesi taşıyan nonselektif karşılaştırma örneği." },
  "molecule:nebivolol": { summary: "Vazodilatörlük öğretim iddiası inceleme kapısında tutulan beta1-selektif karşılaştırma örneği." },
  "molecule:acebutolol": { summary: "Amid ve keton fonksiyonları taşıyan beta1-selektif karşılaştırma örneği." },
  "molecule:aspirin": { summary: "Kompakt, salisilattan türetilmiş antiinflamatuvar yapı için eğitim karşılaştırması." },
  "molecule:ibuprofen": { summary: "Rasemik kimlik sınırı taşıyan arilpropiyonik asit karşılaştırma örneği." },
  "molecule:naproxen": { summary: "Kaynaşık aromatik sistem taşıyan tek stereoizomerli arilpropiyonik asit karşılaştırması." },
  "molecule:diclofenac": { summary: "İskelet gruplamasını mekanizma gruplamasından ayıran klorlu diarilamin karşılaştırması." },
  "molecule:celecoxib": { summary: "Hedef profilini yapısal aileden ayırmak için heteroaromatik sülfonamid karşılaştırması." },
};

const classificationValues: Readonly<Record<string, string>> = {
  Cardiovascular: "Kardiyovasküler",
  "Pain & inflammation": "Ağrı ve inflamasyon",
  "Beta-adrenergic blocker": "Beta-adrenerjik bloker",
  "Nonsteroidal anti-inflammatory": "Nonsteroid antiinflamatuvar",
  "Nonselective beta profile": "Nonselektif beta profili",
  "Beta1-selective profile": "Beta1-selektif profil",
  "Mixed alpha1/beta profile": "Karma alfa1/beta profili",
  "Beta1-selective, vasodilatory profile": "Beta1-selektif, vazodilatör profil",
  "Irreversible cyclooxygenase modifier": "İrreversibl siklooksijenaz modifiye edici",
  "Nonselective cyclooxygenase profile": "Nonselektif siklooksijenaz profili",
  "COX-2-selective profile": "COX-2-selektif profil",
  "aryloxypropanolamine / naphthoxypropanolamine": "ariloksipropanolamin / naftoksipropanolamin",
  "para-substituted aryloxypropanolamine": "para-sübstitüe ariloksipropanolamin",
  "para-acetamide aryloxypropanolamine": "para-asetamid ariloksipropanolamin",
  "carbazole-containing aryloxypropanolamine": "karbazol içeren ariloksipropanolamin",
  "salicylamide amino alcohol": "salisilamid amino alkol",
  "thiadiazole oxypropanolamine": "tiyadiazol oksipropanolamin",
  "polyhydroxylated aryloxypropanolamine": "polihidroksillenmiş ariloksipropanolamin",
  "bis-fluorochroman amino diol": "bis-florokroman amino diol",
  "acetamide-substituted aryloxypropanolamine": "asetamid-sübstitüe ariloksipropanolamin",
  "Salicylate acetate ester": "Salisilat asetat esteri",
  "Arylpropionic acid": "Arilpropiyonik asit",
  "Naphthalene propionic acid": "Naftalen propiyonik asit",
  "Diarylamine acetic acid": "Diarilamin asetik asit",
  "Diaryl pyrazole sulfonamide": "Diaril pirazol sülfonamid",
  Unclassified: "Sınıflandırılmamış",
};

export function localizeExploreClassification(value: string, locale: Locale): string {
  return locale === "tr" ? (classificationValues[value] ?? value) : value;
}

export function localizeExploreSummary(
  moleculeId: string,
  sourceSummary: string,
  locale: Locale,
): string {
  if (locale === "en") return sourceSummary;
  return summaries[moleculeId]?.summary ?? sourceSummary;
}
