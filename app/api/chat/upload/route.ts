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
    // Garante bucket público 'chat-images'
    const { error: bucketErr } = await supabase.storage.createBucket('chat-images', { public: true });
    if (bucketErr && !String(bucketErr.message).includes('already exists')) {
      console.warn('Aviso ao criar bucket chat-images:', bucketErr.message);
    }

    const form = await req.formData();
    const file = form.get('file') as File | null;
    const receiverId = String(form.get('receiverId') ?? '').trim();

    if (!file) {
      return NextResponse.json({ error: 'Arquivo não enviado' }, { status: 400 });
    }
    if (!receiverId) {
      return NextResponse.json({ error: 'receiverId é obrigatório' }, { status: 400 });
    }

    const ext = file.type?.split('/')[1] || 'png';
    const path = `${userId}/${receiverId}/chat-${Date.now()}.${ext}`;

    const { data: uploadRes, error: uploadErr } = await supabase
      .storage
      .from('chat-images')
      .upload(path, file, { contentType: file.type || 'image/png', upsert: true });

    if (uploadErr) {
      return NextResponse.json({ error: uploadErr.message }, { status: 400 });
    }

    const { data: pub } = supabase.storage.from('chat-images').getPublicUrl(uploadRes.path);
    const imageUrl = pub.publicUrl;

    // Inserir mensagem com URL da imagem
    const { data: insertData, error: insertErr } = await supabase
      .from('Chat')
      .insert({
        message: imageUrl,
        senderId: userId,
        receiverId,
      })
      .select();

    if (insertErr) {
      return NextResponse.json({ error: insertErr.message }, { status: 400 });
    }

    const inserted = Array.isArray(insertData) ? insertData[0] : insertData;
    const messageResponse = {
      id: inserted.id,
      message: inserted.message,
      senderId: inserted.senderId,
      receiverId: inserted.receiverId,
      created_at: inserted.created_at,
    };

    // Notificação simples para o receiver
    try {
      await supabase.from('Notification').insert({
        userId: receiverId,
        message: `Nova imagem de ${(userData.user.user_metadata as any)?.name || userData.user.email || 'um usuário'}`,
        read: false,
      });
    } catch (notifErr: any) {
      console.warn('Falha ao criar notificação de imagem:', notifErr?.message || notifErr);
    }

    return NextResponse.json(messageResponse, { status: 200 });
  } catch (err: any) {
    console.error('Erro ao enviar imagem no chat:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}