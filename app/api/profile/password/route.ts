import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Variáveis do Supabase ausentes' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Token de autenticação ausente' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const { newPassword } = await req.json();
  if (!newPassword || typeof newPassword !== 'string' || newPassword.length < 6) {
    return NextResponse.json({ error: 'Senha inválida. Use pelo menos 6 caracteres.' }, { status: 400 });
  }

  try {
    const { error: updErr } = await supabase.auth.admin.updateUserById(userData.user.id, {
      password: newPassword,
    } as any);
    if (updErr) {
      return NextResponse.json({ error: updErr.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Senha atualizada com sucesso' }, { status: 200 });
  } catch (err: any) {
    console.error('Erro ao atualizar senha:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}