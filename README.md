# Dev Molecules

Dev Molecules, ilaç moleküllerini kaynak, kanıt durumu ve eğitim bağlamıyla birlikte keşfetmek için geliştirilen desktop-first bir moleküler öğrenme platformudur. Ürün kabuğu Explore, Learn, Build, Teach ve Discover modlarını tek bir kimlik akışında birleştirir.

## Çalışan dikey dilim

- Explore içinde Universe → cluster → molecule focus geçişi
- PubChem PUG REST kayıtlarından yerel olarak önbelleğe alınmış gerçek 2B ve 3B SDF yapıları
- Universe ölçeğinde hafif 2B canvas önizlemeleri; yalnız focus görünümünde tam etkileşimli viewer
- Ball-and-stick ve space-filling gösterimleri
- Döndürme, kaydırma, yakınlaştırma, ortalama/sıfırlama ve hidrojen görünürlüğü
- Atom hover/seçimi, element etiketi ve 2B/3B geçişi
- Boyuta özgü yapı kaynağı, origin ve review durumu
- Arama, üç kümelenme lensi, klavye gezinmesi, breadcrumb ve kalıcı hash bağlantıları
- Learn, Build, Teach ve private-by-default Discover temel akışları

## Yapı verisi

Seed katalog 10 beta-bloker kimliği içerir; bu sayı şema veya ürün tavanı değildir. Her kayıt için iki kaynak dosyası tutulur:

```text
public/structures/pubchem/cid-{CID}-2d.sdf
public/structures/pubchem/cid-{CID}-3d.sdf
```

Kaynak endpoint:

```text
https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/cid/{CID}/record/SDF?record_type=2d|3d
```

3B kayıtlar PubChem tarafından hesaplanmış conformer'lardır; deneysel bound pose olarak sunulmaz. 2B ve 3B asset kimliği, CID eşleşmesi, atom/bağ blokları ve coordinate dimension testlerle doğrulanır.

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
```

Testler SDF parsing, gerçek fixture bütünlüğü, PubChem provenance, generic structure provider, directional stereo bond rendering, server-rendered ürün kabuğu ve evidence API'nin fail-closed davranışını kapsar.

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
components/molecule-viewer/   SDF tabanlı 2B/3B canvas viewer
lib/domain/                   Kimlik, yapı, evidence ve doğrulama modelleri
lib/data/                     Seed katalog ve yapı provider adapter'ları
lib/structure/                V2000 parser ve element görsel kuralları
public/structures/pubchem/    Kaynaklı yerel SDF assetleri
tests/                        Domain, asset, renderer, SSR ve API kontrolleri
```
