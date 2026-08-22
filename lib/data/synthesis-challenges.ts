import type {
  LocalizedChallengeText,
  SynthesisChallenge,
  SynthesisChallengeFeedback,
} from "../domain";

const text = (tr: string, en: string): LocalizedChallengeText => ({ tr, en });

const feedback = (
  correctTr: string,
  correctEn: string,
  incorrectTr: string,
  incorrectEn: string,
): SynthesisChallengeFeedback => ({
  correct: text(correctTr, correctEn),
  incorrect: text(incorrectTr, incorrectEn),
  invalid: text(
    "Bu yanıt değerlendirilemedi. Challenge verisini ve seçenek kimliklerini yeniden yükle.",
    "This response could not be evaluated. Reload the challenge data and option identifiers.",
  ),
});

/**
 * Six source-aware seed challenges. Counts are curriculum seed data, not a
 * schema ceiling; new stories can provide any number of these challenge kinds.
 */
export const synthesisChallenges = [
  {
    id: "synthesis-challenge:atenolol-order-steps",
    storyId: "synthesis:atenolol-educational-scaffold",
    kind: "order-steps",
    prompt: text(
      "Atenolol rotasının iki kaynaklı dönüşümünü doğru sıraya yerleştir.",
      "Place the two source-anchored atenolol transformations in the correct order.",
    ),
    options: [
      {
        id: "synthesis-option:atenolol-order-epoxide-opening",
        stepId: "synthesis-step:atenolol-02",
        label: text(
          "Epoksiti açarak amino alkolü oluştur",
          "Open the epoxide to reveal the amino alcohol",
        ),
      },
      {
        id: "synthesis-option:atenolol-order-glycidyl-ether",
        stepId: "synthesis-step:atenolol-01",
        label: text(
          "Para-amid glisidil eteri oluştur",
          "Form the para-amide glycidyl ether",
        ),
      },
    ],
    answerIds: [
      "synthesis-option:atenolol-order-glycidyl-ether",
      "synthesis-option:atenolol-order-epoxide-opening",
    ],
    feedback: feedback(
      "Doğru: önce glisidil eter ara ürünü, ardından aminle epoksit açılması gelir.",
      "Correct: the glycidyl-ether intermediate comes before amine opening of the epoxide.",
      "Sıra ters. Kaynağın tanımladığı ara ürünü final amino alkolden önce konumlandır.",
      "The order is reversed. Place the source-named intermediate before the final amino alcohol.",
    ),
  },
  {
    id: "synthesis-challenge:propranolol-choose-reaction-class",
    storyId: "synthesis:propranolol-educational-scaffold",
    kind: "choose-reaction-class",
    stepId: "synthesis-step:propranolol-02",
    prompt: text(
      "Propranolol bağ değişimini en doğru tanımlayan reaksiyon sınıfı hangisidir?",
      "Which reaction class best describes the propranolol bond change?",
    ),
    options: [
      {
        id: "synthesis-option:propranolol-class-epoxide-opening",
        reactionClass: "amine nucleophilic epoxide opening",
        label: text(
          "Aminle nükleofilik epoksit açılması",
          "Amine nucleophilic epoxide opening",
        ),
      },
      {
        id: "synthesis-option:propranolol-class-amide-formation",
        reactionClass: "amide formation",
        label: text("Amid oluşumu", "Amide formation"),
      },
      {
        id: "synthesis-option:propranolol-class-ester-hydrolysis",
        reactionClass: "ester hydrolysis",
        label: text("Ester hidrolizi", "Ester hydrolysis"),
      },
    ],
    answerIds: ["synthesis-option:propranolol-class-epoxide-opening"],
    feedback: feedback(
      "Doğru: amin azotu epoksit yan zincirine bağlanırken halka açılır.",
      "Correct: the amine nitrogen bonds to the epoxide side chain as the ring opens.",
      "Bu adım amid veya ester dönüşümü değildir; oluşan C–N bağını ve açılan epoksit halkasını izle.",
      "This is not an amide or ester transformation; follow the formed C–N bond and opened epoxide ring.",
    ),
  },
  {
    id: "synthesis-challenge:carvedilol-identify-formed-bond",
    storyId: "synthesis:carvedilol-educational-scaffold",
    kind: "identify-formed-bond",
    stepId: "synthesis-step:carvedilol-02",
    prompt: text(
      "Carvedilol parçalarını birleştiren yeni bağ hangi iki eşlenmiş atom arasındadır?",
      "Which mapped atom pair forms the new bond that joins the carvedilol fragments?",
    ),
    options: [
      {
        id: "synthesis-option:carvedilol-bond-carbon-nitrogen",
        stepId: "synthesis-step:carvedilol-02",
        atomMapIds: [
          "map:carvedilol:terminal-epoxide-carbon",
          "map:carvedilol:amine-nitrogen",
        ],
        label: text(
          "Terminal epoksit karbonu — amin azotu",
          "Terminal epoxide carbon — amine nitrogen",
        ),
      },
      {
        id: "synthesis-option:carvedilol-bond-carbon-oxygen",
        stepId: "synthesis-step:carvedilol-02",
        atomMapIds: [
          "map:carvedilol:terminal-epoxide-carbon",
          "map:carvedilol:epoxide-oxygen",
        ],
        label: text(
          "Terminal epoksit karbonu — epoksit oksijeni",
          "Terminal epoxide carbon — epoxide oxygen",
        ),
      },
      {
        id: "synthesis-option:carvedilol-bond-oxygen-nitrogen",
        stepId: "synthesis-step:carvedilol-02",
        atomMapIds: [
          "map:carvedilol:epoxide-oxygen",
          "map:carvedilol:amine-nitrogen",
        ],
        label: text(
          "Epoksit oksijeni — amin azotu",
          "Epoxide oxygen — amine nitrogen",
        ),
      },
    ],
    answerIds: ["synthesis-option:carvedilol-bond-carbon-nitrogen"],
    feedback: feedback(
      "Doğru: iki büyük parça terminal epoksit karbonu ile amin azotu arasındaki yeni C–N bağıyla birleşir.",
      "Correct: the two large fragments join through the new C–N bond between the terminal epoxide carbon and amine nitrogen.",
      "Açılan C–O bağını oluşan bağla karıştırma; yeni bağ terminal karbon ile azot arasındadır.",
      "Do not confuse the opened C–O bond with the formed bond; the new bond is between terminal carbon and nitrogen.",
    ),
  },
  {
    id: "synthesis-challenge:atenolol-choose-precursor",
    storyId: "synthesis:atenolol-educational-scaffold",
    kind: "choose-precursor",
    stepId: "synthesis-step:atenolol-02",
    prompt: text(
      "Atenolol rotasının ikinci dönüşümüne doğrudan giren kaynaklı ara ürün hangisidir?",
      "Which source-anchored intermediate directly enters the second atenolol transformation?",
    ),
    options: [
      {
        id: "synthesis-option:atenolol-precursor-glycidyl-ether",
        materialId: "material:atenolol:glycidyl-ether",
        label: text(
          "Para-amid glisidil eter",
          "Para-amide glycidyl ether",
        ),
      },
      {
        id: "synthesis-option:atenolol-precursor-hydroxyphenylacetamide",
        materialId: "material:atenolol:hydroxyphenylacetamide",
        label: text("4-hidroksifenilasetamid", "4-hydroxyphenylacetamide"),
      },
      {
        id: "synthesis-option:atenolol-precursor-parent",
        materialId: "material:atenolol:parent",
        label: text("Atenolol ana yapısı", "Atenolol parent connectivity"),
      },
    ],
    answerIds: ["synthesis-option:atenolol-precursor-glycidyl-ether"],
    feedback: feedback(
      "Doğru: ikinci adım, kaynakta adı verilen glisidil eter ara ürünü ile başlar.",
      "Correct: the second step begins with the source-named glycidyl-ether intermediate.",
      "Birinci adımın başlangıç maddesini veya final ürünü seçtin; ikinci adımın doğrudan girdisini izle.",
      "You selected the first step's starting material or the final product; follow the direct input to step two.",
    ),
  },
  {
    id: "synthesis-challenge:atenolol-find-wrong-intermediate",
    storyId: "synthesis:atenolol-educational-scaffold",
    kind: "find-wrong-intermediate",
    prompt: text(
      "Hangi kart bu rotada ‘ara ürün’ olarak etiketlenirse yanlış olur?",
      "Which card would be wrong if labelled as an intermediate in this route?",
    ),
    options: [
      {
        id: "synthesis-option:atenolol-role-glycidyl-as-intermediate",
        materialId: "material:atenolol:glycidyl-ether",
        assertedRole: "intermediate",
        label: text(
          "Para-amid glisidil eter — ara ürün",
          "Para-amide glycidyl ether — intermediate",
        ),
      },
      {
        id: "synthesis-option:atenolol-role-epichlorohydrin-as-intermediate",
        materialId: "material:atenolol:epichlorohydrin",
        assertedRole: "intermediate",
        label: text(
          "Epiklorohidrin — ara ürün",
          "Epichlorohydrin — intermediate",
        ),
      },
    ],
    answerIds: [
      "synthesis-option:atenolol-role-epichlorohydrin-as-intermediate",
    ],
    feedback: feedback(
      "Doğru: epiklorohidrin bu story’de başlangıç materyalidir; kaynaklı ara ürün glisidil eterdir.",
      "Correct: epichlorohydrin is a starting material in this story; the source-anchored intermediate is the glycidyl ether.",
      "Rol etiketlerini tekrar kontrol et: glisidil eter ara ürün, epiklorohidrin başlangıç materyalidir.",
      "Check the role labels again: the glycidyl ether is the intermediate, while epichlorohydrin is a starting material.",
    ),
  },
  {
    id: "synthesis-challenge:propranolol-distinguish-reported-vs-ai",
    storyId: "synthesis:propranolol-educational-scaffold",
    kind: "distinguish-reported-vs-ai",
    prompt: text(
      "Hangi seçenek kaynakta raporlanmış rota olarak sunulabilir?",
      "Which option may be presented as a source-reported route?",
    ),
    options: [
      {
        id: "synthesis-option:route-propranolol-patent-reported",
        candidate: {
          kind: "catalog-story",
          storyId: "synthesis:propranolol-educational-scaffold",
        },
        label: text(
          "USPTO patent örneğine bağlı propranolol rotası",
          "Propranolol route anchored to a USPTO patent example",
        ),
      },
      {
        id: "synthesis-option:route-propranolol-ai-uncited",
        candidate: {
          kind: "route-descriptor",
          routeType: "ai-proposed",
          verificationStatus: "predicted",
          hasDirectPrimarySource: false,
          operationalDetailsIncluded: false,
        },
        label: text(
          "Doğrudan kaynağı olmayan AI önerisi",
          "AI proposal without a direct primary source",
        ),
      },
      {
        id: "synthesis-option:route-propranolol-educational-draft",
        candidate: {
          kind: "route-descriptor",
          routeType: "educational-simplification",
          verificationStatus: "pending-review",
          hasDirectPrimarySource: false,
          operationalDetailsIncluded: false,
        },
        label: text(
          "İnceleme bekleyen eğitim taslağı",
          "Educational draft pending review",
        ),
      },
    ],
    answerIds: ["synthesis-option:route-propranolol-patent-reported"],
    feedback: feedback(
      "Doğru: yalnız doğrudan kaynaklı, uygun route type ve source-supported doğrulamalı kayıt bu etiketi taşıyabilir.",
      "Correct: only the directly sourced record with an eligible route type and source-supported verification may carry that label.",
      "AI-proposed veya pending-review içerik kaynakta raporlanmış rota değildir; doğrudan kaynak ve doğrulama durumunu birlikte kontrol et.",
      "AI-proposed or pending-review content is not a source-reported route; check the direct source and verification status together.",
    ),
  },
] satisfies readonly SynthesisChallenge[];

export const synthesisChallengeById = new Map(
  synthesisChallenges.map((challenge) => [challenge.id, challenge] as const),
);
