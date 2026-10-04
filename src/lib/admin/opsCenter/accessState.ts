/**
 * GET polling and POST actions share one authorization decision. Starting a retry says nothing
 * about authorization; only a validated response may clear a denial. Request order prevents an
 * older in-flight response from overruling a newer authorization decision.
 */
export function createOperationsAccessState() {
  let requestSequence = 0;
  let latestDecisionRequest = 0;
  let denied = false;
  const listeners = new Set<() => void>();

  function decide(requestId: number, nextDenied: boolean) {
    if (requestId < latestDecisionRequest) return;
    latestDecisionRequest = requestId;
    if (denied === nextDenied) return;
    denied = nextDenied;
    for (const listener of listeners) listener();
  }

  return {
    beginRequest: () => ++requestSequence,
    deny: (requestId: number) => decide(requestId, true),
    allow: (requestId: number) => decide(requestId, false),
    getSnapshot: () => denied,
    subscribe: (listener: () => void) => {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
