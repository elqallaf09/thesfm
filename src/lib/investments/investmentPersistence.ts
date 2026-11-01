import { loadSupabaseClient } from '@/integrations/supabase/loadClient';
import { debugInvestments, logInvestmentWriteOperation, mutationErrorMessage, type InvestmentMutationAttempt, type InvestmentMutationResult } from './investmentUtils';

export async function insertInvestmentWithAttempts(attempts: InvestmentMutationAttempt[]) {
  const supabase = await loadSupabaseClient();
  let last: InvestmentMutationResult | null = null;

  for (const attempt of attempts) {
    logInvestmentWriteOperation({
      operation: 'insert',
      source: attempt.source ?? 'add_form',
      payload: attempt.payload,
    });
    const result = await supabase
      .from('investment_items')
      .insert(attempt.payload)
      .select('*')
      .single() as unknown as InvestmentMutationResult;

    if (!result.error && result.data) {
      debugInvestments('saved investment row', {
        attempt: attempt.label,
        keys: Object.keys(attempt.payload),
      });
      return result.data;
    }

    last = result;
    debugInvestments('investment insert attempt failed', {
      attempt: attempt.label,
      message: result.error?.message,
      code: result.error?.code,
      details: result.error?.details,
      hint: result.error?.hint,
      keys: Object.keys(attempt.payload),
    });
  }

  throw new Error(mutationErrorMessage(last));
}
export async function updateInvestmentWithAttempts(id: string, userId: string, attempts: InvestmentMutationAttempt[]) {
  const supabase = await loadSupabaseClient();
  let last: InvestmentMutationResult | null = null;

  for (const attempt of attempts) {
    if (Object.keys(attempt.payload).length === 0) continue;
    logInvestmentWriteOperation({
      operation: 'update',
      source: attempt.source ?? 'edit_form',
      id,
      payload: attempt.payload,
    });
    const result = await supabase
      .from('investment_items')
      .update(attempt.payload)
      .eq('id', id)
      .eq('user_id', userId)
      .select('*')
      .single() as unknown as InvestmentMutationResult;

    if (!result.error && result.data) {
      debugInvestments('saved investment row', {
        attempt: attempt.label,
        id,
        keys: Object.keys(attempt.payload),
      });
      return result.data;
    }

    last = result;
    debugInvestments('investment update attempt failed', {
      attempt: attempt.label,
      id,
      message: result.error?.message,
      code: result.error?.code,
      details: result.error?.details,
      hint: result.error?.hint,
      keys: Object.keys(attempt.payload),
    });
  }

  throw new Error(mutationErrorMessage(last));
}
