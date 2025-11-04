// app/forum/[id]/page.tsx
'use client';

import { useState, useEffect, FormEvent } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

type SupabaseUserMetadata = {
  name?: string;
  // Outros campos de metadata que você usa
};

type Post = {
  id: string;
  content: string;
  created_at: string;
  author_name: string;
};

type Topic = {
  id: string;
  title: string;
  content: string;
  created_at: string;
  author_name: string;
  user_id: string;
};

export default function TopicDetail() {
  const { id } = useParams() as { id: string };
  const [topic, setTopic] = useState<Topic | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPostContent, setNewPostContent] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const router = useRouter();

  useEffect(() => {
    fetchTopicAndPosts();
    // NOTA: A dependência [id] está correta
  }, [id]);

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


  const fetchTopicAndPosts = async () => {
    setLoading(true);
    
    // 1. Busca do Tópico (SIMPLIFICADA)
    const { data: topicData, error: topicError } = await supabase
      .from('forum_topics')
      .select(`*`) // <-- SIMPLIFICADO para evitar o JOIN problemático
      .eq('id', id)
      .single();

    if (topicError || !topicData) {
      setError('Tópico não encontrado ou erro ao carregar.');
      setLoading(false);
      return;
    }
    
    // 2. BUSCA DO NOME DO AUTOR DO TÓPICO (AJUSTE)
    // Para garantir o nome do autor, faremos uma busca extra (mais segura)
    // Resolver nome do autor via API
    const topicNameMap = await resolveAuthorNames([topicData.user_id]);
    const topicAuthorName = topicNameMap[topicData.user_id] || 'Desconhecido';
    setTopic({ ...topicData, author_name: topicAuthorName, user_id: topicData.user_id });
    
    // 3. Busca dos Posts (Respostas - SIMPLIFICADA)
    const { data: postsData, error: postsError } = await supabase
      .from('forum_posts')
      .select(`*`) // <-- SIMPLIFICADO para evitar o JOIN problemático
      .eq('topic_id', id)
      .order('created_at', { ascending: true });

    if (postsError) {
      console.error('Erro ao carregar posts:', postsError);
      setError('Erro ao carregar as respostas.');
    } else {
      // 4. Mapeia os posts e busca o nome de CADA autor (PODE SER LENTO)
      // Alternativa: Usar um array de IDs e buscar os nomes em um batch (para otimização futura)
      const postUserIds = Array.from(new Set(postsData.map(p => p.user_id).filter(Boolean)));
      const postNameMap = await resolveAuthorNames(postUserIds);
      const formattedPosts: Post[] = postsData.map((post) => ({
        ...post,
        author_name: postNameMap[post.user_id] || 'Desconhecido',
      }));
      setPosts(formattedPosts);
    }
    
    setLoading(false);
  };

  const handlePostSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim()) return;

    const { data: userData, error: userError } = await supabase.auth.getUser();
    let user = userData?.user || null;
    if (!user && userError && userError.message?.includes('Auth session missing')) {
      const { data: sessionData } = await supabase.auth.getSession();
      user = sessionData?.session?.user ?? null;
    }

    if (!user) {
        alert('Você precisa estar logado para postar.');
        router.push('/login');
        return;
    }
    
    const { error: insertError } = await supabase
      .from('forum_posts')
      .insert({ topic_id: id, user_id: user.id, content: newPostContent.trim() });

    if (insertError) {
      console.error('Erro ao inserir post:', insertError);
      alert('Erro ao enviar sua resposta. Tente novamente.');
    } else {
      setNewPostContent('');
      // Recarrega os dados para mostrar a nova postagem
      fetchTopicAndPosts(); 
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-blue-600 animate-pulse">Carregando tópico...</div>;
  }

  if (error || !topic) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }
  // Linha 170
  return (
    <div className="container mx-auto p-4 py-12 max-w-4xl">
      
      {/* Detalhes do Tópico */}
      <div className="bg-slate-800 p-8 rounded-xl shadow-2xl mb-8 border-t-4 border-blue-600 border border-slate-700">
        <h1 className="text-4xl font-extrabold text-slate-100 mb-3">{topic.title}</h1>
        <p className="text-sm text-slate-400 mb-6">
            Iniciado por <span className="font-semibold text-cyan-300">{topic.author_name}</span> em {new Date(topic.created_at).toLocaleString()}
        </p>
        <div className="prose max-w-none border-t pt-4">
            <p className="text-lg text-slate-300 whitespace-pre-line">{topic.content}</p>
        </div>
      </div>

      {/* Seção de Respostas */}
      <h2 className="text-2xl font-bold text-slate-100 mb-6 border-b border-slate-700 pb-2">
        Respostas ({posts.length})
      </h2>
      
      <div className="space-y-6 mb-10">
        {posts.map((post) => (
          <div key={post.id} className="bg-slate-800 p-6 rounded-lg shadow-md border border-slate-700">
            <div className="flex justify-between items-start mb-3">
              <span className="font-semibold text-slate-200">{post.author_name}</span>
              <span className="text-xs text-slate-400">
                {new Date(post.created_at).toLocaleString()}
              </span>
            </div>
            <p className="text-slate-300 whitespace-pre-line">{post.content}</p>
          </div>
        ))}
      </div>

      {/* Formulário de Nova Resposta */}
      <div className="bg-slate-800 p-6 rounded-xl shadow-lg border-t border-slate-700">
        <h3 className="text-xl font-bold text-slate-100 mb-4">Postar uma Resposta</h3>
        <form onSubmit={handlePostSubmit}>
          <textarea
            value={newPostContent}
            onChange={(e) => setNewPostContent(e.target.value)}
            className="w-full p-3 border border-slate-600 bg-slate-900 text-slate-100 placeholder-slate-400 rounded-lg focus:ring-2 focus:ring-blue-500 mb-4"
            rows={5}
            placeholder="Compartilhe sua experiência ou responda ao tópico..."
            required
          />
          <button
            type="submit"
            className="bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition"
          >
            Enviar Resposta
          </button>
        </form>
      </div>

    </div>
  );
}