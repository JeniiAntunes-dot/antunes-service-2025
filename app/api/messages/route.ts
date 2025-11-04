import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';

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

  const userId = userData.user.id;

  // Fetch messages for the user (sent or received)
  const { data: msgs, error: msgsErr } = await supabase
    .from('Chat')
    .select('id, message, "senderId", "receiverId"')
    .or(`"senderId".eq.${userId},"receiverId".eq.${userId}`)
    .order('id', { ascending: false });

  if (msgsErr) {
    return NextResponse.json({ error: msgsErr.message }, { status: 500 });
  }

  const ids = Array.from(
    new Set((msgs || []).flatMap(m => [m.senderId, m.receiverId]).filter(Boolean))
  );

  // Try to get names from User table first
  const { data: users, error: usersErr } = await supabase
    .from('User')
    .select('id,name,email')
    .in('id', ids);

  const nameMap = new Map<string, string>();
  if (!usersErr && users) {
    for (const u of users) {
      nameMap.set(u.id, u.name || u.email || 'Desconhecido');
    }
  }

  // Fallback to Auth Admin if missing
  const missing = ids.filter(id => !nameMap.has(id));
  if (missing.length) {
    for (const id of missing) {
      try {
        const { data: adminUser, error: adminErr } = await supabase.auth.admin.getUserById(id);
        if (!adminErr && adminUser?.user) {
          const metaName = (adminUser.user.user_metadata as any)?.name as string | undefined;
          const email = adminUser.user.email || 'Desconhecido';
          nameMap.set(id, metaName || email);
        } else {
          nameMap.set(id, 'Desconhecido');
        }
      } catch {
        nameMap.set(id, 'Desconhecido');
      }
    }
  }

  const enriched = (msgs || []).map(m => ({
    id: m.id,
    message: m.message,
    timestamp: null,
    senderId: m.senderId,
    receiverId: m.receiverId,
    senderName: nameMap.get(m.senderId) || 'Desconhecido',
    receiverName: nameMap.get(m.receiverId) || 'Desconhecido',
  }));

  return NextResponse.json({ messages: enriched }, { status: 200 });
}