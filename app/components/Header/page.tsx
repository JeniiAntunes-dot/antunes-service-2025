'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const syncSessionUser = async () => {
      const { data: sessionRes, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        if (sessionErr.message !== 'Auth session missing!') {
          console.warn('Aviso ao carregar sessão:', sessionErr.message);
        }
        setUser(null);
        return;
      }
      setUser(sessionRes.session?.user ?? null);
    };

    syncSessionUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) console.error('Erro ao sair:', error.message);
    else router.push('/login');
  };

  return (
    <header className="bg-blue-600 text-white p-4 sticky top-0 z-10 shadow-md">
      <div className="container mx-auto flex justify-between items-center">
        <div className="flex items-center gap-3">
          <img
            src="/logo.png"
            alt="Logo Antunes Serviços Autonomos"
            className="h-8 w-8 rounded"
          />
          <h1 className="text-2xl font-bold">Antunes Serviços Autonomos</h1>
        </div>
        <nav className="space-x-6">
          <Link href="/" className="hover:text-blue-200 transition">Home</Link>
          <Link href="/dashboard" className="hover:text-blue-200 transition">Dashboard</Link>
          <Link href="/create-service" className="hover:text-blue-200 transition">Criar Serviço</Link>
          <Link href="/messages" className="hover:text-blue-200 transition">Mensagens</Link>
          <Link href="/forum" className="hover:text-blue-200 transition">Fórum</Link>
          <Link href="/profile" className="hover:text-blue-200 transition">Perfil</Link>
          {user ? (
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white px-4 py-1 rounded-lg transition"
            >
              Sair
            </button>
          ) : (
            <Link href="/login" className="hover:text-blue-200 transition">Login</Link>
          )}
        </nav>
      </div>
    </header>
  );
}