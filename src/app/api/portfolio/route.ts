import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { computeZakat, type FinancialProfile } from '@/lib/wakeel';

export const runtime = 'nodejs';

async function getUserId(req: NextRequest): Promise<string | null> {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data.user?.id) return data.user.id;
  } catch (error) {
    if (process.env.NODE_ENV === 'production') {
      console.warn('[portfolio] Supabase auth lookup failed', error);
    }
  }

  if (process.env.NODE_ENV === 'production') return null;
  return req.headers.get('x-user-id');
}

async function loadProfileFromDB(_userId: string): Promise<FinancialProfile | null> {
  return null;
}

function emptyProfile(): FinancialProfile {
  return {
    currency: 'KWD',
    cash: 0,
    investments: 0,
    gold: 0,
    receivables: 0,
    liabilities: 0,
    nisab: 0,
  };
}

export async function GET(req: NextRequest) {
  const userId = await getUserId(req);
  if (!userId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const profile = (await loadProfileFromDB(userId)) ?? emptyProfile();
  return NextResponse.json(computeZakat(profile), {
    headers: { 'Cache-Control': 'private, no-store' },
  });
}
