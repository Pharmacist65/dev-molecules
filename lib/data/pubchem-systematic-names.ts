/**
 * Names are copied from the checked-in PubChem 2D SDF
 * `PUBCHEM_IUPAC_NAME` fields. CID remains the identity join key.
 */
export const pubChemSystematicNameByCid: Readonly<Record<number, string>> = {
  1978: "N-[3-acetyl-4-[2-hydroxy-3-(propan-2-ylamino)propoxy]phenyl]butanamide",
  2244: "2-acetyloxybenzoic acid",
  2249: "2-[4-[2-hydroxy-3-(propan-2-ylamino)propoxy]phenyl]acetamide",
  2405: "1-(propan-2-ylamino)-3-[4-(2-propan-2-yloxyethoxymethyl)phenoxy]propan-2-ol",
  2585: "1-(9H-carbazol-4-yloxy)-3-[2-(2-methoxyphenoxy)ethylamino]propan-2-ol",
  2662: "4-[5-(4-methylphenyl)-3-(trifluoromethyl)pyrazol-1-yl]benzenesulfonamide",
  3033: "2-[2-(2,6-dichloroanilino)phenyl]acetic acid",
  3672: "2-[4-(2-methylpropyl)phenyl]propanoic acid",
  3869: "2-hydroxy-5-[1-hydroxy-2-(4-phenylbutan-2-ylamino)ethyl]benzamide",
  4171: "1-[4-(2-methoxyethyl)phenoxy]-3-(propan-2-ylamino)propan-2-ol",
  4946: "1-naphthalen-1-yloxy-3-(propan-2-ylamino)propan-2-ol",
  33624: "(2S)-1-(tert-butylamino)-3-[(4-morpholin-4-yl-1,2,5-thiadiazol-3-yl)oxy]propan-2-ol",
  39147: "(2R,3S)-5-[3-(tert-butylamino)-2-hydroxypropoxy]-1,2,3,4-tetrahydronaphthalene-2,3-diol",
  71301: "1-(6-fluoro-3,4-dihydro-2H-chromen-2-yl)-2-[[2-(6-fluoro-3,4-dihydro-2H-chromen-2-yl)-2-hydroxyethyl]amino]ethanol",
  156391: "(2S)-2-(6-methoxynaphthalen-2-yl)propanoic acid",
};
