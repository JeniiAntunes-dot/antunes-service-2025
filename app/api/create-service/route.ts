import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabaseClient';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, price, category, availability } = body;

    // ✅ Corrigir esta validação para aceitar "false" como valor válido
    if (!title || !description || !price || !category || availability === undefined) {
      return NextResponse.json({ error: 'Campos obrigatórios ausentes' }, { status: 400 });
    }

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Cabeçalho de autorização ausente' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Token de autenticação inválido ou ausente' }, { status: 401 });
    }

    const userId = user.id;

    // 🟩 AQUI É O LOCAL ONDE VOCÊ DEVE ADICIONAR A CONVERSÃO DO VALOR:
    let availabilityBoolean;

    // Se o front mandar "available" ou "unavailable", converte para boolean
    if (availability === 'available') availabilityBoolean = true;
    else if (availability === 'unavailable') availabilityBoolean = false;
    else availabilityBoolean = Boolean(availability); // tenta converter se já for boolean

    // 👇 E usa availabilityBoolean no insert:
    const { data, error } = await supabase
      .from('Service')
      .insert([
        {
          title,
          description,
          price: parseFloat(price),
          category,
          availability: availabilityBoolean, // ✅ corrigido
          userId,
        },
      ])
      .select();

    if (error) {
      console.error('Erro ao inserir serviço:', error);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ service: data[0] }, { status: 201 });
  } catch (err) {
    console.error('Erro inesperado:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
