import type { Metadata } from "next";

import { DevMoleculesApp } from "@/components/platform/DevMoleculesApp";

export const metadata: Metadata = {
  title: "Dev Molecules — Evidence-aware molecular learning",
  description:
    "Explore sourced molecular structures, non-operational synthesis stories, nomenclature and scientific evidence in Turkish or English.",
};

export default function Home() {
  return <DevMoleculesApp />;
}
