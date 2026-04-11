import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const TRAINING_CAMP_API = process.env.TRAINING_CAMP_API || 'https://training-camp-backend.onrender.com/api';

async function refreshToken(memberId: string, providerEmail: string, supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>): Promise<string | null> {
  // Impossible de rafraîchir sans le password — on retourne null pour forcer la re-liaison
  console.warn(`[training/sessions] Token expiré pour le membre ${memberId} (${providerEmail}), re-liaison requise`);
  await supabase.from('member_integrations').update({ status: 'expired' }).eq('member_id', memberId).eq('provider', 'training-camp');
  return null;
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
      .select('access_token, token_expires_at, provider_email, status')
      .eq('member_id', member.id)
      .eq('provider', 'training-camp')
      .single();

    if (!integration || integration.status === 'expired') {
      return NextResponse.json({ error: 'Compte Training-Camp non lié', code: 'NOT_LINKED' }, { status: 403 });
    }

    let token = integration.access_token;

    // Token expiré : tentative de refresh
    if (new Date(integration.token_expires_at) <= new Date()) {
      token = await refreshToken(member.id, integration.provider_email, supabase);
      if (!token) {
        return NextResponse.json({ error: 'Session Training-Camp expirée, veuillez re-lier votre compte', code: 'TOKEN_EXPIRED' }, { status: 403 });
      }
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

    if (!res.ok) {
      return NextResponse.json({ error: `Erreur Training-Camp (${res.status})`, detail: rawText.slice(0, 200) }, { status: res.status });
    }

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
