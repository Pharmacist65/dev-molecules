# Dev Molecules — Localization

## Supported locales

Dev Molecules currently ships two complete product locales:

- `tr` — Turkish, the deterministic fallback;
- `en` — English.

Locale is a closed TypeScript union in `lib/i18n/locale.ts`. Adding a locale is a code and content change that must pass the same parity and browser gates as TR/EN.

## Runtime resolution

The client resolves language in this order:

1. a valid preference stored under `dev-molecules:locale`;
2. the first supported value in the browser language list;
3. Turkish.

Region and script subtags are reduced to the supported primary language, so `tr-TR` resolves to `tr` and `en-GB` resolves to `en`. Unsupported or inaccessible storage fails safely.

`I18nProvider` owns the active locale, persists an explicit switch, and updates `document.documentElement.lang`. Components consume `useI18n()` for typed messages, named-token interpolation, locale-aware plurals, and number formatting.

## Message architecture

`lib/i18n/messages.ts` defines the English map first. Its keys become the `TranslationKey` union; the Turkish dictionary must satisfy the same `MessageDictionary` type. Runtime lookup never falls back to the other language. A missing integration remains visible as a bracketed key marker rather than silently mixing languages or dropping context.

Named placeholders use `{token}` syntax. The i18n test suite requires:

- exact TR/EN key parity;
- non-empty values;
- exact placeholder parity per key;
- deterministic interpolation and plural behavior;
- explicit required scientific terminology in Turkish;
- no cross-language runtime fallback.

## Scientific content and localization

Localization is a presentation layer, not a scientific-data mutation.

The following values stay stable across locales:

- molecule, material, story, step, source, claim, and exercise IDs;
- SMILES, SDF data, formulae, InChIKeys, PubChem CIDs, and regulatory identifiers;
- evidence and review enums;
- route and challenge types;
- canonical classification inputs and Explore projection coordinates;
- answer option IDs and scoring invariants.

The following content is localized:

- navigation, controls, accessibility labels, loading/error states, and evidence boundaries;
- Explore summaries and the display labels for canonical classification values;
- Synthesis Atlas route, source-scope, material, transformation, mechanism, limitation, and safety narration;
- Atlas challenge prompts, options, and feedback;
- Nomenclature Academy sections, prompts, hints, options, explanations, violated rules, solution steps, and source labels;
- Build, Teach, and Discover instructional copy.

Legacy synthesis-story localization lives in a stable-ID overlay in `lib/i18n/synthesis-content.ts`. Synthesis Atlas, Nomenclature Academy, and challenge records use paired `{ tr, en }` educational text while pure evaluators consume canonical IDs. Catalog identities, source paths, and search tokens remain canonical rather than translated.

Changing language must not move a molecule, change a source, promote a verification state, change a challenge answer, or alter the scientific subject.

## Adding or changing copy

1. Add or update the English key in `lib/i18n/messages.ts`.
2. Add the Turkish value with the same placeholders.
3. Use a stable domain ID for scientific content; do not use translated text as a lookup key.
4. For legacy synthesis content, update both localized trees without changing source/data identifiers.
5. For Atlas, Academy, or challenge content, update both values in the paired localized record.
6. Keep formulas, identifiers, provenance, review states, and scoring outside component prose.
7. Test both locales and inspect the rendered page at the target viewport sizes.

Do not concatenate grammar-sensitive fragments when a full sentence can be translated as one key. Scientific abbreviations and symbols may remain identical only when that is intentional in both languages.

## Quality gate

Run:

```bash
npm run typecheck
node --test tests/i18n.test.mjs tests/nomenclature-academy.test.mjs tests/synthesis-atlas.test.mjs
npm run build
npx playwright test
```

Manual browser review must verify:

- the language switch changes all visible interface and accessibility copy in the active journey;
- `<html lang>` matches the selected locale;
- the preference survives reload;
- source URLs, IDs, formulas, and evidence states remain semantically unchanged;
- no Turkish prose appears in the English journey and no English prose appears in the Turkish journey, except proper nouns, source titles, standardized chemical terminology, or deliberately untranslated identifiers;
- text expansion does not obscure the molecular scene, reaction scheme, feedback, or source locator.

The current locale preference is device-local. It is not synchronized to an account because the repository has no account or persistence backend.
