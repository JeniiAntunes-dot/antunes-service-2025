'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

interface Profile {
  id: string;
  name: string;
  email: string;
  phone: string;
  isProvider: boolean;
  services: { id: string; title: string; price: number }[];
}

export default function Profile() {
  const { id } = useParams();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchProfile() {
      const { data, error } = await supabase
        .from('User')
        .select('id, name, email, phone, isProvider, services (id, title, price)')
        .eq('id', id)
        .single();
      if (error) console.error('Error fetching profile:', error);
      else setProfile(data);
      setLoading(false);
    }
    fetchProfile();
  }, [id]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black p-6">
      <h1 className="text-5xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-400 mb-6 text-center">
        Perfil
      </h1>
      {loading ? (
        <p className="text-center text-white">Carregando...</p>
      ) : !profile ? (
        <p className="text-center text-red-500">Perfil não encontrado.</p>
      ) : (
        <div className="bg-white/90 p-8 rounded-2xl shadow-2xl backdrop-blur-md">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">{profile.name}</h2>
          <p className="text-gray-600 mb-2">Email: {profile.email}</p>
          <p className="text-gray-600 mb-2">Telefone: {profile.phone || 'Não informado'}</p>
          <p className="text-gray-600 mb-4">Prestador: {profile.isProvider ? 'Sim' : 'Não'}</p>
          {profile.isProvider && profile.services.length > 0 && (
            <div>
              <h3 className="text-xl font-medium text-gray-800 mb-2">Serviços Oferecidos:</h3>
              <ul className="list-disc pl-5 space-y-2">
                {profile.services.map((service) => (
                  <li key={service.id} className="text-gray-600">
                    {service.title} - R${service.price.toFixed(2)}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}