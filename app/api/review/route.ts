import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

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

  const supabase = createClient(supabaseUrl, serviceRoleKey);
  const token = authHeader.replace('Bearer ', '').trim();
  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Token inválido' }, { status: 401 });
  }

  const userId = userData.user.id;

  try {
    // Verifica conectividade com o banco antes de processar upload e criação
    try {
      await prisma.$connect();
    } catch (connErr: any) {
      console.error('Banco de dados indisponível:', connErr);
      return NextResponse.json({ error: 'Banco de dados indisponível. Tente novamente em alguns minutos.' }, { status: 503 });
    }

    const form = await req.formData();
    const ratingStr = String(form.get('rating') ?? '');
    const content = String(form.get('content') ?? '').trim();
    const serviceId = String(form.get('serviceId') ?? '').trim();
    const file = form.get('file') as File | null;

    const rating = Number(ratingStr);
    if (!serviceId) {
      return NextResponse.json({ error: 'serviceId é obrigatório' }, { status: 400 });
    }
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'rating deve ser entre 1 e 5' }, { status: 400 });
    }
    if (!content) {
      return NextResponse.json({ error: 'content é obrigatório' }, { status: 400 });
    }

    let photoUrl: string | undefined = undefined;
    if (file) {
      // Ensure public bucket
      const { error: bucketErr } = await supabase.storage.createBucket('review-photos', { public: true });
      if (bucketErr && !String(bucketErr.message).includes('already exists')) {
        console.warn('Aviso ao criar bucket review-photos:', bucketErr.message);
      }
      const ext = file.type?.split('/')[1] || 'png';
      const path = `${serviceId}/${userId}/review-${Date.now()}.${ext}`;
      const { data: uploadRes, error: uploadErr } = await supabase
        .storage
        .from('review-photos')
        .upload(path, file, { contentType: file.type || 'image/png', upsert: true });
      if (uploadErr) {
        return NextResponse.json({ error: uploadErr.message }, { status: 400 });
      }
      const { data: pub } = supabase.storage.from('review-photos').getPublicUrl(uploadRes.path);
      photoUrl = pub.publicUrl;
    }

    const created = await prisma.review.create({
      data: {
        content,
        rating,
        serviceId,
        userId,
        photoUrl,
      },
    });

    return NextResponse.json({ review: created }, { status: 201 });
  } catch (err: any) {
    console.error('Erro ao criar avaliação:', err);
    // Se for erro de inicialização do Prisma, trate como serviço indisponível
    const name = err?.name || '';
    if (name.includes('PrismaClientInitializationError') || String(err?.message || '').includes("Can't reach database server")) {
      return NextResponse.json({ error: 'Banco de dados indisponível. Tente novamente mais tarde.' }, { status: 503 });
    }
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}