export type SmilesNotationLocale = "tr" | "en";

export const OPENSMILES_SPECIFICATION_URL =
  "https://opensmiles.org/opensmiles.html" as const;
export const DAYLIGHT_SMILES_ISOMERISM_URL =
  "https://daylight.com/meetings/summerschool98/course/dave/smiles-isomers.html" as const;
export const OPENSMILES_EQUIVALENT_TETRAHEDRAL_EXAMPLES = [
  "N[C@](Br)(O)C",
  "C[C@@](Br)(O)N",
] as const;

export interface SmilesNotationPresentation {
  readonly hasIsomericSmiles: boolean;
  readonly hasAtomStereo: boolean;
  readonly hasDirectionalBondMarkers: boolean;
  readonly equivalentTetrahedralExamples: typeof OPENSMILES_EQUIVALENT_TETRAHEDRAL_EXAMPLES;
  readonly copy: (typeof copyByLocale)[SmilesNotationLocale];
}

const copyByLocale = {
  tr: {
    guideEyebrow: "Kimyasal yapı dili",
    guideTitle: "SMILES nedir?",
    definition:
      "SMILES (Simplified Molecular Input Line Entry System), bir molekülün atom-bağ düzenini tek satırda ifade eden kimyasal yapı gösterimidir. Molekül adı değildir; dallanmalar, halkalar, yükler ve gerektiğinde stereokimya metin işaretleriyle kodlanır.",
    canonical: "Bağlantı SMILES'i",
    canonicalMeaning:
      "Bu alan kaynağın atom bağlantılarını ifade eden SMILES dizisini taşır. Aynı yapı birden fazla geçerli SMILES ile yazılabilir; “kanonik” seçim kullanıldığı yazılım ve sürüme bağlıdır.",
    isomeric: "İzomerik SMILES",
    isomericMeaning:
      "Bağlantıya ek olarak kaynakta belirtilmiş stereokimya ve izotop bilgisini taşıyabilir. İzomerik bir dizi, bütün stereokimyasal özelliklerin eksiksiz atandığını tek başına garanti etmez.",
    statusAtomAndBond: "Kaynak gösteriminde atom stereokimyası ve yönlü bağ işaretleri var",
    statusAtom: "Kaynak gösteriminde atom stereokimyası işaretleri var",
    statusBond: "Kaynak gösteriminde yönlü bağ işaretleri var",
    statusPresent: "Kaynakta izomerik SMILES var",
    statusMissing: "Kaynakta ayrı bir izomerik SMILES yok",
    stereoQuestion: "@ = R, @@ = S mi?",
    stereoAnswer:
      "Hayır. @ ve @@, ilgili atomun stereokimya sınıfına ve o SMILES'in dolaşım sırasına göre tanımlanan iki zıt yerel düzen işaretidir; sabit R/S etiketleri değildir.",
    atMeaning:
      "SMILES dolaşımının ve atomun stereokimya sınıfının belirlediği yerel düzenlerden biri.",
    atAtMeaning:
      "Aynı dolaşım ve stereokimya sınıfında bunun karşıtı olan yerel düzen.",
    tetrahedralContext:
      "Yaygın tetrahedral durumda, SMILES dolaşımının belirlediği referans komşudan merkeze bakıldığında @ saat yönünün tersini, @@ saat yönünü gösterir. Tetrahedral dışı sınıflarda ayrıntılı yorum sınıfa göre değişir.",
    absoluteConfiguration:
      "R/S ise tüm yapıya Cahn–Ingold–Prelog (CIP) öncelik kuralları uygulanarak belirlenen mutlak konfigürasyondur. Atomların veya dalların yazım sırası değişirse aynı stereozomerde @ ile @@ yer değiştirebilir.",
    exampleSummary: "Aynı konfigürasyonda işaret neden değişebilir?",
    exampleIntro:
      "OpenSMILES'taki şu iki geçerli tetrahedral örnek aynı stereomerkezi gösterir:",
    exampleConclusion:
      "Atomların yazım sırası değiştiği için işaret değişmiştir; moleküler konfigürasyon değişmemiştir.",
    bondStereo:
      "/ ve \\ SMILES'te yönlü bağ işaretleridir. Uygun bir çift bağın iki tarafında birlikte değerlendirildiklerinde göreli geometriyi kodlarlar; tek başlarına doğrudan E veya Z etiketi değildirler.",
    notationSources: "Notasyon kaynakları",
    openSmilesSource: "OpenSMILES spesifikasyonu",
    daylightSource: "Daylight SMILES stereokimya rehberi",
    openNotation: "Bu kaydın SMILES gösterimlerini gör",
    notationGroup: "Bu kaydın SMILES gösterimleri",
    missing:
      "Kaynak bu kayıt için ayrı bir izomerik SMILES sunmuyor. Bu durum tek başına molekülün akiral olduğunu veya stereokimyanın bulunmadığını göstermez.",
    copyCanonical: "Bağlantı SMILES'ini kopyala",
    copyIsomeric: "İzomerik SMILES'i kopyala",
    copyButton: "Kopyala",
    copiedCanonical: "Bağlantı SMILES'i kopyalandı.",
    copiedIsomeric: "İzomerik SMILES kopyalandı.",
    copyFailed: "Kopyalanamadı. Diziyi seçerek elle kopyalayabilirsiniz.",
  },
  en: {
    guideEyebrow: "Chemical structure language",
    guideTitle: "What is SMILES?",
    definition:
      "SMILES (Simplified Molecular Input Line Entry System) is a one-line chemical structure notation for a molecule's atom-and-bond arrangement. It is not a molecule name; branches, rings, charges and, where specified, stereochemistry are encoded with text symbols.",
    canonical: "Connectivity SMILES",
    canonicalMeaning:
      "This field carries the source's SMILES representation of atom connectivity. The same structure can have multiple valid SMILES; a “canonical” choice depends on the software and version used.",
    isomeric: "Isomeric SMILES",
    isomericMeaning:
      "Can additionally carry source-specified stereochemistry and isotope information. An isomeric string does not by itself guarantee that every stereochemical feature has been specified.",
    statusAtomAndBond: "The source notation contains atom-stereo and directional-bond markers",
    statusAtom: "The source notation contains atom-stereo markers",
    statusBond: "The source notation contains directional-bond markers",
    statusPresent: "The source provides an isomeric SMILES",
    statusMissing: "The source does not provide a separate isomeric SMILES",
    stereoQuestion: "Does @ mean R and @@ mean S?",
    stereoAnswer:
      "No. @ and @@ are two opposite local-order markers defined by the atom's stereochemical class and the traversal order of that SMILES; they are not fixed R/S labels.",
    atMeaning:
      "One local ordering defined by the SMILES traversal and the atom's stereochemical class.",
    atAtMeaning:
      "The opposite local ordering for the same traversal and stereochemical class.",
    tetrahedralContext:
      "In the common tetrahedral case, viewed toward the centre from the reference neighbour set by the SMILES traversal, @ is anticlockwise and @@ is clockwise. Detailed interpretation depends on the class for non-tetrahedral stereochemistry.",
    absoluteConfiguration:
      "R/S is an absolute configuration assigned from the full structure using Cahn–Ingold–Prelog (CIP) priority rules. Reordering atoms or branches can change @ to @@ without changing the stereoisomer.",
    exampleSummary: "Why can the marker change for the same configuration?",
    exampleIntro:
      "These two valid tetrahedral examples in OpenSMILES describe the same stereocentre:",
    exampleConclusion:
      "The atom order changed, so the marker changed; the molecular configuration did not.",
    bondStereo:
      "/ and \\ are directional-bond markers in SMILES. When interpreted together on the two sides of a suitable double bond they encode relative geometry; neither marker alone is a direct E or Z label.",
    notationSources: "Notation sources",
    openSmilesSource: "OpenSMILES specification",
    daylightSource: "Daylight SMILES stereochemistry guide",
    openNotation: "View this record's SMILES representations",
    notationGroup: "This record's SMILES representations",
    missing:
      "The source does not provide a separate isomeric SMILES for this record. That alone does not establish that the molecule is achiral or has no stereochemistry.",
    copyCanonical: "Copy the connectivity SMILES",
    copyIsomeric: "Copy the isomeric SMILES",
    copyButton: "Copy",
    copiedCanonical: "Connectivity SMILES copied.",
    copiedIsomeric: "Isomeric SMILES copied.",
    copyFailed: "Could not copy. Select the string to copy it manually.",
  },
} as const;

export function createSmilesNotationPresentation({
  canonicalSmiles,
  isomericSmiles,
  locale,
}: {
  readonly canonicalSmiles: string;
  readonly isomericSmiles: string | null;
  readonly locale: SmilesNotationLocale;
}): SmilesNotationPresentation {
  const hasIsomericSmiles = isomericSmiles !== null && isomericSmiles.length > 0;
  const values = isomericSmiles !== null && isomericSmiles.length > 0
    ? [canonicalSmiles, isomericSmiles]
    : [canonicalSmiles];

  return {
    hasIsomericSmiles,
    hasAtomStereo: values.some((value) => value.includes("@")),
    hasDirectionalBondMarkers: values.some(
      (value) => value.includes("/") || value.includes("\\"),
    ),
    equivalentTetrahedralExamples: OPENSMILES_EQUIVALENT_TETRAHEDRAL_EXAMPLES,
    copy: copyByLocale[locale],
  };
}
