// app/forum/page.tsx
'use client';

import { useEffect, useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type Topic = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  user_id: string;
  author_name: string;
};

export default function ForumPage() {
  const router = useRouter();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [user, setUser] = useState<any>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newContent, setNewContent] = useState('');

  useEffect(() => {
    const init = async () => {
      await fetchTopics();
      const { data: { user }, error } = await supabase.auth.getUser();
      if (!user && error && error.message?.includes('Auth session missing')) {
        const { data: sessionData } = await supabase.auth.getSession();
        setUser(sessionData?.session?.user ?? null);
      } else {
        setUser(user ?? null);
      }
    };
    init();
  }, []);

  const resolveAuthorNames = async (ids: string[]): Promise<Record<string, string>> => {
    try {
      const qs = encodeURIComponent(ids.join(','));
      const res = await fetch(`/api/users/resolve-names?ids=${qs}`);
      if (!res.ok) return {};
      const json = await res.json();
      return (json?.names ?? {}) as Record<string, string>;
    } catch {
      return {};
    }
  };

  const fetchTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('forum_topics')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      setError('Erro ao carregar tópicos.');
      setTopics([]);
      setLoading(false);
      return;
    }

    const topicsData = (data ?? []) as any[];
    const ids = Array.from(new Set(topicsData.map(t => t.user_id).filter(Boolean)));
    const nameMap = await resolveAuthorNames(ids);
    const withAuthors: Topic[] = topicsData.map((t: any) => ({
      ...t,
      author_name: nameMap[t.user_id] || 'Desconhecido',
    }));
    setTopics(withAuthors);
    setLoading(false);
  };

  const handleCreateTopic = async (e: FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    let currentUser = user;
    if (!currentUser) {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      currentUser = userData?.user ?? null;
      if (!currentUser && userError && userError.message?.includes('Auth session missing')) {
        const { data: sessionData } = await supabase.auth.getSession();
        currentUser = sessionData?.session?.user ?? null;
      }
    }

    if (!currentUser) {
      alert('Você precisa estar logado para criar um tópico.');
      router.push('/login');
      return;
    }

    const { data, error } = await supabase
      .from('forum_topics')
      .insert({
        title: newTitle.trim(),
        content: newContent.trim(),
        user_id: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar tópico:', error);
      alert('Erro ao criar tópico. Tente novamente.');
      return;
    }

    setNewTitle('');
    setNewContent('');
    // Redireciona para o novo tópico
    router.push(`/forum/${data.id}`);
  };

  return (
    <div className="container mx-auto p-4 py-12 max-w-5xl">
      <h1 className="text-3xl font-bold text-slate-100 mb-6">Fórum</h1>

      {/* Formulário para novo tópico (se logado) */}
      {user ? (
        <div className="bg-slate-800 p-6 rounded-xl shadow-lg border border-slate-700 mb-10">
          <h2 className="text-xl font-semibold text-slate-100 mb-4">Criar novo tópico</h2>
          <form onSubmit={handleCreateTopic} className="space-y-4">
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              className="w-full p-3 border border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder="Título do tópico"
              required
            />
            <textarea
              value={newContent}
              onChange={(e) => setNewContent(e.target.value)}
              className="w-full p-3 border border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500"
              rows={6}
              placeholder="Conteúdo do tópico"
              required
            />
            <button
              type="submit"
              className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
            >
              Publicar tópico
            </button>
          </form>
        </div>
      ) : (
        <div className="bg-slate-800 p-6 rounded-xl border border-slate-700 mb-10 text-slate-300">
          Faça <Link href="/login" className="text-blue-400 hover:underline">login</Link> para criar novos tópicos.
        </div>
      )}

      {/* Lista de tópicos */}
      {loading ? (
        <div className="p-8 text-center text-blue-600 animate-pulse">Carregando tópicos...</div>
      ) : error ? (
        <div className="p-8 text-center text-red-500">{error}</div>
      ) : topics.length === 0 ? (
        <div className="p-8 text-center text-slate-300">Nenhum tópico ainda. Seja o primeiro a publicar!</div>
      ) : (
        <div className="space-y-6">
          {topics.map((t) => (
            <div
              key={t.id}
              role="button"
              onClick={() => router.push(`/forum/${t.id}`)}
              className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700 cursor-pointer hover:border-blue-600 hover:bg-slate-700 transition"
            >
              <div className="flex justify-between items-start mb-2">
                <span className="text-xl font-bold text-slate-100 hover:text-blue-300 transition">
                  {t.title}
                </span>
                <span className="text-xs text-slate-400">{new Date(t.created_at).toLocaleString()}</span>
              </div>
              <p className="text-sm text-slate-400 mb-3">por <span className="text-cyan-300 font-medium">{t.author_name}</span></p>
              <p className="text-slate-300 line-clamp-3 whitespace-pre-line">{t.content}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}