import type { Metadata } from "next";

import { DevMoleculesApp } from "@/components/platform/DevMoleculesApp";

export const metadata: Metadata = {
  title: "Molevren — Pharmaceutical Molecular Atlas & Academy",
  description:
    "Explore medicines from structure to effect in a bilingual pharmaceutical molecular atlas and academy.",
};

export default function Home() {
  return <DevMoleculesApp />;
}
