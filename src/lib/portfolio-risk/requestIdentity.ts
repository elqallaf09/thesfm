/** Never expose a result from another owner or an earlier credential generation. */
export function sameRiskRequestIdentity(
  state: { owner: string; token?: string }, owner: string, token?: string,
): boolean {
  return Boolean(owner) && state.owner === owner && state.token === token;
}
