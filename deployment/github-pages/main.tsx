import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "@/styles/molevren-fonts.css";
import "@/app/globals.css";
import { DevMoleculesApp } from "@/components/platform/DevMoleculesApp";

import "./pages.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("GitHub Pages application root is missing.");
}

createRoot(rootElement).render(
  <StrictMode>
    <DevMoleculesApp />
  </StrictMode>,
);
