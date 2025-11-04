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

  const userId = userData.user.id;

  try {
    // Garante bucket público 'avatars'
    const { error: bucketErr } = await supabase.storage.createBucket('avatars', { public: true });
    if (bucketErr && bucketErr.message && !bucketErr.message.includes('already exists')) {
      console.warn('Aviso ao criar bucket:', bucketErr.message);
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }

    const ext = file.type?.split('/')[1] || 'png';
    const path = `${userId}/avatar.${ext}`;

    const { data: uploadRes, error: uploadErr } = await supabase
      .storage
      .from('avatars')
      .upload(path, file, { contentType: file.type || 'image/png', upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }

    const { data: pub } = supabase.storage.from('avatars').getPublicUrl(uploadRes.path);
    const avatarUrl = pub.publicUrl;

    // Atualiza metadata do usuário para facilitar leitura no cliente
    const { error: metaErr } = await supabase.auth.admin.updateUserById(userId, {
      user_metadata: { avatar_url: avatarUrl },
    });
    if (metaErr) {
      console.warn('Falha ao atualizar metadata do usuário:', metaErr.message);
    }

    return NextResponse.json({ avatarUrl }, { status: 200 });
  } catch (err: any) {
    console.error('Erro ao processar upload de avatar:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}