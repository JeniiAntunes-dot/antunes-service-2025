'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useReviewSocket } from '@/lib/useReviewSocket';

export default function ReviewForm({ serviceId }: { serviceId: string }) {
  const [rating, setRating] = useState<number>(5);
  const [hover, setHover] = useState<number>(0);
  const [content, setContent] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState<string | undefined>(undefined);

  const { sendReview } = useReviewSocket({ serviceId });

  useEffect(() => {
    const loadUserMeta = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const name = session?.user?.user_metadata?.name as string | undefined;
      setAuthorName(name);
    };
    loadUserMeta();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) {
        setError('Faça login para avaliar.');
        setLoading(false);
        return;
      }
      const form = new FormData();
      form.append('rating', String(rating));
      form.append('content', content);
      form.append('serviceId', serviceId);
      if (file) form.append('file', file);
      const res = await fetch('/api/review', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error || 'Falha ao enviar avaliação');
      } else {
        setSuccess('Avaliação criada com sucesso');
        // Emitir via WebSocket para listeners da página do serviço
        const review = json?.review;
        if (review) {
          sendReview({
            id: review.id,
            content: review.content,
            rating: review.rating,
            serviceId: review.serviceId,
            userId: review.userId,
            photoUrl: review.photoUrl,
            created_at: review.created_at,
            author_name: authorName,
          });
        }
        setContent('');
        setFile(null);
        setRating(5);
      }
    } catch (err: any) {
      setError(err?.message || 'Erro ao enviar avaliação');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="flex items-center gap-2">
        {[1,2,3,4,5].map((star) => (
          <button
            key={star}
            type="button"
            onMouseEnter={() => setHover(star)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setRating(star)}
            className={`text-2xl ${ (hover || rating) >= star ? 'text-yellow-500' : 'text-gray-300'}`}
            aria-label={`${star} estrela${star>1?'s':''}`}
          >
            ★
          </button>
        ))}
      </div>

      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="Escreva seu comentário"
        className="w-full border rounded px-3 py-2 text-slate-800"
        rows={4}
        required
      />

      <div>
        <label className="block text-sm text-slate-700 mb-2">Adicionar foto (opcional)</label>
        <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files?.[0] || null)} />
      </div>

      <button
        type="submit"
        className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        disabled={loading}
      >
        {loading ? 'Enviando...' : 'Enviar avaliação'}
      </button>

      {error && <p className="text-red-500 text-sm">{error}</p>}
      {success && <p className="text-green-600 text-sm">{success}</p>}
    </form>
  );
}