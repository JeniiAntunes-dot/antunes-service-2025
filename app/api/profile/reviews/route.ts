import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

export async function GET(req: NextRequest) {
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

  const userId = userData.user.id;

  try {
    const reviews = await prisma.review.findMany({
      where: { userId },
      orderBy: { id: 'desc' },
      include: { service: { select: { id: true, title: true } } },
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      content: r.content,
      rating: r.rating,
      service: r.service ? { id: r.service.id, title: r.service.title } : null,
    }));

    return NextResponse.json({ reviews: formatted }, { status: 200 });
  } catch (err: any) {
    console.error('Erro ao buscar avaliações:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}