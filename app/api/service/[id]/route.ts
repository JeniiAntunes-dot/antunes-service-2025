import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json({ error: 'ID do serviço é obrigatório' }, { status: 400 });
    }

    const { data: svc, error: svcErr } = await supabase
      .from('Service')
      .select('id, title, description, price, availability, category, userId')
      .eq('id', id)
      .single();

    if (svcErr || !svc) {
      return NextResponse.json({ error: 'Serviço não encontrado' }, { status: 404 });
    }

    // Buscar dados do usuário associado
    let userInfo: any = null;
    const { data: userRow } = await supabase
      .from('User')
      .select('id, name, email')
      .eq('id', svc.userId)
      .single();

    if (userRow) {
      userInfo = userRow;
    } else {
      try {
        const adminRes = await supabase.auth.admin.getUserById(svc.userId);
        if (!adminRes.error && adminRes.data?.user) {
          const u = adminRes.data.user;
          userInfo = {
            id: u.id,
            name: (u.user_metadata && (u.user_metadata as any).name) || u.email || 'Desconhecido',
            email: u.email || '',
          };
        }
      } catch (e) {
        // Ignorar erro de admin, manter fallback
      }
    }

    return NextResponse.json({
      id: svc.id,
      title: svc.title,
      description: svc.description,
      price: svc.price,
      category: svc.category,
      availability: svc.availability,
      user: userInfo || { id: svc.userId, name: 'Desconhecido', email: '' },
    });
  } catch (error) {
    console.error('Erro ao buscar serviço:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}