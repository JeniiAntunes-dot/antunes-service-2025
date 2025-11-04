import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET(req: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    return NextResponse.json({ error: 'Supabase envs missing' }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const idsParam = searchParams.get('ids') || '';
  const ids = idsParam
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);

  if (!ids.length) {
    return NextResponse.json({ names: {} }, { status: 200 });
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const nameMap = new Map<string, string>();

  // Primeiro tenta pela tabela User
  try {
    const { data: users, error: usersErr } = await supabase
      .from('User')
      .select('id,name,email')
      .in('id', ids);

    if (!usersErr && users) {
      for (const u of users) {
        if (u?.id) {
          nameMap.set(u.id as string, (u.name as string) || (u.email as string) || 'Desconhecido');
        }
      }
    }
  } catch (e) {
    // ignora
  }

  // Fallback usando Auth Admin para IDs que faltarem
  const missing = ids.filter((id) => !nameMap.has(id));
  if (missing.length) {
    for (const id of missing) {
      try {
        const { data: adminUser, error: adminErr } = await supabase.auth.admin.getUserById(id);
        if (!adminErr && adminUser?.user) {
          const meta = adminUser.user.user_metadata as any;
          const metaName = (meta?.name as string) || undefined;
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

  const names: Record<string, string> = {};
  nameMap.forEach((name, id) => {
    names[id] = name;
  });

  return NextResponse.json({ names }, { status: 200 });
}