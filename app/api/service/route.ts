import { NextRequest, NextResponse } from "next/server";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// ==========================
// 🟩 GET - Buscar serviços
// ==========================
export async function GET() {
  try {
    // Consulta sem relacionamentos para evitar erro de schema no Supabase
    const { data, error } = await supabase
      .from('Service')
      .select('id, title, description, price, userId, availability, category');

    if (error) {
      console.error('Erro ao buscar serviços:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    // Monta mapa de nomes de usuários sem usar joins
    const services = (data ?? []) as any[];
    const userIds = Array.from(new Set(services.map(s => s.userId).filter(Boolean)));

    let userNameById: Record<string, string> = {};
    if (userIds.length > 0) {
      const { data: usersData, error: usersError } = await supabase
        .from('User')
        .select('id, name')
        .in('id', userIds);

      if (usersError) {
        console.error('Erro ao buscar usuários:', usersError.message);
      } else {
        (usersData ?? []).forEach((u: any) => {
          if (u?.id) userNameById[u.id] = u.name || 'Desconhecido';
        });
      }

      // Fallback: buscar nomes via Auth Admin quando não houver registro na tabela User
      const missingIds = userIds.filter((id) => !userNameById[id]);
      if (missingIds.length > 0) {
        await Promise.all(
          missingIds.map(async (id) => {
            try {
              const adminRes = await supabase.auth.admin.getUserById(id);
              if (!adminRes.error && adminRes.data?.user) {
                const u = adminRes.data.user;
                const name = (u.user_metadata && (u.user_metadata as any).name) || u.email || 'Desconhecido';
                userNameById[id] = name;
              }
            } catch (e) {
              console.error('Erro ao buscar usuário via Auth Admin:', id, e);
            }
          })
        );
      }
    }

    const formatted = services.map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      price: s.price,
      availability: s.availability,
      category: s.category,
      userName: userNameById[s.userId] || 'Desconhecido',
      averageRating: 'N/A',
    }));

    console.log('Serviços retornados:', formatted);
    return NextResponse.json(formatted);
  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}

// ==========================
// 🟦 POST - Criar serviço
// ==========================
export async function POST(req: NextRequest) {
  try {
    const { title, description, price, availability, category } = await req.json();
    const authHeader = req.headers.get('authorization');

    // 🧩 Valida token
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autenticação ausente ou inválido' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Erro de autenticação:', authError?.message);
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // ✅ Permite availability = false
    if (!title || !description || !price || !category || availability === undefined) {
      return NextResponse.json({ error: 'Todos os campos são obrigatórios' }, { status: 400 });
    }

    // ✅ Converte availability para boolean
    let availabilityBoolean;
    if (availability === 'available') availabilityBoolean = true;
    else if (availability === 'unavailable') availabilityBoolean = false;
    else availabilityBoolean = Boolean(availability);

    // 🧩 Insere serviço no banco
    const { data, error } = await supabase
      .from('Service')
      .insert({
        title,
        description,
        price: parseFloat(price),
        availability: availabilityBoolean,
        category,
        userId: user.id,
      })
      .select();

    if (error) {
      console.error('Erro ao criar serviço:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    console.log('Serviço criado:', data[0]);
    return NextResponse.json(
      { message: 'Serviço criado com sucesso', service: data[0] },
      { status: 201 }
    );

  } catch (error) {
    console.error('Erro inesperado:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}
