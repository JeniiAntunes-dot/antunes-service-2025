'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

type ReviewItem = {
  id: string;
  content: string;
  rating: number;
  service: { id: string; title: string } | null;
  photoUrl?: string | null;
};

export default function ProfilePage() {
  const [user, setUser] = useState<any>(null);
  const [avatarVersion, setAvatarVersion] = useState<number>(0);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      const { data: sessionRes } = await supabase.auth.getSession();
      const u = sessionRes.session?.user ?? null;
      setUser(u);
      if (!u || !sessionRes.session?.access_token) return;

      // Força refresh da sessão para refletir metadata atualizada (avatar_url)
      try {
        await supabase.auth.refreshSession();
        const { data: refreshed } = await supabase.auth.getSession();
        if (refreshed.session?.user) {
          setUser(refreshed.session.user);
          setAvatarVersion((v) => v + 1);
        }

        const res = await fetch('/api/profile/reviews', {
          headers: { Authorization: `Bearer ${sessionRes.session.access_token}` },
        });
        const json = await res.json();
        if (!res.ok) {
          setReviewsError(json?.error || 'Falha ao carregar avaliações');
          setReviews([]);
        } else {
          setReviews((json.reviews || []).map((r: any) => ({
            id: r.id,
            content: r.content,
            rating: r.rating,
            service: r.service || null,
            photoUrl: r.photoUrl || null,
          })));
        }
      } catch (e: any) {
        setReviewsError(e?.message || 'Erro ao carregar avaliações');
      } finally {
        setLoadingReviews(false);
      }
    };
    init();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarUploading(true);
    setAvatarError(null);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) {
        setAvatarError('Sessão inválida. Faça login.');
        setAvatarUploading(false);
        return;
      }
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/profile/avatar', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const json = await res.json();
      if (!res.ok) {
        setAvatarError(json?.error || 'Falha ao enviar avatar');
      } else {
        // Atualiza sessão local com novo metadata
        await supabase.auth.refreshSession();
        const { data: sessionData } = await supabase.auth.getSession();
        const cur = sessionData.session?.user ?? null;
        if (cur) {
          setUser({ ...cur, user_metadata: { ...cur.user_metadata, avatar_url: json.avatarUrl } });
          setAvatarVersion((v) => v + 1); // força bust de cache da imagem
        }
      }
    } catch (err: any) {
      setAvatarError(err?.message || 'Erro ao enviar avatar');
    } finally {
      setAvatarUploading(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordLoading(true);
    setPasswordError(null);
    setPasswordSuccess(null);
    try {
      const { data: sessionRes } = await supabase.auth.getSession();
      const token = sessionRes.session?.access_token;
      if (!token) {
        setPasswordError('Sessão inválida. Faça login.');
        setPasswordLoading(false);
        return;
      }
      const res = await fetch('/api/profile/password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newPassword: password }),
      });
      const json = await res.json();
      if (!res.ok) {
        setPasswordError(json?.error || 'Falha ao alterar senha');
      } else {
        setPasswordSuccess('Senha alterada com sucesso');
        setPassword('');
      }
    } catch (err: any) {
      setPasswordError(err?.message || 'Erro ao alterar senha');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-slate-100">
      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">
        <h1 className="text-2xl font-semibold">Perfil</h1>

        {!user && (
          <div className="text-slate-300">Faça login para gerenciar seu perfil.</div>
        )}

        {user && (
          <section className="bg-white rounded-md shadow p-6">
            <div className="flex items-center gap-4">
              <img
                src={
                  (user.user_metadata?.avatar_url && `${user.user_metadata.avatar_url}?v=${avatarVersion}`)
                  || '/logo.png'
                }
                alt="Avatar"
                className="w-20 h-20 rounded-full object-cover border"
              />
              <div>
                <p className="text-slate-800 font-medium">{user.user_metadata?.name || user.email}</p>
                <p className="text-slate-500 text-sm">{user.email}</p>
              </div>
            </div>
            <div className="mt-6">
              <label className="block text-sm text-slate-700 mb-2">Atualizar foto de perfil</label>
              <input type="file" accept="image/*" onChange={handleAvatarUpload} />
              {avatarUploading && <p className="text-slate-500 text-sm mt-2">Enviando...</p>}
              {avatarError && <p className="text-red-500 text-sm mt-2">{avatarError}</p>}
            </div>
          </section>
        )}

        {user && (
          <section className="bg-white rounded-md shadow p-6">
            <h2 className="text-slate-800 font-semibold mb-4">Alterar senha</h2>
            <form onSubmit={handlePasswordChange} className="space-y-3">
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Nova senha"
                className="w-full border rounded px-3 py-2 text-slate-800"
              />
              <button
                type="submit"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                disabled={passwordLoading}
              >
                {passwordLoading ? 'Alterando...' : 'Alterar senha'}
              </button>
              {passwordError && <p className="text-red-500 text-sm">{passwordError}</p>}
              {passwordSuccess && <p className="text-green-600 text-sm">{passwordSuccess}</p>}
            </form>
          </section>
        )}

        {user && (
          <section className="bg-white rounded-md shadow p-6">
            <h2 className="text-slate-800 font-semibold mb-4">Minhas avaliações</h2>
            {loadingReviews && <p className="text-slate-500">Carregando avaliações...</p>}
            {reviewsError && <p className="text-red-500">{reviewsError}</p>}
            {!loadingReviews && !reviewsError && reviews.length === 0 && (
              <p className="text-slate-500">Você ainda não fez avaliações.</p>
            )}
            <ul className="space-y-4">
              {reviews.map((r) => (
                <li key={r.id} className="border rounded p-4">
                  <div className="flex justify-between">
                    <span className="text-slate-800 font-medium">{r.service?.title || 'Serviço'}</span>
                    <span className="text-yellow-600">Nota: {r.rating}</span>
                  </div>
                  <p className="text-slate-700 mt-2">{r.content}</p>
                  {r.photoUrl && (
                    <img src={r.photoUrl} alt="Foto da avaliação" className="mt-3 w-full max-w-sm rounded" />
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </div>
  );
}
