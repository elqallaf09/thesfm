"use client";

import { useEffect } from "react";
import { normalizeDigits } from "@/lib/locale";

const NON_LATIN_NUMBER_CHARS = /[\u0660-\u0669\u06F0-\u06F9\u066A\u066B\u066C\u061C\u200E\u200F]/;
const NORMALIZED_ATTRIBUTES = ["placeholder", "title", "aria-label", "aria-valuetext", "alt"];
const SKIPPED_TAGS = new Set(["SCRIPT", "STYLE", "NOSCRIPT", "TEMPLATE"]);
const MAX_NODES_PER_SLICE = 80;

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

    const queuedNodes: Node[] = [];
    const queuedSet = new WeakSet<Node>();
    let queueIndex = 0;
    let idleHandle: number | null = null;
    let timeoutHandle: number | null = null;
    let stopped = false;

    const schedule = () => {
      if (stopped || idleHandle !== null || timeoutHandle !== null || queueIndex >= queuedNodes.length) return;
      if (typeof window.requestIdleCallback === "function") {
        idleHandle = window.requestIdleCallback(processQueue, { timeout: 1000 });
        return;
      }
      timeoutHandle = window.setTimeout(() => processQueue(), 16);
    };

    const enqueueNode = (node: Node) => {
      if (node instanceof Element && SKIPPED_TAGS.has(node.tagName)) return;
      if (queuedSet.has(node)) return;
      queuedSet.add(node);
      queuedNodes.push(node);
      schedule();
    };

    function processQueue(deadline?: IdleDeadline) {
      idleHandle = null;
      timeoutHandle = null;
      let processed = 0;
      while (queueIndex < queuedNodes.length && processed < MAX_NODES_PER_SLICE) {
        if (processed >= 8 && deadline && deadline.timeRemaining() <= 1) break;
        const node = queuedNodes[queueIndex++];
        queuedSet.delete(node);
        processed += 1;

        if (node.nodeType === Node.TEXT_NODE) {
          normalizeTextNode(node as Text);
          continue;
        }
        if (!(node instanceof Element || node instanceof DocumentFragment)) continue;
        if (node instanceof Element) normalizeElement(node);
        node.childNodes.forEach(enqueueNode);
      }

      if (queueIndex > 256 && queueIndex * 2 > queuedNodes.length) {
        queuedNodes.splice(0, queueIndex);
        queueIndex = 0;
      }
      schedule();
    }

    // The landing and AI workspaces contain large DOM trees. Normalize them in
    // bounded idle slices so hydration never inherits one full-document task.
    enqueueNode(document.body);

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === "characterData") {
          enqueueNode(mutation.target);
          continue;
        }

        if (mutation.type === "attributes") {
          enqueueNode(mutation.target);
          continue;
        }

        mutation.addedNodes.forEach(enqueueNode);
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
      stopped = true;
      if (idleHandle !== null) window.cancelIdleCallback(idleHandle);
      if (timeoutHandle !== null) window.clearTimeout(timeoutHandle);
      observer.disconnect();
      document.removeEventListener("input", normalizeInputEvent, true);
      document.removeEventListener("change", normalizeInputEvent, true);
    };
  }, []);
}
