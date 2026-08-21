# Dev Molecules

Dev Molecules, ilaç moleküllerini kaynak, kanıt durumu ve eğitim bağlamıyla birlikte keşfetmek için geliştirilen desktop-first bir moleküler öğrenme platformudur. Ürün kabuğu Explore, Learn, Build, Teach ve Discover modlarını tek bir kimlik akışında birleştirir.

## Çalışan dikey dilim

- Explore içinde Universe → cluster → molecule focus geçişi
- PubChem PUG REST kayıtlarından yerel olarak önbelleğe alınmış gerçek 2B ve 3B SDF yapıları
- Universe, cluster ve molecule focus boyunca tek ortak Three.js/WebGL sahnesi
- Uzak Universe seviyesinde yapı indirmeyen cluster glyph LOD; yakında gerçek SDF koordinatlı düşük ayrıntılı 3B yapılar
- Cluster seviyesinde aynı sahnede seçilebilir gerçek 3B moleküller; focus seviyesinde yüksek ayrıntılı tek yapı
- Tek aktif WebGL context, element/bağ bazlı instancing, demand-driven render ve 40 kayıtla sınırlı lazy structure cache
- Ball-and-stick ve space-filling gösterimleri
- Döndürme, kaydırma, yakınlaştırma, ortalama/sıfırlama ve hidrojen görünürlüğü
- Mouse/touch pan, wheel/pinch zoom ve kamera durumunu koruyan dış kontroller
- Atom hover/seçimi, element etiketi ve 2B/3B geçişi
- Boyuta özgü yapı kaynağı, origin ve review durumu
- Arama, üç kümelenme lensi, klavye gezinmesi, breadcrumb ve kalıcı hash bağlantıları
- Learn, Build, Teach ve private-by-default Discover temel akışları

## Yapı verisi

Seed katalog 10 beta-bloker ve kimyasal/terapötik olarak farklı 5 NSAID olmak üzere 15 küçük molekül kimliği içerir. Bu sayı şema veya ürün tavanı değildir ve bütün onaylı ilaçların yüklendiği anlamına gelmez. Her kayıt, exact Drugs@FDA `application_number + product_number + ORIG/1/AP` kanıtına sahiptir; onay bağlantısı PubChem parent CID'sine değil, katalogdaki açık kimyasal forma bağlanır. Örneğin propranolol kaydı `form:propranolol:hydrochloride`, diclofenac kaydı `form:diclofenac:sodium` üzerinden ürün kanıtına bağlanır.

Regülasyon snapshot'ları Drugs@FDA'nın 2026-08-20 veri sürümünden 2026-08-21 tarihinde doğrulandı. Her kayıtta insan tarafından okunabilir application URL'si, exact API sorgusu, product/form ilişkisi, action tarihi, review kapsamı ve yeniden üretilebilir normalize SHA-256 özeti saklanır. Action tarihi seçilen product application'ın ORIG/1/AP tarihidir; etkin maddenin ilk tarihsel onayı olarak sunulmaz.

Her katalog kimliği için iki kaynak yapı dosyası tutulur:

```text
public/structures/pubchem/cid-{CID}-2d.sdf
public/structures/pubchem/cid-{CID}-3d.sdf
```

Kaynak endpoint:

```text
https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/record/SDF?record_type=2d|3d
```

3B kayıtlar PubChem tarafından hesaplanmış conformer'lardır; deneysel kristal veya protein-bound pose olarak sunulmaz. 2B ve 3B asset kimliği, CID eşleşmesi, atom/bağ blokları, molekül formülü, InChIKey ve coordinate dimension testlerle doğrulanır. Kimlik/yapı doğrulaması ile tedavi alanı, hedef ve scaffold eğitim sınıflamalarının review durumu birbirinden ayrıdır; sınıflandırmalar bu dilimde `pending-review` olarak görünür.

Runtime sahne yükleyicisi 3B dimension'ı her kaynakta zorunlu tutar. PubChem CID beklentisi sağlandığında response içindeki CID de kesin eşleşmelidir; PubChem dışı private/experimental 3B SDF kayıtları source-agnostic kimlik sözleşmesiyle desteklenir. Hatalı veya 2B kayıt 3B geometriye dönüşmez; kısmi yüklemede başarılı yapılar korunur ve başarısız kimlikler açıkça listelenir.

Explore lensleri sürümlü ve deterministiktir. Tedavi alanı ile hedef lensleri kategorik yerleşimdir; scaffold lensi kürate edilmiş iskelet ailesini gösterir. Bu koordinatlar fiziksel mesafe, docking sonucu, fingerprint/Tanimoto benzerliği veya klinik yakınlık iddiası değildir.

## Çalıştırma

Gereksinim: Node.js `>=22.13.0`.

```bash
npm install
npm run dev
```

Uygulama: `http://localhost:3000/`

Kalıcı Explore bağlantıları:

```text
http://localhost:3000/#universe
http://localhost:3000/#molecule/propranolol
http://localhost:3000/#cluster/scaffold/{encoded-cluster-name}
```

## Kalite kapıları

```bash
npm run typecheck
npm run lint
npm run build
node --test tests/*.test.mjs
npx playwright test
```

Testler SDF parsing, gerçek fixture bütünlüğü, PubChem provenance, Drugs@FDA product/form approval bağlantıları ve snapshot hash'leri, generic katalog/provider, sürümlü lens projeksiyonu, 500 metadata kayıtlı LOD/cache planı, WebGL scene adapter sözleşmesi, directional stereo bond rendering, server-rendered ürün kabuğu, evidence API'nin fail-closed davranışı ve gerçek tarayıcı Explore akışını kapsar. E2E ölçümü idle rAF cadence'i ile gerçek drag/wheel etkileşim cadence'ini ayrı raporlar; bunlar GPU benchmark iddiası değildir.

## Mimari sınırlar

- React bileşenleri kimya, evidence veya verification kararı üretmez.
- Yapı bulunamadığında sahte atom ya da rastgele bağ üretilmez.
- Kimlik doğrulaması ile eğitim sınıflamasının review durumu ayrı gösterilir.
- `not found`, yenilik, patentlenebilirlik veya sentezlenebilirlik sonucu değildir.
- Kullanıcı tasarımları varsayılan olarak özeldir.
- AI çıktısı typed, citation-checked ve fail-closed olmadan bilimsel iddia olarak yayınlanamaz.
- Repo içine secret, signing key veya doldurulmuş `.env` eklenmez.

Ayrıntılar:

- [Mimari](docs/ARCHITECTURE.md)
- [Yol haritası ve kabul kapıları](docs/ROADMAP.md)

## Başlıca dizinler

```text
components/universe/          Explore seviye ve LOD deneyimi
components/molecular-scene/   Tek context'li Three.js sahne portu ve adaptörü
components/molecule-viewer/   SDF tabanlı 2B/3B canvas viewer
lib/domain/                   Kimlik, yapı, evidence ve doğrulama modelleri
lib/data/                     Seed katalog ve yapı provider adapter'ları
lib/data/regulatory-approvals.ts Exact Drugs@FDA product/form kanıtları
lib/structure/                V2000 parser ve element görsel kuralları
public/structures/pubchem/    Kaynaklı yerel SDF assetleri
tests/                        Domain, asset, renderer, SSR ve API kontrolleri
e2e/                          Playwright üretim-bundle kabul testleri
```
