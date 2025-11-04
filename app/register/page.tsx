'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<'explorar' | 'oferecer'>('explorar');
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setError('A senha deve ter pelo menos 8 caracteres.');
      return;
    }

    const registrationData = { name, email, password, phone, role };
    console.log('Enviando registro:', registrationData);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      console.log('Status da resposta:', response.status); 
      console.log('Cabeçalho Content-Type:', response.headers.get('Content-Type')); 
      const responseText = await response.text(); 
      console.log('Resposta bruta:', responseText); 

      if (!response.ok) {
        console.error('Erro na resposta:', responseText);
        setError(`Erro ao registrar: ${responseText || 'Resposta inválida do servidor'}`);
        return;
      }

      let data;
      try {
        data = JSON.parse(responseText);
      } catch (parseError) {
        console.error('Erro ao parsear JSON:', parseError, 'Texto recebido:', responseText);
        setError('Resposta do servidor não é um JSON válido. Verifique os logs do servidor.');
        return;
      }

      console.log('Registro bem-sucedido, resposta:', data); 
      if (data.session) {
        const isProvider = data.user.user_metadata.isProvider || false;
        router.push(isProvider ? '/create-service' : '/dashboard');
      } else {
        setError('Falha ao iniciar sessão automaticamente. Tente fazer login.');
        router.push('/login');
      }
    } catch (error) {
      console.error('Erro na requisição:', error);
      setError('Erro ao conectar com o servidor');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-r from-teal-500 via-emerald-600 to-green-700 flex items-center justify-center">
      <div className="bg-white/95 p-8 rounded-2xl shadow-2xl w-full max-w-md transform transition-all duration-300 hover:shadow-3xl">
        <h1 className="text-4xl font-bold text-green-700 mb-6 text-center">Criar Conta</h1>
        {error && <p className="text-red-600 mb-4 text-center font-medium">{error}</p>}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-gray-800">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition duration-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition duration-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800">Telefone</label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition duration-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800">Senha</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition duration-200"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-800">Quero</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as 'explorar' | 'oferecer')}
              className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 transition duration-200"
            >
              <option value="explorar">Explorar Serviços</option>
              <option value="oferecer">Oferecer Serviços</option>
            </select>
          </div>
          <button type="submit" className="w-full bg-green-600 text-white p-3 rounded-lg hover:bg-green-700 transition-all duration-300 font-semibold shadow-md hover:shadow-lg">
            Registrar
          </button>
        </form>
        <p className="mt-5 text-center text-gray-700">
          Já tem conta? <Link href="/login" className="text-green-600 hover:underline font-medium">Faça login</Link>
        </p>
      </div>
    </div>
  );
}