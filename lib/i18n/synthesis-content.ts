import type { Locale } from "./locale";

const sharedSafetyNote =
  "This educational story omits quantities, apparatus, conditions, work-up and operational laboratory instructions. It is a structural reading of a cited source, not a synthesis protocol.";

const enSynthesisContent = {
  "synthesis:propranolol-educational-scaffold": {
    title: "Propranolol: source-reported epoxide opening",
    summary:
      "A source-anchored reading of the bond changes that connect a naphthoxy epoxide and isopropylamine to propranolol connectivity.",
    routeExplanation:
      "The cited example starts at a preformed naphthoxy epoxide. The teaching layer follows retention of the naphthoxy ether, formation of the carbon–nitrogen bond and opening of the three-membered oxygen-containing ring. It does not extend the source backward into an uncited preparation of that epoxide.",
    sourceAnchors: {
      "source:patent-us3337628a": {
        locator:
          "Example 4: naphthoxy epoxide/isopropylamine paragraph and the immediately following named-product paragraph.",
        supportScope:
          "Supports the reported input pair and the propranolol free-base connectivity; no operational conditions are carried into the teaching story.",
      },
    },
    materials: {
      "material:propranolol:naphthoxy-epoxide": "1,2-epoxy-3-(1-naphthoxy)propane",
      "material:propranolol:isopropylamine": "isopropylamine",
      "material:propranolol:free-base": "propranolol (free-base connectivity)",
    },
    reactionClasses: [
      "amine nucleophilic epoxide opening",
      "amino-alcohol formation",
    ],
    stereochemistryTeachingScope:
      "The cited example does not assign an absolute configuration; this story therefore makes no enantiomer-specific route claim.",
    limitations: [
      "The cited example begins with a preformed epoxide, so its upstream preparation is outside this story.",
      "The atom correspondence is a draft teaching annotation, not a published atom map.",
      "Connectivity does not establish pharmaceutical form, purity, scale or clinical performance.",
    ],
    reviewScope:
      "Primary-source identity and locator audited; named synthetic-chemistry review of atom mapping remains required.",
    verificationNote:
      "The route boundary and named product are supported by US 3,337,628 A, Example 4; expert review of the educational mapping is pending.",
    safetyNote: sharedSafetyNote,
    steps: {
      "synthesis-step:propranolol-01": {
        title: "Set the evidence boundary",
        inputLabels: ["preformed naphthoxy epoxide", "isopropylamine"],
        outputLabel: "source-anchored input pair",
        transformationFamily: "source orientation",
        changeSummary:
          "No covalent change is claimed in this frame: the cited example begins with the epoxide already present.",
        learningRationale:
          "A literature story should begin where its cited evidence begins instead of inventing an uncited upstream step.",
        commonMisconception:
          "A familiar precursor does not make its preparation part of the cited route.",
        atomMappingNote: "Orientation frame only; mapping starts in the bond-change step.",
        atoms: {},
        bondChanges: {},
        verificationNote:
          "The starting pair is named in US 3,337,628 A, Example 4.",
      },
      "synthesis-step:propranolol-02": {
        title: "Open the epoxide with the amine fragment",
        inputLabels: ["1,2-epoxy-3-(1-naphthoxy)propane", "isopropylamine"],
        outputLabel: "propranolol free-base connectivity",
        transformationFamily: "amine nucleophilic epoxide opening",
        changeSummary:
          "A carbon–nitrogen bond is formed at the epoxide side chain while one ring carbon–oxygen bond is opened, retaining the oxygen as the alcohol oxygen.",
        learningRationale:
          "Follow the three atoms that explain the amino-alcohol motif: the attacked carbon, epoxide oxygen and amine nitrogen.",
        commonMisconception:
          "A correct connectivity map does not assign an enantiomer or reproduce the experimental procedure.",
        atomMappingNote:
          "Named-atom correspondence inferred for teaching and pending expert review; the patent does not publish an atom map.",
        atoms: {
          "map:propranolol:terminal-carbon": {
            input: "terminal epoxide carbon",
            product: "amine-bearing side-chain carbon",
          },
          "map:propranolol:epoxide-oxygen": {
            input: "epoxide oxygen",
            product: "alcohol oxygen",
          },
          "map:propranolol:amine-nitrogen": {
            input: "amine nitrogen",
            product: "secondary-amine nitrogen",
          },
        },
        bondChanges: {
          formed: "New side-chain carbon–nitrogen bond.",
          broken: "Epoxide ring carbon–oxygen bond opened.",
        },
        verificationNote:
          "The input pair and named propranolol product are reported in US 3,337,628 A, Example 4; the teaching atom map remains draft.",
      },
    },
  },
  "synthesis:atenolol-educational-scaffold": {
    title: "Atenolol: para-amide glycidyl ether route",
    summary:
      "A two-transformation story linking the para-amide phenolic precursor to a glycidyl ether, then to atenolol connectivity.",
    routeExplanation:
      "The cited example identifies both the glycidyl-ether precursor preparation and its conversion with isopropylamine. The teaching view tracks the retained para-amide aromatic region and the two bond changes that reveal the amino-alcohol side chain.",
    sourceAnchors: {
      "source:patent-us3663607a": {
        locator:
          "Example 1: named-product paragraph plus the immediately following paragraph beginning the preparation of the epoxypropane starting material.",
        supportScope:
          "Supports the named precursor, glycidyl-ether intermediate, isopropylamine input and atenolol connectivity; no procedure is reproduced.",
      },
    },
    materials: {
      "material:atenolol:hydroxyphenylacetamide": "4-hydroxyphenylacetamide",
      "material:atenolol:epichlorohydrin": "epichlorohydrin",
      "material:atenolol:isopropylamine": "isopropylamine",
      "material:atenolol:glycidyl-ether": "1-p-carbamoylmethylphenoxy-2,3-epoxypropane",
      "material:atenolol:parent": "atenolol (parent connectivity)",
    },
    reactionClasses: [
      "phenolic O-alkylation / glycidyl-ether formation",
      "amine nucleophilic epoxide opening",
      "amino-alcohol formation",
    ],
    stereochemistryTeachingScope:
      "Example 1 does not assign an absolute configuration; the route is taught as connectivity without an enantiomer-specific claim.",
    limitations: [
      "The story paraphrases only transformations and omits all experimental execution details.",
      "The named-atom correspondence is an editorial teaching map pending synthetic-chemistry review.",
      "The route does not establish a marketed pharmaceutical form or comparative performance.",
    ],
    reviewScope:
      "Patent locator and compound identities audited; transformation wording and atom mapping await named expert review.",
    verificationNote:
      "The two route transformations are anchored to US 3,663,607 A, Example 1 and its precursor paragraph; expert review is pending.",
    safetyNote: sharedSafetyNote,
    steps: {
      "synthesis-step:atenolol-01": {
        title: "Form the para-amide glycidyl ether",
        inputLabels: ["4-hydroxyphenylacetamide", "epichlorohydrin"],
        outputLabel: "para-amide glycidyl ether intermediate",
        transformationFamily: "phenolic O-alkylation",
        changeSummary:
          "The phenolic oxygen becomes bonded to the glycidyl methylene while the para-amide side chain remains unchanged.",
        learningRationale:
          "Separate the aromatic substitution pattern from the later amino-alcohol-forming event.",
        commonMisconception:
          "The amide group is a retained substituent here; it is not formed during this mapped transformation.",
        atomMappingNote:
          "Named-atom correspondence inferred from source structures for teaching; the patent does not publish an atom map.",
        atoms: {
          "map:atenolol:phenolic-oxygen": {
            input: "phenolic oxygen",
            product: "aryl-ether oxygen",
          },
          "map:atenolol:glycidyl-methylene": {
            input: "chloromethyl carbon",
            product: "aryl-ether-linked methylene carbon",
          },
          "map:atenolol:chlorine": {
            input: "chlorine",
            product: "not retained in the mapped intermediate",
          },
        },
        bondChanges: {
          formed: "New aryl-oxygen–glycidyl-methylene bond.",
          broken: "The carbon–chlorine bond is absent from the mapped intermediate.",
        },
        verificationNote:
          "The precursor paragraph following US 3,663,607 A, Example 1 names the inputs and glycidyl-ether intermediate; atom mapping remains draft.",
      },
      "synthesis-step:atenolol-02": {
        title: "Open the epoxide to reveal the amino alcohol",
        inputLabels: ["para-amide glycidyl ether", "isopropylamine"],
        outputLabel: "atenolol parent connectivity",
        transformationFamily: "amine nucleophilic epoxide opening",
        changeSummary:
          "A carbon–nitrogen bond is formed at the glycidyl side chain and one epoxide carbon–oxygen bond is opened, retaining the oxygen as the alcohol oxygen.",
        learningRationale:
          "Track how the same amino-alcohol motif can be installed while a different aromatic substituent is retained.",
        commonMisconception:
          "A shared reaction class does not imply identical selectivity, disposition or clinical use across molecules.",
        atomMappingNote:
          "Named-atom correspondence inferred for teaching and pending expert review.",
        atoms: {
          "map:atenolol:terminal-epoxide-carbon": {
            input: "terminal epoxide carbon",
            product: "amine-bearing side-chain carbon",
          },
          "map:atenolol:epoxide-oxygen": {
            input: "epoxide oxygen",
            product: "alcohol oxygen",
          },
          "map:atenolol:amine-nitrogen": {
            input: "amine nitrogen",
            product: "secondary-amine nitrogen",
          },
        },
        bondChanges: {
          formed: "New side-chain carbon–nitrogen bond.",
          broken: "Epoxide ring carbon–oxygen bond opened.",
        },
        verificationNote:
          "US 3,663,607 A, Example 1 reports the glycidyl ether, isopropylamine and named atenolol connectivity; atom mapping remains draft.",
      },
    },
  },
  "synthesis:carvedilol-educational-scaffold": {
    title: "Carvedilol: carbazole epoxide convergence",
    summary:
      "A source-anchored convergence of a carbazole-bearing epoxide and a methoxyphenoxyethyl amine fragment into carvedilol connectivity.",
    routeExplanation:
      "The cited example begins with two preformed fragments. The teaching layer makes that boundary explicit, then tracks the carbon–nitrogen bond formation and epoxide-ring opening that join the carbazole and methoxyphenoxy regions through the amino-alcohol linker.",
    sourceAnchors: {
      "source:patent-us4503067a": {
        locator:
          "Example 2, titled for the methoxyphenoxyethylamino product: starting-material paragraph and named-product paragraph.",
        supportScope:
          "Supports the two reported fragments and carvedilol parent connectivity; it does not support an upstream route for either fragment in this story.",
      },
    },
    materials: {
      "material:carvedilol:carbazole-epoxide": "4-(2,3-epoxypropoxy)-9H-carbazole",
      "material:carvedilol:aminoethyl-aryl-ether": "2-(2-methoxyphenoxy)ethylamine",
      "material:carvedilol:parent": "carvedilol (parent connectivity)",
    },
    reactionClasses: [
      "convergent fragment coupling",
      "amine nucleophilic epoxide opening",
      "amino-alcohol formation",
    ],
    stereochemistryTeachingScope:
      "Example 2 does not assign an absolute configuration; the story presents parent connectivity without attributing a single enantiomer.",
    limitations: [
      "The cited example starts from two preformed fragments; their upstream preparations are outside this story.",
      "The atom map is an editorial teaching annotation and is not published in the patent.",
      "No conclusion about phosphate forms, impurity control, scale or clinical activity follows from this route view.",
    ],
    reviewScope:
      "Patent locator and fragment identities audited; atom mapping and pedagogical wording await named expert review.",
    verificationNote:
      "The fragment pair and named product are anchored to US 4,503,067 A, Example 2; expert review of the teaching map is pending.",
    safetyNote: sharedSafetyNote,
    steps: {
      "synthesis-step:carvedilol-01": {
        title: "Set the convergent-fragment boundary",
        inputLabels: ["carbazole-bearing epoxide", "methoxyphenoxyethyl amine"],
        outputLabel: "source-anchored fragment pair",
        transformationFamily: "source orientation",
        changeSummary:
          "No covalent change is claimed in this frame: the cited example begins with both complex fragments already prepared.",
        learningRationale:
          "Recognize the two retained molecular regions before following the single linkage event that joins them.",
        commonMisconception:
          "Showing two named fragments does not establish how either fragment was prepared.",
        atomMappingNote: "Orientation frame only; mapping starts in the bond-change step.",
        atoms: {},
        bondChanges: {},
        verificationNote:
          "The two starting fragments are named in US 4,503,067 A, Example 2.",
      },
      "synthesis-step:carvedilol-02": {
        title: "Join the fragments through epoxide opening",
        inputLabels: [
          "4-(2,3-epoxypropoxy)-9H-carbazole",
          "2-(2-methoxyphenoxy)ethylamine",
        ],
        outputLabel: "carvedilol parent connectivity",
        transformationFamily: "amine nucleophilic epoxide opening",
        changeSummary:
          "A carbon–nitrogen bond joins the amine-bearing aryl ether to the carbazole side chain while one epoxide carbon–oxygen bond is opened.",
        learningRationale:
          "Track a convergent coupling without losing sight of which large fragments are retained unchanged.",
        commonMisconception:
          "A parent-structure match does not identify a salt, polymorph, enantiomer or manufacturing route.",
        atomMappingNote:
          "Named-atom correspondence inferred for teaching and pending expert review.",
        atoms: {
          "map:carvedilol:terminal-epoxide-carbon": {
            input: "terminal epoxide carbon",
            product: "amine-bearing linker carbon",
          },
          "map:carvedilol:epoxide-oxygen": {
            input: "epoxide oxygen",
            product: "alcohol oxygen",
          },
          "map:carvedilol:amine-nitrogen": {
            input: "primary-amine nitrogen",
            product: "secondary-amine nitrogen",
          },
        },
        bondChanges: {
          formed: "New linker carbon–nitrogen bond joins the two fragments.",
          broken: "Epoxide ring carbon–oxygen bond opened.",
        },
        verificationNote:
          "US 4,503,067 A, Example 2 reports the named starting fragments and product connectivity; atom mapping remains draft.",
      },
    },
  },
} as const;

type LocalizedShape<Value> =
  Value extends string
    ? string
    : Value extends readonly unknown[]
      ? { readonly [Index in keyof Value]: LocalizedShape<Value[Index]> }
      : Value extends Readonly<Record<string, unknown>>
        ? { readonly [Key in keyof Value]: LocalizedShape<Value[Key]> }
        : Value;

export type SynthesisStoryContentId = keyof typeof enSynthesisContent;

export interface SynthesisAtomContent {
  readonly input: string;
  readonly product: string;
}

export interface SynthesisStepContent {
  readonly title: string;
  readonly inputLabels: readonly string[];
  readonly outputLabel: string;
  readonly transformationFamily: string;
  readonly changeSummary: string;
  readonly learningRationale: string;
  readonly commonMisconception: string;
  readonly atomMappingNote: string;
  readonly atoms: Readonly<Record<string, SynthesisAtomContent>>;
  readonly bondChanges: Readonly<Partial<Record<"formed" | "broken", string>>>;
  readonly verificationNote: string;
}

export interface SynthesisStoryContent {
  readonly title: string;
  readonly summary: string;
  readonly routeExplanation: string;
  readonly sourceAnchors: Readonly<
    Record<string, { readonly locator: string; readonly supportScope: string }>
  >;
  readonly materials: Readonly<Record<string, string>>;
  readonly reactionClasses: readonly string[];
  readonly stereochemistryTeachingScope: string;
  readonly limitations: readonly string[];
  readonly reviewScope: string;
  readonly verificationNote: string;
  readonly safetyNote: string;
  readonly steps: Readonly<Record<string, SynthesisStepContent>>;
}

const trSynthesisContent = {
  "synthesis:propranolol-educational-scaffold": {
    title: "Propranolol: kaynakta bildirilen epoksit açılması",
    summary:
      "Naftoksi epoksit ile izopropilamini propranolol bağlantısına ulaştıran bağ değişimlerinin kaynak bağlantılı okuması.",
    routeExplanation:
      "Atıf yapılan örnek, önceden hazırlanmış bir naftoksi epoksitle başlar. Eğitim katmanı naftoksi eterin korunmasını, karbon–azot bağının oluşmasını ve oksijen içeren üç üyeli halkanın açılmasını izler. Kaynağı geriye doğru genişletip bu epoksitin atıf yapılmamış hazırlanışını rotaya eklemez.",
    sourceAnchors: {
      "source:patent-us3337628a": {
        locator:
          "Örnek 4: naftoksi epoksit/izopropilamin paragrafı ve hemen ardından gelen adlandırılmış ürün paragrafı.",
        supportScope:
          "Bildirilen girdi çiftini ve propranolol serbest baz bağlantısını destekler; operasyonel koşullar eğitim hikâyesine taşınmaz.",
      },
    },
    materials: {
      "material:propranolol:naphthoxy-epoxide": "1,2-epoksi-3-(1-naftoksi)propan",
      "material:propranolol:isopropylamine": "izopropilamin",
      "material:propranolol:free-base": "propranolol (serbest baz bağlantısı)",
    },
    reactionClasses: [
      "aminin nükleofilik epoksit açması",
      "amino alkol oluşumu",
    ],
    stereochemistryTeachingScope:
      "Atıf yapılan örnek mutlak konfigürasyon atamaz; bu nedenle hikâye enantiyomere özgü bir rota iddiasında bulunmaz.",
    limitations: [
      "Atıf yapılan örnek önceden hazırlanmış epoksitle başlar; epoksitin önceki hazırlanma adımları bu hikâyenin dışındadır.",
      "Atom eşlemesi yayımlanmış bir atom haritası değil, taslak eğitim açıklamasıdır.",
      "Bağlantı; farmasötik formu, saflığı, ölçeği veya klinik performansı kanıtlamaz.",
    ],
    reviewScope:
      "Birincil kaynak kimliği ve konumu denetlendi; atom eşlemesi için adı belirtilmiş bir sentetik kimya uzmanının incelemesi hâlâ gereklidir.",
    verificationNote:
      "Rota sınırı ve adlandırılmış ürün US 3,337,628 A, Örnek 4 tarafından desteklenir; eğitim eşlemesinin uzman incelemesi beklemektedir.",
    safetyNote:
      "Bu eğitim hikâyesi miktar, düzenek, koşul, işleme ve operasyonel laboratuvar talimatlarını içermez. Bir sentez protokolü değil, atıf yapılan kaynağın yapısal okumasıdır.",
    steps: {
      "synthesis-step:propranolol-01": {
        title: "Kanıt sınırını belirle",
        inputLabels: ["önceden hazırlanmış naftoksi epoksit", "izopropilamin"],
        outputLabel: "kaynağa dayalı girdi çifti",
        transformationFamily: "kaynak sınırını belirleme",
        changeSummary:
          "Bu karede kovalent değişim iddia edilmez: atıf yapılan örnek epoksit zaten mevcutken başlar.",
        learningRationale:
          "Bir literatür hikâyesi, atıf yapılmamış bir önceki adımı uydurmak yerine kanıtının başladığı yerde başlamalıdır.",
        commonMisconception:
          "Bilinen bir öncül, onun hazırlanışını atıf yapılan rotanın parçası yapmaz.",
        atomMappingNote: "Bu yalnız yönlendirme karesidir; eşleme bağ değişimi adımında başlar.",
        atoms: {},
        bondChanges: {},
        verificationNote:
          "Başlangıç çifti US 3,337,628 A, Örnek 4'te adlandırılmıştır.",
      },
      "synthesis-step:propranolol-02": {
        title: "Epoksiti amin parçasıyla aç",
        inputLabels: ["1,2-epoksi-3-(1-naftoksi)propan", "izopropilamin"],
        outputLabel: "propranolol serbest baz bağlantısı",
        transformationFamily: "aminin nükleofilik epoksit açması",
        changeSummary:
          "Epoksit yan zincirinde bir karbon–azot bağı oluşurken halka karbonu ile oksijen arasındaki bağlardan biri açılır; oksijen alkol oksijeni olarak korunur.",
        learningRationale:
          "Amino alkol motifini açıklayan üç atomu izle: saldırıya uğrayan karbon, epoksit oksijeni ve amin azotu.",
        commonMisconception:
          "Doğru bir bağlantı haritası enantiyomer atamaz ve deneysel işlemi yeniden üretmez.",
        atomMappingNote:
          "Adlandırılmış atom eşlemesi eğitim amacıyla çıkarılmıştır ve uzman incelemesi beklemektedir; patent bir atom haritası yayımlamaz.",
        atoms: {
          "map:propranolol:terminal-carbon": {
            input: "uç epoksit karbonu",
            product: "amin bağlı yan zincir karbonu",
          },
          "map:propranolol:epoxide-oxygen": {
            input: "epoksit oksijeni",
            product: "alkol oksijeni",
          },
          "map:propranolol:amine-nitrogen": {
            input: "amin azotu",
            product: "ikincil amin azotu",
          },
        },
        bondChanges: {
          formed: "Yeni yan zincir karbon–azot bağı.",
          broken: "Epoksit halkasındaki karbon–oksijen bağı açıldı.",
        },
        verificationNote:
          "Girdi çifti ve adlandırılmış propranolol ürünü US 3,337,628 A, Örnek 4'te bildirilir; eğitim atom haritası taslak durumundadır.",
      },
    },
  },
  "synthesis:atenolol-educational-scaffold": {
    title: "Atenolol: para-amid glisidil eter rotası",
    summary:
      "Para-amid fenolik öncülünü önce glisidil etere, ardından atenolol bağlantısına bağlayan iki dönüşümlü hikâye.",
    routeExplanation:
      "Atıf yapılan örnek hem glisidil eter öncülünün hazırlanışını hem de izopropilaminle dönüşümünü tanımlar. Eğitim görünümü korunan para-amid aromatik bölgeyi ve amino alkol yan zincirini ortaya çıkaran iki bağ değişimini izler.",
    sourceAnchors: {
      "source:patent-us3663607a": {
        locator:
          "Örnek 1: adlandırılmış ürün paragrafı ve hemen ardından epoksipropan başlangıç maddesinin hazırlanışını başlatan paragraf.",
        supportScope:
          "Adlandırılmış öncülü, glisidil eter ara ürününü, izopropilamin girdisini ve atenolol bağlantısını destekler; işlem tarifi yeniden üretilmez.",
      },
    },
    materials: {
      "material:atenolol:hydroxyphenylacetamide": "4-hidroksifenilasetamid",
      "material:atenolol:epichlorohydrin": "epiklorohidrin",
      "material:atenolol:isopropylamine": "izopropilamin",
      "material:atenolol:glycidyl-ether": "1-p-karbamoilmetilfenoksi-2,3-epoksipropan",
      "material:atenolol:parent": "atenolol (ana molekül bağlantısı)",
    },
    reactionClasses: [
      "fenolik O-alkilasyon / glisidil eter oluşumu",
      "aminin nükleofilik epoksit açması",
      "amino alkol oluşumu",
    ],
    stereochemistryTeachingScope:
      "Örnek 1 mutlak konfigürasyon atamaz; rota enantiyomere özgü bir iddia olmadan bağlantı düzeyinde öğretilir.",
    limitations: [
      "Hikâye yalnız dönüşümleri özetler ve deneysel uygulamanın bütün ayrıntılarını dışarıda bırakır.",
      "Adlandırılmış atom eşlemesi, sentetik kimya incelemesini bekleyen editoryal bir eğitim haritasıdır.",
      "Rota, pazarlanan bir farmasötik formu veya karşılaştırmalı performansı kanıtlamaz.",
    ],
    reviewScope:
      "Patent konumu ve bileşik kimlikleri denetlendi; dönüşüm metni ve atom eşlemesi adı belirtilmiş uzman incelemesini bekliyor.",
    verificationNote:
      "İki rota dönüşümü US 3,663,607 A, Örnek 1'e ve onun öncül paragrafına dayanır; uzman incelemesi beklemektedir.",
    safetyNote:
      "Bu eğitim hikâyesi miktar, düzenek, koşul, işleme ve operasyonel laboratuvar talimatlarını içermez. Bir sentez protokolü değil, atıf yapılan kaynağın yapısal okumasıdır.",
    steps: {
      "synthesis-step:atenolol-01": {
        title: "Para-amid glisidil eteri oluştur",
        inputLabels: ["4-hidroksifenilasetamid", "epiklorohidrin"],
        outputLabel: "para-amid glisidil eter ara ürünü",
        transformationFamily: "fenolik O-alkilasyon",
        changeSummary:
          "Fenolik oksijen glisidil metilenine bağlanırken para-amid yan zinciri değişmeden kalır.",
        learningRationale:
          "Aromatik substitüsyon düzenini daha sonra gerçekleşen amino alkol oluşumundan ayır.",
        commonMisconception:
          "Amid grubu bu adımda korunan substitüenttir; eşlenen bu dönüşüm sırasında oluşmaz.",
        atomMappingNote:
          "Adlandırılmış atom eşlemesi eğitim için kaynak yapılarından çıkarılmıştır; patent bir atom haritası yayımlamaz.",
        atoms: {
          "map:atenolol:phenolic-oxygen": {
            input: "fenolik oksijen",
            product: "aril eter oksijeni",
          },
          "map:atenolol:glycidyl-methylene": {
            input: "klorometil karbonu",
            product: "aril etere bağlı metilen karbonu",
          },
          "map:atenolol:chlorine": {
            input: "klor",
            product: "eşlenen ara üründe korunmadı",
          },
        },
        bondChanges: {
          formed: "Yeni aril oksijeni–glisidil metileni bağı.",
          broken: "Karbon–klor bağı eşlenen ara üründe bulunmaz.",
        },
        verificationNote:
          "US 3,663,607 A, Örnek 1'in ardından gelen öncül paragrafı girdileri ve glisidil eter ara ürününü adlandırır; atom eşlemesi taslaktır.",
      },
      "synthesis-step:atenolol-02": {
        title: "Amino alkolü ortaya çıkarmak için epoksiti aç",
        inputLabels: ["para-amid glisidil eter", "izopropilamin"],
        outputLabel: "atenolol ana molekül bağlantısı",
        transformationFamily: "aminin nükleofilik epoksit açması",
        changeSummary:
          "Glisidil yan zincirinde bir karbon–azot bağı oluşur ve epoksit karbonu ile oksijen arasındaki bağlardan biri açılır; oksijen alkol oksijeni olarak korunur.",
        learningRationale:
          "Farklı bir aromatik substitüent korunurken aynı amino alkol motifinin nasıl kurulabildiğini izle.",
        commonMisconception:
          "Ortak tepkime sınıfı, moleküllerin aynı seçiciliğe, dağılıma veya klinik kullanıma sahip olduğunu göstermez.",
        atomMappingNote:
          "Adlandırılmış atom eşlemesi eğitim için çıkarılmıştır ve uzman incelemesi beklemektedir.",
        atoms: {
          "map:atenolol:terminal-epoxide-carbon": {
            input: "uç epoksit karbonu",
            product: "amin bağlı yan zincir karbonu",
          },
          "map:atenolol:epoxide-oxygen": {
            input: "epoksit oksijeni",
            product: "alkol oksijeni",
          },
          "map:atenolol:amine-nitrogen": {
            input: "amin azotu",
            product: "ikincil amin azotu",
          },
        },
        bondChanges: {
          formed: "Yeni yan zincir karbon–azot bağı.",
          broken: "Epoksit halkasındaki karbon–oksijen bağı açıldı.",
        },
        verificationNote:
          "US 3,663,607 A, Örnek 1 glisidil eteri, izopropilamini ve adlandırılmış atenolol bağlantısını bildirir; atom eşlemesi taslaktır.",
      },
    },
  },
  "synthesis:carvedilol-educational-scaffold": {
    title: "Carvedilol: karbazol epoksit yakınsaması",
    summary:
      "Karbazol taşıyan bir epoksit ile metoksifenoksietil amin parçasının carvedilol bağlantısında kaynak bağlantılı yakınsaması.",
    routeExplanation:
      "Atıf yapılan örnek önceden hazırlanmış iki parçayla başlar. Eğitim katmanı bu sınırı açık eder; ardından karbazol ve metoksifenoksi bölgelerini amino alkol bağlayıcısı üzerinden birleştiren karbon–azot bağı oluşumunu ve epoksit halkasının açılmasını izler.",
    sourceAnchors: {
      "source:patent-us4503067a": {
        locator:
          "Metoksifenoksietilamino ürünü için başlık taşıyan Örnek 2: başlangıç maddesi paragrafı ve adlandırılmış ürün paragrafı.",
        supportScope:
          "Bildirilen iki parçayı ve carvedilol ana molekül bağlantısını destekler; bu hikâyede parçaların önceki hazırlanma rotasını desteklemez.",
      },
    },
    materials: {
      "material:carvedilol:carbazole-epoxide": "4-(2,3-epoksipropoksi)-9H-karbazol",
      "material:carvedilol:aminoethyl-aryl-ether": "2-(2-metoksifenoksi)etilamin",
      "material:carvedilol:parent": "carvedilol (ana molekül bağlantısı)",
    },
    reactionClasses: [
      "yakınsak parça eşleşmesi",
      "aminin nükleofilik epoksit açması",
      "amino alkol oluşumu",
    ],
    stereochemistryTeachingScope:
      "Örnek 2 mutlak konfigürasyon atamaz; hikâye tek bir enantiyomer atfetmeden ana molekül bağlantısını sunar.",
    limitations: [
      "Atıf yapılan örnek önceden hazırlanmış iki parçayla başlar; parçaların önceki hazırlanma adımları bu hikâyenin dışındadır.",
      "Atom haritası editoryal eğitim açıklamasıdır ve patentte yayımlanmamıştır.",
      "Bu rota görünümünden fosfat formları, safsızlık kontrolü, ölçek veya klinik etkinlik hakkında sonuç çıkarılamaz.",
    ],
    reviewScope:
      "Patent konumu ve parça kimlikleri denetlendi; atom eşlemesi ve eğitim metni adı belirtilmiş uzman incelemesini bekliyor.",
    verificationNote:
      "Parça çifti ve adlandırılmış ürün US 4,503,067 A, Örnek 2'ye dayanır; eğitim haritasının uzman incelemesi beklemektedir.",
    safetyNote:
      "Bu eğitim hikâyesi miktar, düzenek, koşul, işleme ve operasyonel laboratuvar talimatlarını içermez. Bir sentez protokolü değil, atıf yapılan kaynağın yapısal okumasıdır.",
    steps: {
      "synthesis-step:carvedilol-01": {
        title: "Yakınsak parça sınırını belirle",
        inputLabels: ["karbazol taşıyan epoksit", "metoksifenoksietil amin"],
        outputLabel: "kaynağa dayalı parça çifti",
        transformationFamily: "kaynak sınırını belirleme",
        changeSummary:
          "Bu karede kovalent değişim iddia edilmez: atıf yapılan örnek, iki karmaşık parça da önceden hazırlanmışken başlar.",
        learningRationale:
          "Bu iki bölgeyi birleştiren tek bağlanma olayını izlemeden önce korunan iki moleküler bölgeyi tanı.",
        commonMisconception:
          "Adlandırılmış iki parçayı göstermek, bu parçaların nasıl hazırlandığını kanıtlamaz.",
        atomMappingNote: "Bu yalnız yönlendirme karesidir; eşleme bağ değişimi adımında başlar.",
        atoms: {},
        bondChanges: {},
        verificationNote:
          "İki başlangıç parçası US 4,503,067 A, Örnek 2'de adlandırılmıştır.",
      },
      "synthesis-step:carvedilol-02": {
        title: "Parçaları epoksit açılmasıyla birleştir",
        inputLabels: [
          "4-(2,3-epoksipropoksi)-9H-karbazol",
          "2-(2-metoksifenoksi)etilamin",
        ],
        outputLabel: "carvedilol ana molekül bağlantısı",
        transformationFamily: "aminin nükleofilik epoksit açması",
        changeSummary:
          "Bir karbon–azot bağı, amin taşıyan aril eteri karbazol yan zincirine bağlarken epoksit karbonu ile oksijen arasındaki bağlardan biri açılır.",
        learningRationale:
          "Hangi büyük parçaların değişmeden korunduğunu gözden kaçırmadan yakınsak eşleşmeyi izle.",
        commonMisconception:
          "Ana yapı eşleşmesi bir tuzu, polimorfu, enantiyomeri veya üretim rotasını belirlemez.",
        atomMappingNote:
          "Adlandırılmış atom eşlemesi eğitim için çıkarılmıştır ve uzman incelemesi beklemektedir.",
        atoms: {
          "map:carvedilol:terminal-epoxide-carbon": {
            input: "uç epoksit karbonu",
            product: "amin bağlı bağlayıcı karbonu",
          },
          "map:carvedilol:epoxide-oxygen": {
            input: "epoksit oksijeni",
            product: "alkol oksijeni",
          },
          "map:carvedilol:amine-nitrogen": {
            input: "birincil amin azotu",
            product: "ikincil amin azotu",
          },
        },
        bondChanges: {
          formed: "Yeni bağlayıcı karbon–azot bağı iki parçayı birleştirir.",
          broken: "Epoksit halkasındaki karbon–oksijen bağı açıldı.",
        },
        verificationNote:
          "US 4,503,067 A, Örnek 2 adlandırılmış başlangıç parçalarını ve ürün bağlantısını bildirir; atom eşlemesi taslaktır.",
      },
    },
  },
} satisfies LocalizedShape<typeof enSynthesisContent>;

export const synthesisContent: Readonly<
  Record<Locale, LocalizedShape<typeof enSynthesisContent>>
> = {
  tr: trSynthesisContent,
  en: enSynthesisContent,
};

export function isSynthesisStoryContentId(value: string): value is SynthesisStoryContentId {
  return Object.hasOwn(enSynthesisContent, value);
}

export function getSynthesisStoryContent(
  locale: Locale,
  storyId: string,
): SynthesisStoryContent | null {
  if (!isSynthesisStoryContentId(storyId)) return null;
  return synthesisContent[locale][storyId];
}

export function getSynthesisStepContent(
  locale: Locale,
  storyId: string,
  stepId: string,
): SynthesisStepContent | null {
  return getSynthesisStoryContent(locale, storyId)?.steps[stepId] ?? null;
}

export function getSynthesisMaterialLabel(
  locale: Locale,
  storyId: string,
  materialId: string,
): string | null {
  return getSynthesisStoryContent(locale, storyId)?.materials[materialId] ?? null;
}
