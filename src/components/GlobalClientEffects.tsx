"use client";

import { useZoerIframe } from "@/hooks/useZoerIframe";
import { useLatinDigitNormalizer } from "@/hooks/useLatinDigitNormalizer";

export default function GlobalClientEffects() {
  useZoerIframe();
  useLatinDigitNormalizer();
  return null;
}

