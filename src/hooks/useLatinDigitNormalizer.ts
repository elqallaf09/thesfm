"use client";

import { useEffect } from "react";
import { normalizeDigits } from "@/lib/locale";

const NON_LATIN_NUMBER_CHARS = /[\u0660-\u0669\u06F0-\u06F9\u066A\u066B\u066C\u061C\u200E\u200F]/;
const NORMALIZED_ATTRIBUTES = ["placeholder", "title", "aria-label", "aria-valuetext", "alt"];
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);

function hasNonLatinNumberChars(value: string) {
  return NON_LATIN_NUMBER_CHARS.test(value);
}

function normalizeString(value: string) {
  return hasNonLatinNumberChars(value) ? normalizeDigits(value) : value;
}

function normalizeTextNode(node: Text) {
  const current = node.nodeValue;
  if (!current || !hasNonLatinNumberChars(current)) return;
  node.nodeValue = normalizeDigits(current);
}

function normalizeFormValue(element: Element) {
  if (!(element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement)) return;
  if (element instanceof HTMLInputElement && element.type === "password") return;

  const next = normalizeString(element.value);
  if (next !== element.value) element.value = next;
}

function normalizeElement(element: Element) {
  if (SKIPPED_TAGS.has(element.tagName)) return;

  for (const attribute of NORMALIZED_ATTRIBUTES) {
    const value = element.getAttribute(attribute);
    if (!value || !hasNonLatinNumberChars(value)) continue;
    element.setAttribute(attribute, normalizeDigits(value));
  }

  normalizeFormValue(element);
}

function normalizeNode(root: Node) {
  if (root.nodeType === Node.TEXT_NODE) {
    normalizeTextNode(root as Text);
    return;
  }

  if (!(root instanceof Element || root instanceof DocumentFragment)) return;

  if (root instanceof Element) {
    if (SKIPPED_TAGS.has(root.tagName)) return;
    normalizeElement(root);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT,
    {
      acceptNode(node) {
        if (node instanceof Element && SKIPPED_TAGS.has(node.tagName)) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    },
  );

  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      normalizeTextNode(current as Text);
    } else if (current instanceof Element) {
      normalizeElement(current);
    }
    current = walker.nextNode();
  }
}

function normalizeInputEvent(event: Event) {
  const target = event.target;
  if (!(target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement)) return;
  if (target instanceof HTMLInputElement && target.type === "password") return;
  if (!hasNonLatinNumberChars(target.value)) return;

  const selectionStart = target.selectionStart;
  const selectionEnd = target.selectionEnd;
  target.value = normalizeDigits(target.value);

  if (selectionStart !== null && selectionEnd !== null) {
    try {
      target.setSelectionRange(selectionStart, selectionEnd);
    } catch {
      // Some input types, such as date, do not support selection ranges.
    }
  }
}

export function useLatinDigitNormalizer() {
  useEffect(() => {
    if (typeof document === "undefined" || !document.body) return;

    normalizeNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          normalizeNode(mutation.target);
          continue;
        }

        if (mutation.type === "attributes") {
          normalizeElement(mutation.target as Element);
          continue;
        }

        mutation.addedNodes.forEach(normalizeNode);
      }
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: NORMALIZED_ATTRIBUTES,
      characterData: true,
      childList: true,
      subtree: true,
    });

    document.addEventListener("input", normalizeInputEvent, true);
    document.addEventListener("change", normalizeInputEvent, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("input", normalizeInputEvent, true);
      document.removeEventListener("change", normalizeInputEvent, true);
    };
  }, []);
}
