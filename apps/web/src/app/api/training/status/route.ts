import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  try {
    const supabase = await createSupabaseServerClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ linked: false });
    }

    const { data: member } = await supabase
      .from('family_members')
      .select('id')
      .eq('user_id', user.id)
      .single();

    if (!member) {
      return NextResponse.json({ linked: false });
    }

    const { data: integration } = await supabase
      .from('member_integrations')
      .select('status, provider_email, token_expires_at')
      .eq('member_id', member.id)
      .eq('provider', 'training-camp')
      .single();

    if (!integration || integration.status === 'expired') {
      return NextResponse.json({ linked: false });
    }

    return NextResponse.json({
      linked: true,
      email: integration.provider_email,
      expired: new Date(integration.token_expires_at) <= new Date(),
    });
  } catch {
    return NextResponse.json({ linked: false });
  }
}
