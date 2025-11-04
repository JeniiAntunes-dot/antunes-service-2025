import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET /api/service/mine - Lista serviços do usuário autenticado
export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autenticação ausente ou inválido' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('Service')
      .select('id, title, description, price, userId, availability, category')
      .eq('userId', user.id);

    if (error) {
      console.error('Erro ao buscar seus serviços:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Enriquecer com nome do usuário
    let userName = 'Desconhecido';
    try {
      const adminRes = await supabase.auth.admin.getUserById(user.id);
      if (!adminRes.error && adminRes.data?.user) {
        const u = adminRes.data.user;
        userName = (u.user_metadata && (u.user_metadata as any).name) || u.email || 'Desconhecido';
      }
    } catch {}

    const formatted = (data ?? []).map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      price: s.price,
      availability: s.availability,
      category: s.category,
      userName,
      averageRating: 'N/A',
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Erro inesperado em GET /api/service/mine:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}