import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID!;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET!;
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3002';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const redirect = (msg: string) =>
    NextResponse.redirect(`${APP_URL}/settings?google=error&msg=${encodeURIComponent(msg)}`);

  if (error || !code) {
    return redirect(`Google a refusé : ${error ?? 'code manquant'}`);
  }

  try {
    // Échange le code contre des tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: `${APP_URL}/api/auth/google/callback`,
        grant_type: 'authorization_code',
      }),
    });

    if (!tokenRes.ok) {
      const body = await tokenRes.text();
      console.error('[google/callback] token exchange failed', body);
      return redirect(`Échange de token échoué (${tokenRes.status}) : ${body.slice(0, 100)}`);
    }

    const tokens = await tokenRes.json();
    const { access_token, refresh_token, expires_in } = tokens;

    // Récupère l'email Google
    const userRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const googleUser = await userRes.json();

    // Identifie l'utilisateur Supabase via la session cookie
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(`${APP_URL}/login`);
    }

    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return redirect('Membre familial introuvable dans Supabase');
    }

    const expiresAt = new Date(Date.now() + expires_in * 1000).toISOString();

    const { error: upsertError } = await supabase
      .from('member_integrations')
      .upsert({
        member_id: member.id,
        provider: 'google',
        access_token,
        refresh_token,
        token_expires_at: expiresAt,
        provider_email: googleUser.email,
        status: 'active',
      }, { onConflict: 'member_id,provider' });

    if (upsertError) {
      console.error('[google/callback] upsert error', upsertError);
      return redirect(`Erreur Supabase : ${upsertError.message}`);
    }

    return NextResponse.redirect(`${APP_URL}/settings?google=success`);
  } catch (err) {
    console.error('[google/callback]', err);
    return redirect(`Exception : ${(err as Error).message}`);
  }
}
