import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const TRAINING_CAMP_API = process.env.TRAINING_CAMP_API || 'https://training-camp-backend.onrender.com/api';

async function loginAndGetToken(
  memberId: string,
  email: string,
  password: string,
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
): Promise<string | null> {
  try {
    const res = await fetch(`${TRAINING_CAMP_API}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    if (!res.ok) return null;

    const body = await res.json().catch(() => null);
    const token = body?.access_token ?? null;
    if (!token) return null;

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('member_integrations')
      .update({ access_token: token, token_expires_at: expiresAt, status: 'active' })
      .eq('member_id', memberId)
      .eq('provider', 'training-camp');

    return token;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    const { data: integration } = await supabase
      .from('member_integrations')
      .select('access_token, token_expires_at, provider_email, provider_password, status')
      .eq('member_id', member.id)
      .eq('provider', 'training-camp')
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Compte Training-Camp non lié', code: 'NOT_LINKED' }, { status: 403 });
    }

    // Si pas de token ou expiré → re-login
    let token = integration.access_token;
    if (!token || integration.status === 'expired') {
      if (!integration.provider_email || !integration.provider_password) {
        return NextResponse.json({ error: 'Compte Training-Camp non lié', code: 'NOT_LINKED' }, { status: 403 });
      }
      token = await loginAndGetToken(member.id, integration.provider_email, integration.provider_password, supabase);
      if (!token) {
        return NextResponse.json({ error: 'Impossible de se connecter à Training-Camp', code: 'NOT_LINKED' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    const res = await fetch(`${TRAINING_CAMP_API}/workout-sessions?limit=${limit}&offset=${offset}`, {
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    });

    // Token expiré → re-login et retry
    if (res.status === 401) {
      if (!integration.provider_email || !integration.provider_password) {
        return NextResponse.json({ error: 'Session expirée, veuillez re-lier votre compte', code: 'TOKEN_EXPIRED' }, { status: 403 });
      }
      const newToken = await loginAndGetToken(member.id, integration.provider_email, integration.provider_password, supabase);
      if (!newToken) {
        return NextResponse.json({ error: 'Session expirée, veuillez re-lier votre compte', code: 'TOKEN_EXPIRED' }, { status: 403 });
      }
      const retryRes = await fetch(`${TRAINING_CAMP_API}/workout-sessions?limit=${limit}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${newToken}`, 'Content-Type': 'application/json' },
      });
      if (!retryRes.ok) {
        return NextResponse.json({ error: `Erreur Training-Camp (${retryRes.status})` }, { status: retryRes.status });
      }
      return NextResponse.json(await retryRes.json());
    }

    if (!res.ok) {
      const detail = await res.text();
      return NextResponse.json({ error: `Erreur Training-Camp (${res.status})`, detail: detail.slice(0, 200) }, { status: res.status });
    }

    // Prolonge l'expiration locale
    await supabase
      .from('member_integrations')
      .update({ token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('member_id', member.id)
      .eq('provider', 'training-camp');

    return NextResponse.json(await res.json());
  } catch (error) {
    console.error('[training/sessions]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
