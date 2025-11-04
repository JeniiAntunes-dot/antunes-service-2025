import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error('Missing Supabase environment variables');
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(req: NextRequest) {
  try {
    const { message, receiverId } = await req.json();

    if (!message || !receiverId) {
      return NextResponse.json({ error: 'message e receiverId são obrigatórios' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Token de autenticação ausente ou inválido' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      console.error('Erro de autenticação:', authError?.message);
      return NextResponse.json({ error: 'Usuário não autenticado' }, { status: 401 });
    }

    // Inserção via Supabase (service role contorna RLS)
    const { data, error } = await supabase
      .from('Chat')
      .insert({
        message,
        senderId: user.id,
        receiverId,
      })
      .select();

    if (error) {
      console.error('Erro ao inserir chat via Supabase:', error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    const inserted = Array.isArray(data) ? data[0] : data;

    // Retornar a mensagem inserida para o WebSocket
    const messageResponse = {
      id: inserted.id,
      message: inserted.message,
      senderId: inserted.senderId,
      receiverId: inserted.receiverId,
      created_at: inserted.created_at
    };

    // Criar notificação para o receiver
    try {
      await supabase.from('Notification').insert({
        userId: receiverId,
        message: `Nova mensagem de ${(user.user_metadata as any)?.name || user.email || 'um usuário'}`,
        read: false,
      });
    } catch (notifErr: any) {
      console.warn('Falha ao criar notificação:', notifErr?.message || notifErr);
    }

    return NextResponse.json(messageResponse);
  } catch (err: any) {
    console.error('Erro inesperado no POST /api/chat:', err);
    return NextResponse.json({ error: 'Erro interno do servidor', details: String(err?.message ?? err) }, { status: 500 });
  }
}
