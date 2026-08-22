import { createLocalEvidenceCard } from "@/lib/application/evidence-card";
import { parseLocale } from "@/lib/i18n";

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

  // Only deterministic, source-resolved application data crosses this API
  // boundary. Model-written scientific prose stays disabled until each
  // displayed claim can be bound to a reviewed source and citation.
  return Response.json(localCard, {
    headers: { "x-dev-molecules-mode": "curated-fallback" },
  });
}
