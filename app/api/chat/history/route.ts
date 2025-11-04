import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase envs missing' }, { status: 500 });
  }

  const authHeader = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
  }

  const token = authHeader.replace('Bearer ', '').trim();
  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData?.user) {
    return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
  }
  const currentUserId = userData.user.id;

  const { searchParams } = new URL(req.url);
  const peerId = searchParams.get('peerId') || '';
  if (!peerId) {
    return NextResponse.json({ error: 'peerId obrigatório' }, { status: 400 });
  }

  // Buscar mensagens onde senderId e receiverId pertencem ao conjunto {currentUserId, peerId}
  // Isso garante as duas direções do diálogo sem depender de and() dentro do or()
  const { data: chats, error: chatsErr } = await supabase
    .from('Chat')
    .select('id, message, "senderId", "receiverId", created_at')
    .in('senderId', [currentUserId, peerId])
    .in('receiverId', [currentUserId, peerId])
    .order('created_at', { ascending: true });

  if (chatsErr) {
    return NextResponse.json({ error: chatsErr.message }, { status: 500 });
  }

  return NextResponse.json({ messages: chats || [] }, { status: 200 });
}