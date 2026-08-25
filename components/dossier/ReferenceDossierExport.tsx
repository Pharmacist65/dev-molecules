"use client";

import { useEffect, useId, useRef } from "react";

import {
  flagshipReferenceExportFilename,
  serializeFlagshipReferenceExport,
} from "@/lib/application/dossier/reference-export";
import type { DossierLocale, DrugDossierRecord } from "@/lib/domain/dossier";

export interface ReferenceDossierExportProps {
  readonly dossier: DrugDossierRecord;
  readonly locale: DossierLocale;
  readonly className?: string;
}

const labels = {
  tr: {
    button: "Referans JSON'unu indir",
    description: "Görüntülenen kaynaklı dosyayı UTF-8 JSON olarak indirir. PDF veya CSV değildir.",
  },
  en: {
    button: "Download reference JSON",
    description: "Downloads the displayed sourced dossier as UTF-8 JSON. This is not a PDF or CSV export.",
  },
} as const;

export function ReferenceDossierExport({
  dossier,
  locale,
  className,
}: ReferenceDossierExportProps) {
  const descriptionId = useId();
  const objectUrlRef = useRef<string | null>(null);

  const revokeCurrentObjectUrl = () => {
    if (!objectUrlRef.current) return;
    URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = null;
  };

  useEffect(() => revokeCurrentObjectUrl, []);

  const download = () => {
    revokeCurrentObjectUrl();
    const serialized = serializeFlagshipReferenceExport(dossier, locale);
    const blob = new Blob([serialized], {
      type: "application/json;charset=utf-8",
    });
    const objectUrl = URL.createObjectURL(blob);
    objectUrlRef.current = objectUrl;

    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = flagshipReferenceExportFilename(dossier, locale);
    anchor.hidden = true;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();

    window.setTimeout(() => {
      if (objectUrlRef.current === objectUrl) revokeCurrentObjectUrl();
    }, 0);
  };

  return (
    <div className={className} data-reference-json-export="true">
      <button type="button" onClick={download} aria-describedby={descriptionId}>
        {labels[locale].button}
      </button>
      <small id={descriptionId}>{labels[locale].description}</small>
    </div>
  );
}
