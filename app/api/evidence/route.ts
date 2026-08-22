import { createLocalEvidenceCard } from "@/lib/application/evidence-card";
import { parseLocale } from "@/lib/i18n";

const responseSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    summary: { type: "string" },
    findingExplanations: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          label: { type: "string" },
          explanation: { type: "string" },
          sourceIds: { type: "array", items: { type: "string" } },
        },
        required: ["label", "explanation", "sourceIds"],
      },
    },
    limitations: { type: "array", items: { type: "string" } },
  },
  required: ["summary", "findingExplanations", "limitations"],
} as const;

interface OrchestratedOutput {
  readonly summary: string;
  readonly findingExplanations: readonly {
    readonly label: string;
    readonly explanation: string;
    readonly sourceIds: readonly string[];
  }[];
  readonly limitations: readonly string[];
}

type SupportedLocale = "tr" | "en";

const apiErrors: Record<SupportedLocale, {
  readonly invalidBody: string;
  readonly missingFields: string;
  readonly moleculeNotFound: string;
}> = {
  tr: {
    invalidBody: "Geçersiz istek gövdesi.",
    missingFields: "moleculeId ve question alanları gereklidir.",
    moleculeNotFound: "Molekül kaydı bulunamadı.",
  },
  en: {
    invalidBody: "Invalid request body.",
    missingFields: "moleculeId and question are required.",
    moleculeNotFound: "Molecule record not found.",
  },
};

function resolveRequestLocale(request: Request, explicitLocale?: string): SupportedLocale {
  const acceptedLocale = request.headers
    .get("accept-language")
    ?.split(",", 1)[0]
    ?.split(";", 1)[0]
    ?.trim();
  return parseLocale(explicitLocale) ?? parseLocale(acceptedLocale) ?? "tr";
}

function extractOutputText(payload: unknown): string | null {
  if (!payload || typeof payload !== "object" || !("output" in payload)) return null;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object" || !("content" in item)) continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (
        part &&
        typeof part === "object" &&
        (part as { type?: unknown }).type === "output_text" &&
        typeof (part as { text?: unknown }).text === "string"
      ) {
        return (part as { text: string }).text;
      }
    }
  }
  return null;
}

function isSafeOrchestratedOutput(
  value: unknown,
  allowedSourceIds: ReadonlySet<string>,
): value is OrchestratedOutput {
  if (!value || typeof value !== "object") return false;
  const candidate = value as Partial<OrchestratedOutput>;
  if (
    typeof candidate.summary !== "string" ||
    !Array.isArray(candidate.findingExplanations) ||
    !Array.isArray(candidate.limitations)
  ) return false;

  return candidate.findingExplanations.every((finding) =>
    finding &&
    typeof finding.label === "string" &&
    typeof finding.explanation === "string" &&
    Array.isArray(finding.sourceIds) &&
    finding.sourceIds.every(
      (sourceId: unknown) =>
        typeof sourceId === "string" && allowedSourceIds.has(sourceId),
    ),
  );
}

export async function POST(request: Request) {
  let body: { moleculeId?: string; question?: string; locale?: string };
  try {
    body = (await request.json()) as { moleculeId?: string; question?: string; locale?: string };
  } catch {
    const locale = resolveRequestLocale(request);
    return Response.json({ error: apiErrors[locale].invalidBody }, { status: 400 });
  }

  const moleculeId = body.moleculeId?.trim();
  const question = body.question?.trim().slice(0, 800);
  const locale = resolveRequestLocale(request, body.locale);
  if (!moleculeId || !question) {
    return Response.json(
      { error: apiErrors[locale].missingFields },
      { status: 400 },
    );
  }

  const localCard = createLocalEvidenceCard(moleculeId, question, locale);
  if (!localCard) {
    return Response.json({ error: apiErrors[locale].moleculeNotFound }, { status: 404 });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const evidenceApiToken = process.env.EVIDENCE_API_TOKEN;
  const aiNarrationEnabled =
    process.env.ENABLE_OPENAI_EVIDENCE === "true" &&
    Boolean(apiKey) &&
    Boolean(evidenceApiToken) &&
    request.headers.get("authorization") === `Bearer ${evidenceApiToken}`;
  if (!aiNarrationEnabled || !apiKey) {
    return Response.json(localCard, {
      headers: { "x-dev-molecules-mode": "curated-fallback" },
    });
  }

  try {
    const groundedContext = {
      molecule: {
        id: localCard.moleculeId,
        name: localCard.moleculeName,
        structuralStatus: localCard.structuralStatus,
        identityStatus: localCard.identityStatus,
        synthesisStatus: localCard.synthesisStatus,
        biologicalStatus: localCard.biologicalStatus,
      },
      findings: localCard.findings,
      sources: localCard.sources,
      fixedLimitations: localCard.limitations,
    };

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_MODEL ?? "gpt-5.4",
        store: false,
        instructions:
          "You are the Dev Molecules evidence narrator. Use only the supplied curated context. " +
          "Never infer novelty, patentability, safety, efficacy or synthesizability. " +
          "Missing evidence must remain unknown. Every explanation may cite only supplied sourceIds. " +
          `Write every user-facing field in ${locale === "tr" ? "Turkish" : "English"}.`,
        input: `User question: ${question}\n\nCurated context:\n${JSON.stringify(groundedContext)}`,
        text: {
          format: {
            type: "json_schema",
            name: "dev_molecules_evidence_narration",
            strict: true,
            schema: responseSchema,
          },
        },
      }),
    });

    if (!response.ok) throw new Error(`OpenAI response ${response.status}`);
    const payload = (await response.json()) as unknown;
    const outputText = extractOutputText(payload);
    if (!outputText) throw new Error("Structured output missing");

    const orchestrated = JSON.parse(outputText) as unknown;
    const allowedSourceIds = new Set(localCard.sources.map((source) => source.id));
    if (!isSafeOrchestratedOutput(orchestrated, allowedSourceIds)) {
      throw new Error("Evidence output failed citation validation");
    }

    return Response.json({
      ...localCard,
      mode: "openai-orchestrated",
      summary: orchestrated.summary,
      limitations: Array.from(
        new Set([...localCard.limitations, ...orchestrated.limitations]),
      ),
    });
  } catch {
    return Response.json(localCard, {
      headers: { "x-dev-molecules-mode": "curated-fallback" },
    });
  }
}
