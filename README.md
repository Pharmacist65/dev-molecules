# Dev Molecules

Dev Molecules is a bilingual, evidence-aware molecular learning environment for exploring drug structures, reading non-operational synthesis narratives, practising nomenclature, and keeping educational conclusions separate from scientific verification.

[Public source repository](https://github.com/Pharmacist65/dev-molecules) · [Access-controlled hosted preview](https://dev-molecules.sedecio.chatgpt.site/) (owner access required)

## What is implemented

The product shell keeps five modes available in one desktop-first experience:

- **Explore** — Universe → cluster → molecule focus navigation over 15 seed records. It uses checked-in PubChem 2D/3D SDF assets, a shared Three.js scene, progressive level of detail, explicit structure provenance, and exact Drugs@FDA product/form anchors.
- **Learn** — two distinct workspaces: **Synthesis Theatre** and **Nomenclature Lab**. The theatre contains three direct-patent-anchored, non-operational stories for propranolol, atenolol, and carvedilol, plus six source-aware challenge types. The lab contains ten addressable topics, ten curated exercises, and six deterministic interaction types.
- **Build** — a guided educational fragment-building exercise. Completion is a learning result, not evidence that a laboratory synthesis is possible.
- **Teach** — device-local progress and review-queue views. Learning progress is kept separate from scientific review status.
- **Discover** — an explicitly experimental, private-by-default evidence workspace. Missing evidence fails closed and never becomes novelty, efficacy, patentability, or synthesizability.

Turkish and English are complete product locales. The language preference is stored in the browser, the document language is updated at runtime, and changing language does not change molecular IDs, evidence states, or Explore topology. See [Localization](docs/LOCALIZATION.md).

The seed count is test data, not a catalog or schema ceiling.

## Scientific boundary

Dev Molecules is educational software, not clinical, laboratory, regulatory, or patent advice.

- A source link does not by itself make an interpretation expert-reviewed or verified.
- `source-supported`, `pending-review`, `predicted`, `conflicting`, and `unknown` remain distinct states.
- The three synthesis stories expose transformation logic and direct source locators, but omit quantities, apparatus, conditions, duration, work-up, yield, and other operational laboratory parameters.
- Draft atom correspondence and educational classifications remain visibly review-gated.
- A missing structure or source produces an explicit unavailable state; the application does not invent atoms, bonds, routes, or claims.
- The current slice does not persist designs or research questions. Any deployment that enables optional external narration must disclose that processing boundary and obtain the required consent before sending a question to the provider.

Read [Scientific governance](docs/SCIENTIFIC_GOVERNANCE.md) and [Synthesis provenance](docs/SYNTHESIS_PROVENANCE.md) before changing scientific content.

## Run locally

Requirement: Node.js `>=22.13.0`.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000/`. Stable Explore hashes include:

```text
http://localhost:3000/#universe
http://localhost:3000/#molecule/propranolol
http://localhost:3000/#cluster/therapeutic/Cardiovascular
```

## Quality gates

Run the same core gates used by CI:

```bash
npm run typecheck
npm run lint
npm run build
node --test tests/*.test.mjs
npx playwright test
npm audit --audit-level=high
npm audit --omit=dev --audit-level=high
git diff --check
```

The GitHub Actions workflow runs the production-dependency audit, type checking, linting, a production build, Node test suites, and Playwright browser acceptance tests on pushes to `main` and pull requests. Tests cover structure parsing and provenance, product/form identity boundaries, deterministic lens projection, bounded level-of-detail policy, the shared scene adapter, TR/EN parity, synthesis provenance and challenge scoring, nomenclature scoring, fail-closed evidence behavior, and real-browser interaction.

## Architecture and project policy

- [Architecture](docs/ARCHITECTURE.md)
- [Roadmap and acceptance gates](docs/ROADMAP.md)
- [Scientific governance](docs/SCIENTIFIC_GOVERNANCE.md)
- [Localization](docs/LOCALIZATION.md)
- [Synthesis provenance](docs/SYNTHESIS_PROVENANCE.md)
- [Security policy](SECURITY.md)
- [Contributing](CONTRIBUTING.md)
- [CI workflow](.github/workflows/quality.yml)
- [Third-party notices](THIRD_PARTY_NOTICES.md)

Key boundaries:

```text
app/                              application entry points and evidence endpoint
components/universe/              Explore navigation and level-of-detail orchestration
components/molecular-scene/       shared Three.js scene port and adapter
components/platform/              five-mode learning and evidence surfaces
lib/domain/                       typed chemistry, evidence, learning, and scoring rules
lib/application/                  deterministic view-model composition
lib/data/                         seed catalogs, source registries, and curricula
lib/i18n/                         typed TR/EN runtime and localized content overlays
lib/structure/                    V2000 parsing and element presentation rules
public/structures/pubchem/        checked-in source SDF assets
tests/                            domain, data, renderer, SSR, and API checks
e2e/                              Playwright production-bundle acceptance tests
```

The deployment configuration targets the Sites/Cloudflare runtime. No persistent database or object store is configured in the current repository slice; catalog, curriculum, and provenance records are checked-in data. The package is marked private for package-manager publication, and no project license has been declared. Review [Third-party notices](THIRD_PARTY_NOTICES.md) before redistribution.

## Türkçe kısa özet

Dev Molecules; ilaç yapılarını kaynak ve inceleme durumlarıyla keşfetmeyi, operasyonel laboratuvar tarifi vermeden sentez mantığını okumayı ve IUPAC adlandırma alıştırmaları yapmayı sağlayan TR/EN bir öğrenme ortamıdır. Explore, Learn, Build, Teach ve Discover modları aynı ürün kabuğunda çalışır. Mevcut 15 molekül, üç sentez hikâyesi ve on adlandırma konusu yalnızca başlangıç içeriğidir; bilimsel doğruluk, kaynak çözümleme ve gizlilik kuralları katalog büyüdükçe de korunmalıdır.
