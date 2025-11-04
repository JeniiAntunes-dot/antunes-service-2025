'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import ReviewForm from '@/app/components/ReviewForm';
import { useReviewSocket, ReviewPayload } from '@/lib/useReviewSocket';

export default function ReviewPage() {
  const { serviceId } = useParams();

  if (!serviceId || typeof serviceId !== 'string') {
    return <div className="p-6">Serviço inválido.</div>;
  }

  const [reviews, setReviews] = useState<ReviewPayload[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { isConnected } = useReviewSocket({
    serviceId,
    onNewReview: (rev) => {
      setReviews((prev) => {
        if (prev.some((r) => r.id === rev.id)) return prev;
        return [rev, ...prev];
      });
    },
  });

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/review/service/${serviceId}`);
        const json = await res.json();
        if (!res.ok) {
          setError(json?.error || 'Falha ao carregar avaliações');
        } else {
          setReviews((json?.reviews ?? []) as ReviewPayload[]);
        }
      } catch (err: any) {
        setError(err?.message || 'Erro ao carregar avaliações');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [serviceId]);

  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-semibold">Avaliar serviço</h1>
        <div className="bg-white rounded-md shadow p-6">
          <ReviewForm serviceId={serviceId} />
        </div>
        <div className="bg-white rounded-md shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Avaliações</h2>
            <span className="text-sm text-slate-500">
              {isConnected ? 'Conectado ao tempo real' : 'Offline'}
            </span>
          </div>
          {loading && <div className="text-slate-600">Carregando avaliações...</div>}
          {error && <div className="text-red-600">{error}</div>}
          {!loading && reviews.length === 0 && (
            <div className="text-slate-600">Seja o primeiro a avaliar este serviço.</div>
          )}
          <ul className="space-y-4">
            {reviews.map((r) => (
              <li key={r.id} className="border rounded p-4">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.author_name ?? 'Cliente'}</div>
                  <div className="text-yellow-600">{Array.from({ length: r.rating }).map((_, i) => '★').join('')}</div>
                </div>
                <p className="mt-2 text-slate-700 whitespace-pre-wrap">{r.content}</p>
                {r.photoUrl && (
                  <img src={r.photoUrl} alt="Foto da avaliação" className="mt-3 max-h-64 rounded" />
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}