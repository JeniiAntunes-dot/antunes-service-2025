import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: NextRequest) {
  try {
    const { name, email, password, phone, role } = await req.json();

    console.log('Recebido registro:', { name, email, phone, role }); 

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'A senha deve ter pelo menos 8 caracteres.' }, { status: 400 });
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, phone, isProvider: role === 'oferecer', verified: true },
        emailRedirectTo: undefined
      },
    });

    if (signUpError) {
      console.error('Erro no signUp:', signUpError.message);
      return NextResponse.json({ error: signUpError.message }, { status: 400 });
    }

    if (!data.user) {
      console.error('Nenhum usuário retornado após signUp');
      return NextResponse.json({ error: 'Falha ao criar usuário' }, { status: 500 });
    }

    console.log('Registro bem-sucedido, data:', data); 

    const { error: insertError } = await supabase.from('User').insert({
      id: data.user.id,
      email: data.user.email,
      name: data.user.user_metadata.name,
      phone: data.user.user_metadata.phone,
      isProvider: data.user.user_metadata.isProvider,
      verified: data.user.user_metadata.verified,
    });

    if (insertError) {
      console.error('Erro ao inserir no banco:', insertError.message);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    console.log('Usuário inserido no banco com sucesso:', data.user.id); 

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      console.log('Sessão ativa após registro:', sessionData.session);
      return NextResponse.json({ message: 'Registro e sessão bem-sucedidos', user: data.user, session: sessionData.session }, { status: 201 });
    }

    return NextResponse.json({ message: 'Registro bem-sucedido', user: data.user }, { status: 201 });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' }, 
    });
  }
}
