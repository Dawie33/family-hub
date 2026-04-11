import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) return NextResponse.json({ linked: false });

    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!member) return NextResponse.json({ linked: false });

    const { data: integration } = await supabase
      .from('member_integrations')
      .select('status, provider_email')
      .eq('member_id', member.id)
      .eq('provider', 'google')
      .single();

    if (!integration || integration.status !== 'active') {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({ linked: true, email: integration.provider_email });
  } catch {
    return NextResponse.json({ linked: false });
  }
}

export async function DELETE() {
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

    await supabase
      .from('member_integrations')
      .delete()
      .eq('member_id', member.id)
      .eq('provider', 'google');

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 });
  }
}
