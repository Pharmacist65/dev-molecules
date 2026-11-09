import type {
  SynthesisAtlasChallenge,
  SynthesisAtlasLocalizedText,
} from "../domain/synthesis-atlas";

const text = (tr: string, en: string): SynthesisAtlasLocalizedText => ({ tr, en });

const feedback = (
  correct: SynthesisAtlasLocalizedText,
  incorrect: SynthesisAtlasLocalizedText,
): SynthesisAtlasChallenge["feedback"] => ({
  correct,
  incorrect,
  invalid: text(
    "Bu görev güvenli biçimde değerlendirilemedi; seçenekleri yeniden yükle.",
    "This challenge could not be evaluated safely; reload the options.",
  ),
});

export const synthesisAtlasChallenges = [
  {
    id: "synthesis-atlas-challenge:atenolol-reaction-class",
    routeId: "synthesis-atlas-route:atenolol-reported",
    kind: "reaction-class",
    prompt: text(
      "Klorohidrinden glisidil amin epokside geçen üçüncü dönüşüm hangi sınıftadır?",
      "Which class describes the third transformation from the chlorohydrin to the glycidyl-amine epoxide?",
    ),
    options: [
      { id: "atlas-option:atenolol-amide", label: text("Amid oluşumu", "Amide formation") },
      { id: "atlas-option:atenolol-ring-close", label: text("Bazla intramoleküler halkalaşma", "Base-assisted intramolecular cyclisation") },
      { id: "atlas-option:atenolol-hydrogenation", label: text("Katalitik hidrojenasyon", "Catalytic hydrogenation") },
    ],
    optionIds: ["atlas-option:atenolol-amide", "atlas-option:atenolol-ring-close", "atlas-option:atenolol-hydrogenation"],
    correctOptionIds: ["atlas-option:atenolol-ring-close"],
    feedback: feedback(
      text("Doğru: alkoksit komşu C–Cl merkezine bağlanır ve epoksit halkası kapanır.", "Correct: the alkoxide bonds to the adjacent C–Cl centre and closes the epoxide ring."),
      text("C–O halka bağının oluşumunu ve C–Cl bağının kaybolmasını birlikte izle.", "Track formation of the C–O ring bond together with loss of the C–Cl bond."),
    ),
  },
  {
    id: "synthesis-atlas-challenge:carvedilol-order",
    routeId: "synthesis-atlas-route:carvedilol-reported",
    kind: "order-steps",
    prompt: text(
      "Carvedilol rotasının altı dönüşümünü kaynak sırasına yerleştir.",
      "Place the six carvedilol transformations in source order.",
    ),
    options: [
      { id: "atlas-option:carvedilol-04", label: text("Karbazol glisidil eterini oluştur", "Form the carbazole glycidyl ether") },
      { id: "atlas-option:carvedilol-01", label: text("Monofenilhidrazonu oluştur", "Form the monophenylhydrazone") },
      { id: "atlas-option:carvedilol-06", label: text("N-debenzilasyonla carvedilolü açığa çıkar", "Reveal carvedilol by N-debenzylation") },
      { id: "atlas-option:carvedilol-03", label: text("4-hidroksikarbazole aromatize et", "Aromatise to 4-hydroxycarbazole") },
      { id: "atlas-option:carvedilol-02", label: text("Fischer halkalaşmasıyla karbazol çekirdeğini kur", "Build the carbazole core by Fischer cyclisation") },
      { id: "atlas-option:carvedilol-05", label: text("Korumalı aminle epoksidi aç", "Open the epoxide with the protected amine") },
    ],
    optionIds: ["atlas-option:carvedilol-04", "atlas-option:carvedilol-01", "atlas-option:carvedilol-06", "atlas-option:carvedilol-03", "atlas-option:carvedilol-02", "atlas-option:carvedilol-05"],
    correctOptionIds: ["atlas-option:carvedilol-01", "atlas-option:carvedilol-02", "atlas-option:carvedilol-03", "atlas-option:carvedilol-04", "atlas-option:carvedilol-05", "atlas-option:carvedilol-06"],
    feedback: feedback(
      text("Doğru: hidrazondan karbazol çekirdeğine, glisidil etere, birleşmeye ve son deproteksiyona ilerledin.", "Correct: you moved from the hydrazone through the carbazole core and glycidyl ether to coupling and final deprotection."),
      text("İlk üç dönüşüm karbazol çekirdeğini kurar; O-alkilasyon, birleşme ve deproteksiyon daha sonra gelir.", "The first three transformations build the carbazole core; O-alkylation, coupling and deprotection follow."),
    ),
  },
  {
    id: "synthesis-atlas-challenge:carvedilol-missing-intermediate",
    routeId: "synthesis-atlas-route:carvedilol-reported",
    kind: "missing-intermediate",
    prompt: text(
      "Tetrahidrokarbazolon ile karbazol epoksit arasındaki eksik ara ürün hangisidir?",
      "Which intermediate is missing between tetrahydrocarbazolone and the carbazole epoxide?",
    ),
    options: [
      { id: "atlas-option:carvedilol-hydroxycarbazole", label: text("4-Hidroksikarbazol", "4-Hydroxycarbazole") },
      { id: "atlas-option:carvedilol-propranolol", label: text("Propranolol", "Propranolol") },
      { id: "atlas-option:carvedilol-glycidyl-amine", label: text("N-Benzil glisidil amin", "N-Benzyl glycidyl amine") },
    ],
    optionIds: ["atlas-option:carvedilol-hydroxycarbazole", "atlas-option:carvedilol-propranolol", "atlas-option:carvedilol-glycidyl-amine"],
    correctOptionIds: ["atlas-option:carvedilol-hydroxycarbazole"],
    feedback: feedback(
      text("Doğru: tetrahidrokarbazolon önce aromatik 4-hidroksikarbazole dönüşür; sonra glisidil eter kurulur.", "Correct: tetrahydrocarbazolone first becomes aromatic 4-hydroxycarbazole, then the glycidyl ether is installed."),
      text("Karbazol çekirdeğinin aromatizasyon ürününü seç; başka bir ilacı veya farklı rota kolunu değil.", "Choose the aromatisation product of the carbazole core, not another drug or a different route branch."),
    ),
  },
  {
    id: "synthesis-atlas-challenge:propranolol-mechanism",
    routeId: "synthesis-atlas-route:propranolol-foundational",
    kind: "mechanism-choice",
    prompt: text(
      "İzopropilamin glisidil eteri açarken ilk bağ kuran elektron çifti hangi merkezden gelir?",
      "When isopropylamine opens the glycidyl ether, which centre supplies the first bond-forming electron pair?",
    ),
    options: [
      { id: "atlas-option:propranolol-amine-lone-pair", label: text("İzopropilamin azotunun elektron çifti", "The isopropylamine nitrogen lone pair") },
      { id: "atlas-option:propranolol-amide", label: text("Bulunmayan bir amid oksijeni", "A nonexistent amide oxygen") },
      { id: "atlas-option:propranolol-aromatic", label: text("Naftalen π bağı", "A naphthalene π bond") },
    ],
    optionIds: ["atlas-option:propranolol-amine-lone-pair", "atlas-option:propranolol-amide", "atlas-option:propranolol-aromatic"],
    correctOptionIds: ["atlas-option:propranolol-amine-lone-pair"],
    feedback: feedback(
      text("Doğru: amin azotunun elektron çifti terminal epoksit karbonuna yönelir.", "Correct: the amine nitrogen lone pair is directed to the terminal epoxide carbon."),
      text("Yeni C–N bağının iki ucunu izle: nükleofil amin azotu, elektrofil terminal epoksit karbonudur.", "Follow the two ends of the new C–N bond: the nucleophile is the amine nitrogen and the electrophile is the terminal epoxide carbon."),
    ),
  },
] as const satisfies readonly SynthesisAtlasChallenge[];

export const synthesisAtlasChallengesByRouteId = new Map(
  [...new Set(synthesisAtlasChallenges.map((challenge) => challenge.routeId))].map(
    (routeId) => [
      routeId,
      synthesisAtlasChallenges.filter((challenge) => challenge.routeId === routeId),
    ] as const,
  ),
);
