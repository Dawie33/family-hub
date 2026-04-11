import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;

async function refreshAccessToken(refreshToken: string): Promise<{ access_token: string; expires_in: number } | null> {
  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  });

  if (!res.ok) return null;
  return res.json();
}

export async function GET(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

    const { data: integration } = await supabase
      .from('member_integrations')
      .select('access_token, refresh_token, token_expires_at, status')
      .eq('member_id', member.id)
      .eq('provider', 'google')
      .single();

    if (!integration || integration.status !== 'active') {
      return NextResponse.json({ error: 'Google Calendar non connecté', code: 'NOT_LINKED' }, { status: 403 });
    }

    let token = integration.access_token;

    // Rafraîchit le token si expiré
    if (new Date(integration.token_expires_at) <= new Date()) {
      const refreshed = await refreshAccessToken(integration.refresh_token);
      if (!refreshed) {
        await supabase.from('member_integrations')
          .update({ status: 'expired' })
          .eq('member_id', member.id)
          .eq('provider', 'google');
        return NextResponse.json({ error: 'Session Google expirée', code: 'TOKEN_EXPIRED' }, { status: 403 });
      }

      token = refreshed.access_token;
      const newExpiry = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();
      await supabase.from('member_integrations')
        .update({ access_token: token, token_expires_at: newExpiry })
        .eq('member_id', member.id)
        .eq('provider', 'google');
    }

    // Récupère les événements du mois demandé (ou mois courant par défaut)
    const { searchParams } = new URL(request.url);
    const yearParam = searchParams.get('year');
    const monthParam = searchParams.get('month'); // 0-based

    let timeMin: string;
    let timeMax: string;

    if (yearParam && monthParam !== null) {
      const y = parseInt(yearParam);
      const m = parseInt(monthParam);
      timeMin = new Date(y, m, 1).toISOString();
      timeMax = new Date(y, m + 1, 0, 23, 59, 59).toISOString();
    } else {
      const now = new Date();
      timeMin = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      timeMax = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59).toISOString();
    }

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?` +
      new URLSearchParams({
        timeMin,
        timeMax,
        singleEvents: 'true',
        orderBy: 'startTime',
        maxResults: '100',
      }),
      { headers: { Authorization: `Bearer ${token}` } }
    );

    if (!calRes.ok) {
      return NextResponse.json({ error: 'Erreur Google Calendar' }, { status: calRes.status });
    }

    const data = await calRes.json();
    return NextResponse.json(data.items ?? []);
  } catch (err) {
    console.error('[google/events GET]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

    const { data: integration } = await supabase
      .from('member_integrations')
      .select('access_token, refresh_token, token_expires_at, status')
      .eq('member_id', member.id)
      .eq('provider', 'google')
      .single();

    if (!integration || integration.status !== 'active') {
      return NextResponse.json({ error: 'Google Calendar non connecté' }, { status: 403 });
    }

    let token = integration.access_token;
    if (new Date(integration.token_expires_at) <= new Date()) {
      const refreshed = await refreshAccessToken(integration.refresh_token);
      if (!refreshed) return NextResponse.json({ error: 'Token expiré' }, { status: 403 });
      token = refreshed.access_token;
      await supabase.from('member_integrations')
        .update({ access_token: token, token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
        .eq('member_id', member.id).eq('provider', 'google');
    }

    const { searchParams } = new URL(request.url);
    const googleEventId = searchParams.get('googleEventId');
    if (!googleEventId) return NextResponse.json({ error: 'googleEventId manquant' }, { status: 400 });

    const calRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events/${googleEventId}`,
      { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }
    );

    if (!calRes.ok && calRes.status !== 404) {
      return NextResponse.json({ error: 'Erreur Google Calendar' }, { status: calRes.status });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[google/events DELETE]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });

    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();
    if (!member) return NextResponse.json({ error: 'Membre introuvable' }, { status: 404 });

    const { data: integration } = await supabase
      .from('member_integrations')
      .select('access_token, refresh_token, token_expires_at, status')
      .eq('member_id', member.id)
      .eq('provider', 'google')
      .single();

    if (!integration || integration.status !== 'active') {
      return NextResponse.json({ error: 'Google Calendar non connecté', code: 'NOT_LINKED' }, { status: 403 });
    }

    let token = integration.access_token;
    if (new Date(integration.token_expires_at) <= new Date()) {
      const refreshed = await refreshAccessToken(integration.refresh_token);
      if (!refreshed) return NextResponse.json({ error: 'Token expiré' }, { status: 403 });
      token = refreshed.access_token;
      await supabase.from('member_integrations')
        .update({ access_token: token, token_expires_at: new Date(Date.now() + refreshed.expires_in * 1000).toISOString() })
        .eq('member_id', member.id).eq('provider', 'google');
    }

    // Données de l'événement à créer
    const { supabaseEventId, title, start_date, end_date, all_day, description, location } = await request.json();

    const googleEvent: Record<string, unknown> = {
      summary: title,
      description: description ?? '',
      location: location ?? '',
    };

    if (all_day) {
      googleEvent.start = { date: start_date.slice(0, 10) };
      googleEvent.end   = { date: (end_date ?? start_date).slice(0, 10) };
    } else {
      googleEvent.start = { dateTime: start_date, timeZone: 'Europe/Paris' };
      googleEvent.end   = { dateTime: end_date ?? start_date, timeZone: 'Europe/Paris' };
    }

    const calRes = await fetch(
      'https://www.googleapis.com/calendar/v3/calendars/primary/events',
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(googleEvent),
      }
    );

    if (!calRes.ok) {
      const err = await calRes.text();
      console.error('[google/events POST]', err);
      return NextResponse.json({ error: 'Erreur Google Calendar', detail: err }, { status: calRes.status });
    }

    const created = await calRes.json();

    // Sauvegarde le google_event_id dans Supabase
    if (supabaseEventId) {
      await supabase
        .from('family_events')
        .update({ google_event_id: created.id, sync_status: 'synced' })
        .eq('id', supabaseEventId);
    }

    return NextResponse.json({ google_event_id: created.id });
  } catch (err) {
    console.error('[google/events POST]', err);
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
