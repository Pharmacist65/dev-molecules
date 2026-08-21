import type { Metadata } from "next";

import { DevMoleculesApp } from "@/components/platform/DevMoleculesApp";

export const metadata: Metadata = {
  title: "Dev Molecules — Pharmaceutical Molecular Universe",
  description:
    "İlaç moleküllerini, sentez mantığını, öğrenme görevlerini ve bilimsel kanıtı aynı uzaysal ortamda keşfedin.",
};

export default function Home() {
  return <DevMoleculesApp />;
}
