import type {
  LocalizedNomenclatureText,
  NomenclatureExercise,
  NomenclatureReference,
  NomenclatureTopic,
} from "@/lib/domain/nomenclature";

const text = (tr: string, en: string): LocalizedNomenclatureText => ({ tr, en });

export const nomenclatureReferences: readonly NomenclatureReference[] = [
  {
    id: "source:iupac-brief-guide-organic-2020",
    title: text(
      "IUPAC Organik Kimya Adlandırması Kısa Rehberi",
      "IUPAC Brief Guide to the Nomenclature of Organic Chemistry",
    ),
    url: "https://doi.org/10.1515/pac-2019-0104",
    locator: text(
      "Bölüm 2–5 ve Tablo 1–4",
      "Sections 2–5 and Tables 1–4",
    ),
  },
  {
    id: "source:iupac-blue-book-2013",
    title: text(
      "IUPAC Organik Kimya Adlandırması — Blue Book (2013)",
      "IUPAC Nomenclature of Organic Chemistry — Blue Book (2013)",
    ),
    url: "https://doi.org/10.1039/9781849733069",
    locator: text(
      "P-1 ve P-2 bölümleri; tercih edilen IUPAC adları ilkeleri",
      "Chapters P-1 and P-2; principles of preferred IUPAC names",
    ),
  },
  {
    id: "source:drugsfda-nda018553-001",
    title: text(
      "US FDA Drugs@FDA — INDERAL LA ürün kaydı",
      "US FDA Drugs@FDA — INDERAL LA product record",
    ),
    url: "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=018553",
    locator: text(
      "NDA 018553, ürün 001; etkin bileşen propranolol hidroklorür",
      "NDA 018553, product 001; active ingredient propranolol hydrochloride",
    ),
  },
  {
    id: "source:drugsfda-nda020516-001",
    title: text(
      "US FDA Drugs@FDA — CHILDREN’S MOTRIN ürün kaydı",
      "US FDA Drugs@FDA — CHILDREN’S MOTRIN product record",
    ),
    url: "https://www.accessdata.fda.gov/scripts/cder/daf/index.cfm?event=overview.process&ApplNo=020516",
    locator: text(
      "NDA 020516, ürün 001; etkin bileşen ibuprofen",
      "NDA 020516, product 001; active ingredient ibuprofen",
    ),
  },
] as const;

export const nomenclatureTopics: readonly NomenclatureTopic[] = [
  {
    id: "topic:atoms-bonds",
    order: 1,
    title: text("Atomları ve bağları oku", "Read atoms and bonds"),
    shortTitle: text("Atomlar ve bağlar", "Atoms and bonds"),
    objective: text(
      "Yoğunlaştırılmış formüldeki atomları, dalları ve kesintisiz bağ yollarını ayırt et.",
      "Distinguish atoms, branches, and continuous bond paths in a condensed formula.",
    ),
  },
  {
    id: "topic:functional-groups",
    order: 2,
    title: text("İşlevsel grupları bul", "Find functional groups"),
    shortTitle: text("İşlevsel gruplar", "Functional groups"),
    objective: text(
      "Aynı yapıda bulunan karakteristik atom ve bağ örüntülerini ayrı ayrı tanı.",
      "Identify each characteristic atom-and-bond pattern present in one structure.",
    ),
  },
  {
    id: "topic:parent-selection",
    order: 3,
    title: text("Ana zinciri veya halkayı seç", "Choose the parent chain or ring"),
    shortTitle: text("Ana yapı", "Parent selection"),
    objective: text(
      "Basit örneklerde halka ile bağlı zincir arasından ana yapıyı seç.",
      "Choose the parent between a ring and its attached chain in simple cases.",
    ),
  },
  {
    id: "topic:numbering",
    order: 4,
    title: text("Ana yapıyı numaralandır", "Number the parent"),
    shortTitle: text("Numaralandırma", "Numbering"),
    objective: text(
      "İlk fark noktasında daha küçük lokantlar oluşacak yönü seç.",
      "Choose the direction that gives lower locants at the first point of difference.",
    ),
  },
  {
    id: "topic:substituents-prefixes",
    order: 5,
    title: text("Sübstitüentleri ve önekleri birleştir", "Combine substituents and prefixes"),
    shortTitle: text("Sübstitüentler", "Substituents"),
    objective: text(
      "Lokantları, tekrarlama öneklerini ve alfabetik sırayı tam bir adda uygula.",
      "Apply locants, multiplicative prefixes, and alphabetical order in a complete name.",
    ),
  },
  {
    id: "topic:functional-priority",
    order: 6,
    title: text("İşlevsel grup önceliğini kur", "Apply functional-group priority"),
    shortTitle: text("Grup önceliği", "Group priority"),
    objective: text(
      "Adın son ekini belirleyen esas karakteristik grubu seç.",
      "Choose the principal characteristic group that determines the suffix.",
    ),
  },
  {
    id: "topic:aromatic-heterocyclic",
    order: 7,
    title: text("Aromatik ve heterosiklik ana yapıyı tanı", "Recognize aromatic and heterocyclic parents"),
    shortTitle: text("Aromatik / heterosiklik", "Aromatic / heterocyclic"),
    objective: text(
      "Halkadaki heteroatomun, korunmuş ana yapı seçimini nasıl değiştirdiğini gör.",
      "See how a ring heteroatom changes the retained parent selection.",
    ),
  },
  {
    id: "topic:stereochemistry",
    order: 8,
    title: text("R/S ve E/Z stereokimyasını oku", "Read R/S and E/Z stereochemistry"),
    shortTitle: text("Stereokimya", "Stereochemistry"),
    objective: text(
      "Öncelik karşılaştırmalarını uzaysal bir tanımlayıcıya dönüştür.",
      "Turn priority comparisons into a spatial descriptor.",
    ),
  },
  {
    id: "topic:chemical-forms",
    order: 9,
    title: text("Ana molekülü kimyasal formdan ayır", "Separate the parent molecule from its chemical form"),
    shortTitle: text("Tuzlar ve formlar", "Salts and forms"),
    objective: text(
      "Ana molekül kimliği ile tuz, ester veya solvat gibi kimyasal form kayıtlarını karıştırma.",
      "Keep parent-molecule identity distinct from chemical-form records such as salts, esters, or solvates.",
    ),
  },
  {
    id: "topic:name-relationships",
    order: 10,
    title: text("Ad türleri arasındaki ilişkiyi kur", "Relate different name types"),
    shortTitle: text("Ad ilişkileri", "Name relationships"),
    objective: text(
      "Yapı-temelli sistematik ad, jenerik ad ve ürüne özgü marka adını ayrı katmanlar olarak sınıflandır.",
      "Classify a structure-based systematic name, generic name, and product-specific brand name as distinct layers.",
    ),
  },
] as const;

const sharedReferenceIds = [
  "source:iupac-brief-guide-organic-2020",
  "source:iupac-blue-book-2013",
] as const;

export const nomenclatureExercises: readonly NomenclatureExercise[] = [
  {
    id: "nomenclature:parent-chain:2-methylpentane",
    topicId: "topic:atoms-bonds",
    kind: "parent-chain-selection",
    responseType: "single-choice",
    formula: "CH₃–CH(CH₃)–CH₂–CH₂–CH₃",
    formulaDescription: text(
      "Beş karbonlu kesintisiz zincire bağlı bir metil dalı içeren yoğunlaştırılmış yapı formülü.",
      "Condensed structure with a methyl branch attached to a continuous five-carbon chain.",
    ),
    prompt: text(
      "Ana zincirde kaç karbon bulunur?",
      "How many carbons belong to the parent chain?",
    ),
    instruction: text(
      "Yapıda kopmadan izleyebildiğin en uzun yolu seç.",
      "Select the longest path you can trace without breaking continuity.",
    ),
    hint: text(
      "Bir dal karbonunu ana zincire katmak, zincirin başka bir bölümünü dışarıda bırakabilir.",
      "Including a branch carbon may force another part of the chain outside the parent.",
    ),
    options: [
      {
        id: "four-carbons",
        label: text("Dört karbon", "Four carbons"),
        wrongFeedback: text(
          "Dörtte durmak zinciri erken keser; yatay yolu bir karbon daha izleyebilirsin.",
          "Stopping at four cuts the chain early; the continuous path extends one carbon farther.",
        ),
      },
      { id: "five-carbons", label: text("Beş karbon", "Five carbons") },
      {
        id: "six-carbons",
        label: text("Altı karbon", "Six carbons"),
        wrongFeedback: text(
          "Toplam karbon sayısı altıdır, ancak altısının tümünü tek ve kesintisiz bir yolda dolaşamazsın.",
          "There are six carbons in total, but no single continuous path passes through all six.",
        ),
      },
    ],
    correctOptionIds: ["five-carbons"],
    correctFeedback: text(
      "Doğru: ana yapı beş karbonlu pentan zinciridir.",
      "Correct: the parent is a five-carbon pentane chain.",
    ),
    incorrectFeedback: text(
      "Toplam atom sayısını değil, en uzun kesintisiz karbon yolunu say.",
      "Count the longest continuous carbon path, not the total number of carbon atoms.",
    ),
    explanation: text(
      "Soldan sağa kesintisiz yol beş karbon içerir; parantezdeki CH₃ bu yola bağlı metil dalıdır.",
      "The uninterrupted left-to-right path contains five carbons; the parenthesized CH₃ is a methyl branch.",
    ),
    misconception: text(
      "Yapıdaki bütün karbonların ana zincire ait olduğu varsayımı dallanmış yapılarda doğru değildir.",
      "In a branched structure, not every carbon necessarily belongs to the parent chain.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:locant:2-methylpentane",
    topicId: "topic:numbering",
    kind: "locant-assignment",
    responseType: "single-choice",
    formula: "CH₃–CH(CH₃)–CH₂–CH₂–CH₃",
    formulaDescription: text(
      "Pentan ana zincirinin bir ucuna daha yakın metil dalı.",
      "A methyl branch closer to one end of a pentane parent chain.",
    ),
    prompt: text("Metil dalının lokantı kaçtır?", "What is the locant of the methyl branch?"),
    instruction: text(
      "Beş karbonlu zinciri iki uçtan da numaralandır ve ilk farkı karşılaştır.",
      "Number the five-carbon chain from both ends and compare the first difference.",
    ),
    hint: text("Olası lokantlar 2 ve 4’tür.", "The competing locants are 2 and 4."),
    options: [
      { id: "locant-2", label: text("2", "2") },
      {
        id: "locant-3",
        label: text("3", "3"),
        wrongFeedback: text(
          "Dal orta karbonda değildir; bağlı olduğu karbonu uçtan başlayarak yeniden say.",
          "The branch is not on the middle carbon; recount from an end to the attachment point.",
        ),
      },
      {
        id: "locant-4",
        label: text("4", "4"),
        wrongFeedback: text(
          "Sağdan 4 elde edilir; diğer uçtan numaralandırma aynı dala daha düşük lokant olan 2’yi verir.",
          "Numbering from the right gives 4; the other direction gives the same branch the lower locant 2.",
        ),
      },
    ],
    correctOptionIds: ["locant-2"],
    correctFeedback: text("Doğru: ilk farkta 2, 4’ten küçüktür.", "Correct: at the first difference, 2 is lower than 4."),
    incorrectFeedback: text(
      "Aynı ana zinciri diğer uçtan da numaralandır ve lokantları karşılaştır.",
      "Number the same parent from the opposite end and compare the locants.",
    ),
    explanation: text(
      "Dala en yakın uçtan başlandığında metil grubu karbon 2’dedir; ana ad 2-metilpentan olur.",
      "Starting from the nearer end places the methyl group at carbon 2, giving 2-methylpentane.",
    ),
    misconception: text(
      "Yoğunlaştırılmış formülün soldan yazılmış olması tek başına numaralandırma yönünü belirlemez.",
      "The direction in which a condensed formula is written does not itself determine numbering.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:functional-groups:hydroxyethanoic-acid",
    topicId: "topic:functional-groups",
    kind: "substituent-identification",
    interactionLabel: text("İşlevsel grup tanıma", "Functional-group identification"),
    responseType: "multiple-choice",
    formula: "HO–CH₂–COOH",
    formulaDescription: text(
      "Aynı iki karbonlu yapıda bir hidroksi ve bir karboksilik asit örüntüsü.",
      "A hydroxy pattern and a carboxylic-acid pattern in the same two-carbon structure.",
    ),
    prompt: text(
      "Bu yapıda hangi işlevsel grup örüntüleri bulunur?",
      "Which functional-group patterns are present in this structure?",
    ),
    instruction: text("Yapıda açıkça bulunanların tümünü seç.", "Select every pattern explicitly present."),
    hint: text(
      "Soldaki –OH ile sağdaki –COOH bölümünü ayrı ayrı incele.",
      "Inspect the –OH group on the left and the –COOH region on the right separately.",
    ),
    options: [
      {
        id: "hydroxy",
        label: text("Hidroksi / alkol örüntüsü (–OH)", "Hydroxy / alcohol pattern (–OH)"),
        wrongFeedback: text(
          "–OH örüntüsü vardır; fakat yapı ayrıca –COOH bölgesini de içerir.",
          "The –OH pattern is present, but the structure also contains a –COOH region.",
        ),
      },
      {
        id: "carboxylic-acid",
        label: text("Karboksilik asit (–COOH)", "Carboxylic acid (–COOH)"),
        wrongFeedback: text(
          "–COOH örüntüsü vardır; ancak soldaki –OH örüntüsünü de tanımlamalısın.",
          "The –COOH pattern is present, but you must also identify the –OH pattern on the left.",
        ),
      },
      {
        id: "amine",
        label: text("Amin (–NH₂)", "Amine (–NH₂)"),
        wrongFeedback: text(
          "Formülde azot atomu bulunmadığı için amin örüntüsü yoktur.",
          "The formula contains no nitrogen atom, so no amine pattern is present.",
        ),
      },
      { id: "ether", label: text("Eter (C–O–C)", "Ether (C–O–C)") },
    ],
    correctOptionIds: ["hydroxy", "carboxylic-acid"],
    correctFeedback: text(
      "Doğru: yapı hidroksi ve karboksilik asit örüntülerini birlikte içerir.",
      "Correct: the structure contains both hydroxy and carboxylic-acid patterns.",
    ),
    incorrectFeedback: text(
      "Atomları silmeden yapıyı iki bölgeye ayır; doğru yanıt iki grup örüntüsü içerir.",
      "Divide the structure into two regions without deleting atoms; the complete answer contains two group patterns.",
    ),
    explanation: text(
      "Uçtaki –OH hidroksi örüntüsünü, –C(=O)OH olarak açılan –COOH ise karboksilik asit örüntüsünü verir.",
      "The terminal –OH gives the hydroxy pattern, while –COOH expands to –C(=O)OH and gives the carboxylic-acid pattern.",
    ),
    misconception: text(
      "–COOH içindeki OH ile ayrı alkol –OH’sini tek grup saymak, bağ çevrelerini gözden kaçırır.",
      "Treating the OH inside –COOH and the separate alcohol –OH as the same group overlooks their different bonding environments.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:prefix-order:ethyl-dimethylpentane",
    topicId: "topic:substituents-prefixes",
    kind: "full-name-construction",
    responseType: "text",
    formula: "CH₃–C(CH₃)₂–CH(CH₂CH₃)–CH₂–CH₃",
    formulaDescription: text(
      "Pentan ana zincirinde bir etil ve iki metil dalı.",
      "A pentane parent bearing one ethyl and two methyl branches.",
    ),
    prompt: text(
      "Sübstitüentleri ve önekleri kullanarak tam adı yaz.",
      "Use the substituents and prefixes to enter the complete name.",
    ),
    instruction: text(
      "Pentan ana yapısını numaralandır; iki metil ile bir etili lokantlarıyla birleştir.",
      "Number the pentane parent, then combine two methyl groups and one ethyl group with their locants.",
    ),
    hint: text(
      "Etil karbon 3’te, iki metil karbon 2’dedir; alfabetik sıra “di-” önekini yok sayar.",
      "Ethyl is at carbon 3 and both methyl groups are at carbon 2; alphabetization ignores “di-.”",
    ),
    acceptedAnswers: {
      tr: ["3-etil-2,2-dimetilpentan", "3-etil-2,2-dimetil pentan"],
      en: ["3-ethyl-2,2-dimethylpentane", "3-ethyl-2,2-dimethyl pentane"],
    },
    correctFeedback: text(
      "Doğru: lokantlar, tekrarlama öneki ve alfabetik sıra birlikte korundu.",
      "Correct: the locants, multiplicative prefix, and alphabetical order are all preserved.",
    ),
    incorrectFeedback: text(
      "Ana yapı pentandır; etil 3’te, iki metil 2,2’dedir ve etil adı dimetilden önce yazılır.",
      "The parent is pentane; ethyl is at 3, two methyl groups are at 2,2, and ethyl is cited before dimethyl.",
    ),
    explanation: text(
      "Tam ad 3-etil-2,2-dimetilpentan düzenindedir; “di-” alfabetik karşılaştırmaya katılmaz.",
      "The complete name is 3-ethyl-2,2-dimethylpentane; “di-” is not counted for alphabetization.",
    ),
    misconception: text(
      "Adın başındaki ilk harfin her zaman alfabetik sıraya katıldığı düşüncesi tekrarlama öneklerinde işlemez.",
      "The first printed letter is not always counted in alphabetization when it belongs to a multiplicative prefix.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:aromatic-heterocyclic:pyridine-parent",
    topicId: "topic:aromatic-heterocyclic",
    kind: "parent-chain-selection",
    interactionLabel: text(
      "Aromatik heterohalka ana yapısı",
      "Aromatic heterocycle parent selection",
    ),
    responseType: "single-choice",
    formula: "C₅H₅N",
    formulaDescription: text(
      "Beş karbon ve bir azot içeren altı üyeli aromatik halka.",
      "A six-membered aromatic ring containing five carbons and one nitrogen.",
    ),
    prompt: text("Bu korunmuş heterosiklik ana yapı hangisidir?", "Which retained heterocyclic parent is this?"),
    instruction: text(
      "Halka boyutunu, aromatikliği ve halkadaki azot atomını birlikte değerlendir.",
      "Consider the ring size, aromaticity, and the nitrogen atom in the ring together.",
    ),
    hint: text(
      "Benzen C₆H₆’dır; bir CH biriminin halka azotuyla değişmesi farklı bir korunmuş ad verir.",
      "Benzene is C₆H₆; replacing one ring CH unit with ring nitrogen gives a different retained name.",
    ),
    options: [
      { id: "pyridine", label: text("Piridin", "Pyridine") },
      {
        id: "benzene",
        label: text("Benzen", "Benzene"),
        wrongFeedback: text(
          "Benzen halkasının altı üyesi de karbondur; verilen halka bir azot içerir.",
          "All six members of benzene are carbon; the stated ring contains one nitrogen.",
        ),
      },
      {
        id: "cyclohexane",
        label: text("Sikloheksan", "Cyclohexane"),
        wrongFeedback: text(
          "Sikloheksan doymuş ve yalnız karbonlu bir halkadır; verilen ana yapı aromatik ve azot içerir.",
          "Cyclohexane is a saturated all-carbon ring; the stated parent is aromatic and contains nitrogen.",
        ),
      },
    ],
    correctOptionIds: ["pyridine"],
    correctFeedback: text("Doğru: C₅H₅N aromatik halkası piridin ana yapısıdır.", "Correct: the C₅H₅N aromatic ring is the pyridine parent."),
    incorrectFeedback: text(
      "Halkadaki azot atomunu yok sayma; ana yapı yalnız karbonlu değildir.",
      "Do not ignore the ring nitrogen; the parent is not an all-carbon ring.",
    ),
    explanation: text(
      "Piridin, bir halka azotu ve beş halka karbonu içeren altı üyeli aromatik korunmuş ana addır.",
      "Pyridine is the retained parent name for a six-membered aromatic ring with one ring nitrogen and five ring carbons.",
    ),
    misconception: text(
      "Altı üyeli her aromatik halkaya benzen demek, heteroatomun ana yapı kimliğini değiştirdiğini gözden kaçırır.",
      "Calling every six-membered aromatic ring benzene overlooks how a heteroatom changes the parent identity.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:ring-parent:methylcyclohexane",
    topicId: "topic:parent-selection",
    kind: "parent-chain-selection",
    responseType: "single-choice",
    formula: "cyclo-C₆H₁₁–CH₃",
    formulaDescription: text(
      "Altı üyeli karbon halkasına bağlı tek karbonlu zincir.",
      "A one-carbon chain attached to a six-membered carbon ring.",
    ),
    prompt: text("Bu basit yapıda ana yapı hangisidir?", "Which unit is the parent in this simple structure?"),
    instruction: text("Halka ve bağlı zincirdeki karbon sayılarını karşılaştır.", "Compare the carbon counts of the ring and attached chain."),
    hint: text("Halka altı, bağlı zincir bir karbon içerir.", "The ring contains six carbons; the attached chain contains one."),
    options: [
      { id: "cyclohexane-parent", label: text("Sikloheksan halkası", "Cyclohexane ring") },
      {
        id: "methane-parent",
        label: text("Metan zinciri", "Methane chain"),
        wrongFeedback: text(
          "Tek karbonlu zincir, altı karbonlu halkadan daha küçük olduğu için burada ana yapı olmaz.",
          "The one-carbon chain is smaller than the six-carbon ring and is not the parent here.",
        ),
      },
      { id: "equal-parents", label: text("İkisi eşdeğer", "They are equivalent") },
    ],
    correctOptionIds: ["cyclohexane-parent"],
    correctFeedback: text("Doğru: halka ana yapı, CH₃ ise metil sübstitüentidir.", "Correct: the ring is the parent and CH₃ is a methyl substituent."),
    incorrectFeedback: text(
      "Bu örnekte altı karbonlu halka ile tek karbonlu dal eşdeğer değildir.",
      "In this example, a six-carbon ring and a one-carbon branch are not equivalent parent candidates.",
    ),
    explanation: text(
      "Halka bağlı açık zincirden daha fazla karbon içerdiği için sikloheksan ana yapı seçilir; ad metilsikloheksandır.",
      "Because the ring contains more carbons than the attached acyclic chain, cyclohexane is the parent, giving methylcyclohexane.",
    ),
    misconception: text(
      "Her zaman düz çizilmiş parçanın ana zincir olduğunu varsaymak halka içeren yapılarda güvenilir değildir.",
      "Assuming the linearly drawn fragment is always the parent fails for structures containing rings.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:priority:hydroxyethanoic-acid",
    topicId: "topic:functional-priority",
    kind: "suffix-functional-group-priority",
    responseType: "single-choice",
    formula: "HO–CH₂–COOH",
    formulaDescription: text(
      "Aynı iki karbonlu yapıda hidroksi ve karboksilik asit grupları.",
      "Hydroxy and carboxylic acid groups in the same two-carbon structure.",
    ),
    prompt: text(
      "Hangi grup esas karakteristik grup olarak son eki belirler?",
      "Which group is the principal characteristic group and determines the suffix?",
    ),
    instruction: text("Alkol ve karboksilik asit işlevlerini karşılaştır.", "Compare the alcohol and carboxylic acid functions."),
    hint: text("–COOH, bu örnekte –OH’den daha yüksek son-ek önceliğine sahiptir.", "In this example, –COOH has higher suffix priority than –OH."),
    options: [
      { id: "carboxylic-acid", label: text("Karboksilik asit (–COOH)", "Carboxylic acid (–COOH)") },
      {
        id: "alcohol",
        label: text("Alkol (–OH)", "Alcohol (–OH)"),
        wrongFeedback: text(
          "–OH mevcuttur, ancak –COOH varken hidroksi önekiyle ifade edilir; ana son eki belirlemez.",
          "–OH is present, but with –COOH it is expressed by the hydroxy prefix rather than determining the principal suffix.",
        ),
      },
      { id: "neither", label: text("Hiçbiri", "Neither") },
    ],
    correctOptionIds: ["carboxylic-acid"],
    correctFeedback: text("Doğru: karboksilik asit grubu ana son eki belirler.", "Correct: the carboxylic acid group determines the principal suffix."),
    incorrectFeedback: text(
      "İki grup da yapıda bulunur; soru hangisinin son ek olarak ifade edildiğidir.",
      "Both groups are present; the question is which one is expressed as the suffix.",
    ),
    explanation: text(
      "Karboksilik asit esas karakteristik gruptur; alkol işlevi “hidroksi-” önekiyle kalır.",
      "Carboxylic acid is the principal characteristic group; the alcohol function remains as the “hydroxy-” prefix.",
    ),
    misconception: text(
      "Esas grup seçimi diğer grubu yok saymaz; yalnızca ad içindeki ifade biçimini değiştirir.",
      "Choosing a principal group does not erase the other group; it changes how that group is cited in the name.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:chemical-form:propranolol-hydrochloride",
    topicId: "topic:chemical-forms",
    kind: "substituent-identification",
    interactionLabel: text(
      "Ana molekül ve tuz formunu ayırma",
      "Parent-molecule and salt-form separation",
    ),
    responseType: "single-choice",
    formula: "C₁₆H₂₁NO₂ · HCl",
    formulaDescription: text(
      "Propranolol ana molekül bileşimine hidroklorür formunu oluşturan HCl bileşeninin eşlik ettiği gösterim.",
      "A representation in which the propranolol parent composition is accompanied by the HCl component of the hydrochloride form.",
    ),
    prompt: text(
      "Katalogdaki normalleştirilmiş ana molekül kaydı hangisidir?",
      "Which item is the normalized parent-molecule record in the catalog?",
    ),
    instruction: text(
      "Ana kimliği, pazarlanan veya kaynakta bildirilen kimyasal form kaydından ayır.",
      "Separate the parent identity from the marketed or source-reported chemical-form record.",
    ),
    hint: text(
      "Hidroklorür ifadesi form katmanında kalır; klorür tek başına ana molekül değildir.",
      "Hydrochloride remains in the form layer; chloride alone is not the parent molecule.",
    ),
    options: [
      { id: "propranolol-parent", label: text("Propranolol ana molekülü", "Propranolol parent molecule") },
      {
        id: "hydrochloride-form",
        label: text("Propranolol hidroklorür formu", "Propranolol hydrochloride form"),
        wrongFeedback: text(
          "Hidroklorür, kaynak ve ürün bağlamında önemli bir kimyasal formdur; ancak normalleştirilmiş ana molekül kaydıyla aynı katman değildir.",
          "Hydrochloride is an important chemical form in source and product context, but it is not the same record layer as the normalized parent molecule.",
        ),
      },
      {
        id: "chloride-only",
        label: text("Yalnız klorür bileşeni", "Chloride component alone"),
        wrongFeedback: text(
          "Klorür formun karşı bileşenidir; propranolol ana molekül kimliğinin yerine geçmez.",
          "Chloride is the counter-component of the form; it does not replace the propranolol parent identity.",
        ),
      },
    ],
    correctOptionIds: ["propranolol-parent"],
    correctFeedback: text(
      "Doğru: propranolol ana molekül, propranolol hidroklorür ise ona bağlı ayrı bir kimyasal form kaydıdır.",
      "Correct: propranolol is the parent molecule, while propranolol hydrochloride is a distinct linked chemical-form record.",
    ),
    incorrectFeedback: text(
      "Ana molekül, tuz formu ve karşı bileşen üç farklı kayıt rolüdür; bunları yeniden ayır.",
      "Parent molecule, salt form, and counter-component are three different record roles; separate them again.",
    ),
    explanation: text(
      "Dev Molecules kimlik modelinde normalleştirilmiş propranolol ile hidroklorür formu ayrı tutulur ve kaynak ilişkisi kimyasal form üzerinden kurulur.",
      "In the Dev Molecules identity model, normalized propranolol and its hydrochloride form remain separate, with source relationships resolved through the chemical form.",
    ),
    misconception: text(
      "Bir ürün kaynağında hidroklorür formunun geçmesi, ana molekül ve form kayıtlarının tek kimlik olduğu anlamına gelmez.",
      "A product source naming the hydrochloride form does not make the parent-molecule and form records one identity.",
    ),
    referenceIds: [
      ...sharedReferenceIds,
      "source:drugsfda-nda018553-001",
    ],
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:stereo:ez-and-rs",
    topicId: "topic:stereochemistry",
    kind: "stereochemical-prefix",
    responseType: "multiple-choice",
    formula: "A                 B\nBr     CH₃          COOH\n \\     /              |\n  C = C          H — C — OH\n /     \\              |\nH       H             CH₃",
    formulaDescription: text(
      "A örneği aynı tarafta yüksek öncelikli gruplar taşıyan bir alkeni; B örneği yatay bağları izleyiciye dönük bir Fischer izdüşümünü gösterir.",
      "Example A shows an alkene whose higher-priority groups are on the same side; example B is a Fischer projection with horizontal bonds pointing toward the viewer.",
    ),
    prompt: text("A ve B için doğru stereo tanımlayıcıları seç.", "Select the correct stereochemical descriptors for A and B."),
    instruction: text(
      "Her örnekte öncelikleri ayrı belirle; geçerli iki seçeneği birlikte işaretle.",
      "Determine priorities separately for each example and select both applicable options.",
    ),
    hint: text(
      "A’da Br ve CH₃ aynı taraftadır. B’de öncelik OH > COOH > CH₃ > H’dir ve yataydaki H izleyiciye dönüktür.",
      "In A, Br and CH₃ are on the same side. In B, priority is OH > COOH > CH₃ > H, and horizontal H points toward the viewer.",
    ),
    options: [
      {
        id: "alkene-Z",
        label: text("A = (Z)-", "A = (Z)-"),
        wrongFeedback: text(
          "A için (Z)- doğrudur; ancak B merkezini de sınıflandırmalısın.",
          "(Z)- is correct for A, but you must also classify center B.",
        ),
      },
      {
        id: "center-R",
        label: text("B = (R)-", "B = (R)-"),
        wrongFeedback: text(
          "B için (R)- doğrudur; ancak A alkenini de sınıflandırmalısın.",
          "(R)- is correct for B, but you must also classify alkene A.",
        ),
      },
      {
        id: "alkene-E",
        label: text("A = (E)-", "A = (E)-"),
        wrongFeedback: text(
          "A’da yüksek öncelikli Br ve CH₃ aynı tarafta olduğundan E değil Z kullanılır.",
          "In A, higher-priority Br and CH₃ are on the same side, so Z—not E—applies.",
        ),
      },
      {
        id: "center-S",
        label: text("B = (S)-", "B = (S)-"),
        wrongFeedback: text(
          "Fischer çiziminde düşük öncelikli H yatayda izleyiciye dönüktür; görünen yön ters çevrilince B, R olur.",
          "In the Fischer projection, lowest-priority H is horizontal and points toward the viewer; reversing the apparent sense gives R for B.",
        ),
      },
    ],
    correctOptionIds: ["alkene-Z", "center-R"],
    correctFeedback: text(
      "Doğru: A için (Z)- ve B için (R)- birlikte seçildi.",
      "Correct: (Z)- for A and (R)- for B are both selected.",
    ),
    incorrectFeedback: text(
      "A’da çift bağ taraflarını, B’de Fischer izdüşüm yönünü ayrı ayrı yeniden kontrol et.",
      "Recheck the alkene sides in A and the Fischer projection direction in B separately.",
    ),
    explanation: text(
      "A’da Br ve CH₃ aynı tarafta olduğu için Z’dir. B’de 1→2→3 görünürde saat yönünün tersidir; düşük öncelikli H öne baktığından yön ters çevrilir ve R elde edilir.",
      "A is Z because Br and CH₃ are on the same side. In B, 1→2→3 appears counterclockwise; because lowest-priority H points toward the viewer, the sense is reversed to give R.",
    ),
    misconception: text(
      "E/Z ve R/S aynı öncelik ilkelerinden yararlansa da geometrik okuma adımları birbirinin yerine kullanılamaz.",
      "E/Z and R/S both use priority principles, but their geometric reading steps are not interchangeable.",
    ),
    referenceIds: sharedReferenceIds,
    contentStatus: "curated-educational",
  },
  {
    id: "nomenclature:name-relationships:ibuprofen",
    topicId: "topic:name-relationships",
    kind: "full-name-construction",
    interactionLabel: text("Ad türü sınıflandırma", "Name-type classification"),
    responseType: "single-choice",
    formula: "C₁₃H₁₈O₂",
    formulaDescription: text(
      "İbuprofen ana molekülünün moleküler formülü.",
      "Molecular formula of the ibuprofen parent molecule.",
    ),
    prompt: text(
      "Üç ad katmanını hangi seçenek doğru sınıflandırır?",
      "Which option correctly classifies the three name layers?",
    ),
    instruction: text(
      "Karşılaştır: 2-[4-(2-metilpropil)fenil]propanoik asit; ibuprofen; CHILDREN’S MOTRIN.",
      "Compare: 2-[4-(2-methylpropyl)phenyl]propanoic acid; ibuprofen; CHILDREN’S MOTRIN.",
    ),
    hint: text(
      "Sistematik ad yapıyı kodlar; jenerik ad maddeyi, marka adı ise belirli ürün kimliğini adlandırır.",
      "A systematic name encodes structure; a generic name identifies the substance, while a brand names a particular product identity.",
    ),
    options: [
      {
        id: "systematic-generic-brand",
        label: text(
          "Sistematik yapı adı → jenerik ad → ürüne özgü marka adı",
          "Systematic structure name → generic name → product-specific brand name",
        ),
      },
      {
        id: "brand-systematic-generic",
        label: text(
          "Marka adı → sistematik yapı adı → jenerik ad",
          "Brand name → systematic structure name → generic name",
        ),
        wrongFeedback: text(
          "Uzun yapı-temelli ad bir marka değil; CHILDREN’S MOTRIN belirli ürün kaydındaki marka adıdır.",
          "The long structure-based name is not a brand; CHILDREN’S MOTRIN is the brand in the specific product record.",
        ),
      },
      {
        id: "all-equivalent",
        label: text(
          "Üçü de aynı türde ve aynı kapsamda kimlik adıdır",
          "All three are the same type of identity name with the same scope",
        ),
        wrongFeedback: text(
          "Adlar aynı maddeyle ilişkili olabilir; yine de yapı, jenerik madde ve ürün katmanlarının kapsamı farklıdır.",
          "The names can relate to the same substance, but structure, generic-substance, and product layers have different scope.",
        ),
      },
    ],
    correctOptionIds: ["systematic-generic-brand"],
    correctFeedback: text(
      "Doğru: yapı-temelli ad, jenerik madde adı ve marka/ürün adı birbirine bağlanır fakat aynı alan değildir.",
      "Correct: the structure-based name, generic substance name, and brand/product name are linked but not interchangeable fields.",
    ),
    incorrectFeedback: text(
      "Her adın neyi tanımladığını sor: yapı mı, jenerik madde mi, yoksa belirli bir ürün mü?",
      "Ask what each name identifies: a structure, a generic substance, or a particular product?",
    ),
    explanation: text(
      "İlk ad yapı-temelli sistematik addır, ibuprofen jenerik madde adıdır ve CHILDREN’S MOTRIN doğrulanmış bir ABD ürün kaydındaki marka adıdır.",
      "The first is a structure-based systematic name, ibuprofen is the generic substance name, and CHILDREN’S MOTRIN is the brand name in a verified US product record.",
    ),
    misconception: text(
      "Bir marka adını doğrudan molekülün sistematik adı gibi kullanmak, ürün ve kimyasal kimlik katmanlarını birleştirir.",
      "Using a brand name as though it were the molecule’s systematic name collapses product and chemical-identity layers.",
    ),
    referenceIds: [
      ...sharedReferenceIds,
      "source:drugsfda-nda020516-001",
    ],
    contentStatus: "curated-educational",
  },
] as const;

export const nomenclatureExerciseByTopicId = new Map(
  nomenclatureExercises.map((exercise) => [exercise.topicId, exercise] as const),
);

export const nomenclatureReferenceById = new Map(
  nomenclatureReferences.map((reference) => [reference.id, reference] as const),
);
