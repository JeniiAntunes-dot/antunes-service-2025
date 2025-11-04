import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    console.log('Recebido login:', { email, password });

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios.' }, { status: 400 });
    }

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      console.error('Erro no login:', loginError.message);
      return NextResponse.json({ error: loginError.message }, { status: 401 });
    }

    console.log('Login bem-sucedido, dados:', data);

    const { data: sessionData } = await supabase.auth.getSession();
    if (sessionData.session) {
      console.log('Sessão retornada:', sessionData.session);
      return NextResponse.json({ message: 'Login bem-sucedido', user: data.user, session: sessionData.session }, { status: 200 });
    }

    return NextResponse.json({ message: 'Login bem-sucedido', user: data.user }, { status: 200 });

  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}