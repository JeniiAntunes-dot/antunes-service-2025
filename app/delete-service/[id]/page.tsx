'use client';

import { useRouter, useParams } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function DeleteService() {
  const { id } = useParams();
  const router = useRouter();

  const handleDelete = async () => {
    const { error } = await supabase.from('Service').delete().eq('id', id);
    if (error) alert('Erro ao deletar serviço: ' + error.message);
    else router.push('/provider-dashboard');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-black flex items-center justify-center">
      <div className="bg-white/90 p-10 rounded-2xl shadow-2xl w-full max-w-md text-center backdrop-blur-md">
        <h1 className="text-3xl font-bold text-red-600 mb-6">Confirmar Exclusão</h1>
        <p className="text-gray-700 mb-6">Tem certeza que deseja excluir este serviço?</p>
        <div className="space-x-6">
          <button onClick={handleDelete} className="bg-red-600 text-white px-6 py-3 rounded-xl hover:bg-red-700 transition-all duration-300 shadow-lg hover:shadow-xl">
            Sim, Excluir
          </button>
          <button onClick={() => router.push('/provider-dashboard')} className="bg-gray-500 text-white px-6 py-3 rounded-xl hover:bg-gray-600 transition-all duration-300 shadow-lg">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}