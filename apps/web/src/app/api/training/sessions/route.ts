import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const TRAINING_CAMP_API = process.env.TRAINING_CAMP_API || 'https://training-camp-backend.onrender.com/api';

async function refreshToken(
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
    const { access_token } = await res.json();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    await supabase
      .from('member_integrations')
      .update({ access_token, token_expires_at: expiresAt, status: 'active' })
      .eq('member_id', memberId)
      .eq('provider', 'training-camp');
    return access_token;
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

    // Récupère le member_id
    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });
    }

    // Récupère le token TC du membre
    const { data: integration } = await supabase
      .from('member_integrations')
      .select('access_token, token_expires_at, provider_email, provider_password, status')
      .eq('member_id', member.id)
      .eq('provider', 'training-camp')
      .single();

    if (!integration) {
      return NextResponse.json({ error: 'Compte Training-Camp non lié', code: 'NOT_LINKED' }, { status: 403 });
    }

    // Si expiré mais credentials stockés → re-login silencieux
    let token = integration.access_token;
    if (integration.status === 'expired' || !token) {
      if (!integration.provider_email || !integration.provider_password) {
        return NextResponse.json({ error: 'Compte Training-Camp non lié', code: 'NOT_LINKED' }, { status: 403 });
      }
      const newToken = await refreshToken(member.id, integration.provider_email, integration.provider_password, supabase);
      if (!newToken) {
        return NextResponse.json({ error: 'Compte Training-Camp non lié', code: 'NOT_LINKED' }, { status: 403 });
      }
      token = newToken;
    }

    const { searchParams } = new URL(request.url);
    const limit = searchParams.get('limit') || '20';
    const offset = searchParams.get('offset') || '0';

    const res = await fetch(`${TRAINING_CAMP_API}/workout-sessions?limit=${limit}&offset=${offset}`, {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    });

    const rawText = await res.text();
    console.log(`[training/sessions] status=${res.status} body=${rawText.slice(0, 500)}`);

    // Si Training Camp dit que le token est invalide → re-login automatique puis retry
    if (res.status === 401) {
      if (!integration.provider_email || !integration.provider_password) {
        return NextResponse.json({ error: 'Session Training-Camp expirée, veuillez re-lier votre compte', code: 'TOKEN_EXPIRED' }, { status: 403 });
      }
      const newToken = await refreshToken(member.id, integration.provider_email, integration.provider_password, supabase);
      if (!newToken) {
        return NextResponse.json({ error: 'Session Training-Camp expirée, veuillez re-lier votre compte', code: 'TOKEN_EXPIRED' }, { status: 403 });
      }
      // Retry la requête avec le nouveau token
      const retryRes = await fetch(`${TRAINING_CAMP_API}/workout-sessions?limit=${limit}&offset=${offset}`, {
        headers: { Authorization: `Bearer ${newToken}`, 'Content-Type': 'application/json' },
      });
      if (!retryRes.ok) {
        return NextResponse.json({ error: `Erreur Training-Camp (${retryRes.status})` }, { status: retryRes.status });
      }
      return NextResponse.json(await retryRes.json());
    }

    if (!res.ok) {
      return NextResponse.json({ error: `Erreur Training-Camp (${res.status})`, detail: rawText.slice(0, 200) }, { status: res.status });
    }

    // Token encore valide : prolonger la date d'expiration locale (30 jours glissants)
    await supabase
      .from('member_integrations')
      .update({ token_expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() })
      .eq('member_id', member.id)
      .eq('provider', 'training-camp');

    let parsed: unknown;
    try {
      parsed = JSON.parse(rawText);
    } catch {
      return NextResponse.json({ error: 'Réponse Training-Camp non JSON', detail: rawText.slice(0, 200) }, { status: 502 });
    }

    return NextResponse.json(parsed);
  } catch (error) {
    console.error('[training/sessions]', error);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
