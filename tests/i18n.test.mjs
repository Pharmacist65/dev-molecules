import assert from "node:assert/strict";
import test from "node:test";

import { tsImport } from "tsx/esm/api";

const {
  DEFAULT_LOCALE,
  LOCALE_STORAGE_KEY,
  SUPPORTED_LOCALES,
  getBrowserLanguagePreferences,
  parseLocale,
  persistLocale,
  readPersistedLocale,
  resolveLocale,
} = await tsImport("../lib/i18n/locale.ts", import.meta.url);
const { messages } = await tsImport("../lib/i18n/messages.ts", import.meta.url);
const {
  getSynthesisStoryContent,
  synthesisContent,
} = await tsImport("../lib/i18n/synthesis-content.ts", import.meta.url);
const { createTranslator, interpolateMessage, pluralize, translate } = await tsImport(
  "../lib/i18n/core.ts",
  import.meta.url,
);

function messageTokens(value) {
  return [...value.matchAll(/\{([A-Za-z][A-Za-z0-9_]*)\}/gu)]
    .map((match) => match[1])
    .sort();
}

function assertLocalizedShapeParity(enValue, trValue, path = "synthesis") {
  if (typeof enValue === "string") {
    assert.equal(typeof trValue, "string", `${path} must be a string in TR`);
    assert.ok(enValue.trim().length > 0, `${path} must be non-empty in EN`);
    assert.ok(trValue.trim().length > 0, `${path} must be non-empty in TR`);
    return;
  }
  if (Array.isArray(enValue)) {
    assert.ok(Array.isArray(trValue), `${path} must be an array in TR`);
    assert.equal(trValue.length, enValue.length, `${path} array length must match`);
    enValue.forEach((entry, index) => {
      assertLocalizedShapeParity(entry, trValue[index], `${path}[${index}]`);
    });
    return;
  }
  assert.deepEqual(
    Object.keys(trValue).sort(),
    Object.keys(enValue).sort(),
    `${path} object keys must match`,
  );
  for (const key of Object.keys(enValue)) {
    assertLocalizedShapeParity(enValue[key], trValue[key], `${path}.${key}`);
  }
}

test("locale parsing accepts supported BCP 47 variants only", () => {
  assert.deepEqual(SUPPORTED_LOCALES, ["tr", "en"]);
  assert.equal(DEFAULT_LOCALE, "tr");
  assert.equal(parseLocale("tr-TR"), "tr");
  assert.equal(parseLocale("EN_us"), "en");
  assert.equal(parseLocale(" en-GB "), "en");
  assert.equal(parseLocale("de-DE"), null);
  assert.equal(parseLocale(""), null);
  assert.equal(parseLocale(null), null);
});

test("locale resolution prefers persisted choice, then browser language, then Turkish", () => {
  assert.equal(
    resolveLocale({ persistedLocale: "en", browserLanguages: ["tr-TR"] }),
    "en",
  );
  assert.equal(
    resolveLocale({ persistedLocale: "invalid", browserLanguages: ["de-DE", "en-GB"] }),
    "en",
  );
  assert.equal(
    resolveLocale({ persistedLocale: null, browserLanguages: ["de-DE", "fr-FR"] }),
    "tr",
  );
  assert.equal(resolveLocale(), "tr");
});

test("browser language preferences retain order and expose the singular fallback", () => {
  assert.deepEqual(
    getBrowserLanguagePreferences({ languages: ["de-DE", "tr-TR"], language: "en-US" }),
    ["de-DE", "tr-TR"],
  );
  assert.deepEqual(
    getBrowserLanguagePreferences({ languages: [], language: "en-US" }),
    ["en-US"],
  );
  assert.deepEqual(getBrowserLanguagePreferences(null), []);
});

test("device-local locale persistence is isolated and fails safely", () => {
  const values = new Map();
  const storage = {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
  };

  assert.equal(readPersistedLocale(storage), null);
  assert.equal(persistLocale(storage, "en"), true);
  assert.equal(values.get(LOCALE_STORAGE_KEY), "en");
  assert.equal(readPersistedLocale(storage), "en");

  const blockedStorage = {
    getItem() {
      throw new Error("storage unavailable");
    },
    setItem() {
      throw new Error("storage unavailable");
    },
  };
  assert.equal(readPersistedLocale(blockedStorage), null);
  assert.equal(persistLocale(blockedStorage, "tr"), false);
});

test("TR and EN dictionaries have exact, non-empty key and placeholder parity", () => {
  const enKeys = Object.keys(messages.en).sort();
  const trKeys = Object.keys(messages.tr).sort();

  assert.ok(enKeys.length >= 250, "the product dictionary should cover the full shell and modes");
  assert.deepEqual(trKeys, enKeys);

  for (const key of enKeys) {
    assert.equal(typeof messages.en[key], "string", `${key} must exist in EN`);
    assert.equal(typeof messages.tr[key], "string", `${key} must exist in TR`);
    assert.equal(messages.en[key].trim(), messages.en[key], `${key} EN must be trimmed`);
    assert.equal(messages.tr[key].trim(), messages.tr[key], `${key} TR must be trimmed`);
    assert.ok(messages.en[key].length > 0, `${key} EN must not be empty`);
    assert.ok(messages.tr[key].length > 0, `${key} TR must not be empty`);
    assert.deepEqual(
      messageTokens(messages.tr[key]),
      messageTokens(messages.en[key]),
      `${key} must interpolate the same variables in both locales`,
    );
  }
});

test("required Turkish product terminology is explicit and consistent", () => {
  assert.equal(messages.tr["nav.explore"], "Keşfet");
  assert.equal(messages.tr["nav.learn"], "Öğren");
  assert.equal(messages.tr["nav.build"], "Oluştur");
  assert.equal(messages.tr["nav.teach"], "Eğit");
  assert.equal(messages.tr["nav.discover"], "Araştır");
  assert.equal(messages.tr["explore.level.universe"], "Evren");
  assert.equal(messages.tr["explore.level.cluster"], "Küme");
  assert.equal(messages.tr["explore.level.focus"], "Odak");
});

test("Home leads with human copy and keeps source-slice detail in its disclosure", () => {
  assert.equal(
    messages.en["home.description"],
    "Search 1,552 resolved molecular structures, inspect them in 2D and 3D, and continue into chemistry and learning content where curated coverage exists.",
  );
  assert.equal(
    messages.tr["home.description"],
    "1.552 çözümlenmiş moleküler yapıyı ara, 2B ve 3B incele; derinleştirilmiş ilaç kayıtlarında kimya ve öğrenme içeriklerine ilerle.",
  );
  assert.doesNotMatch(messages.en["home.description"], /2,331|DrugCentral|FDA/i);
  assert.doesNotMatch(messages.tr["home.description"], /2\.331|DrugCentral|FDA/i);

  const english = [
    messages.en["home.catalogScopeSummary"],
    messages.en["home.catalogScopeBoundary"],
    messages.en["home.catalogScopeRights"],
    messages.en["shell.searchDialogDescription"],
    messages.en["explore.catalogFallbackBody"],
  ].join(" ");
  const turkish = [
    messages.tr["home.catalogScopeSummary"],
    messages.tr["home.catalogScopeBoundary"],
    messages.tr["home.catalogScopeRights"],
    messages.tr["shell.searchDialogDescription"],
    messages.tr["explore.catalogFallbackBody"],
  ].join(" ");

  assert.match(english, /2,331 rows/);
  assert.match(english, /1,552 records/);
  assert.match(english, /not an FDA product or application universe/i);
  assert.match(turkish, /2\.331 satır/);
  assert.match(turkish, /1\.552 kayıt/);
  assert.match(turkish, /FDA ürün veya başvuru evreni değildir/i);
  assert.doesNotMatch(
    `${english} ${turkish}`,
    /approved small-molecule|onaylı küçük molekül|complete catalog|tam katalog|full catalog|tüm katalog/i,
  );
});

test("translation never falls back to the other language at runtime", () => {
  const tr = createTranslator("tr");
  const en = createTranslator("en");

  assert.equal(tr("nav.explore"), "Keşfet");
  assert.equal(en("nav.explore"), "Explore");
  assert.equal(tr("explore.moleculeCount", { visible: 4, total: 15 }), "15 molekülün 4 kadarı");
  assert.equal(
    en("explore.moleculeCount", { visible: 4, total: 15 }),
    "4 of 15 molecules",
  );
  assert.equal(translate("tr", "runtime.missing.key"), "⟦runtime.missing.key⟧");
});

test("interpolation and plural helpers remain deterministic and visible on bad input", () => {
  assert.equal(interpolateMessage("{name}: {count}", { name: "Atom", count: 2 }), "Atom: 2");
  assert.equal(interpolateMessage("{name}: {missing}", { name: "Atom" }), "Atom: {missing}");
  assert.equal(
    pluralize("en", 1, { one: "{count} molecule", other: "{count} molecules" }),
    "1 molecule",
  );
  assert.equal(
    pluralize("en", 3, { one: "{count} molecule", other: "{count} molecules" }),
    "3 molecules",
  );
});

test("pending synthesis narration is absent in both public locales", () => {
  assert.deepEqual(Object.keys(synthesisContent.en), []);
  assertLocalizedShapeParity(synthesisContent.en, synthesisContent.tr);
  assert.equal(getSynthesisStoryContent("tr", "synthesis:unknown"), null);
});
