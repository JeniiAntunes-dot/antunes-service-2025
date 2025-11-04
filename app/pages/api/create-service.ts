import { NextApiRequest, NextApiResponse } from 'next';
import { supabase } from '@/lib/supabaseClient';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Método não permitido' });

  const { title, description, price } = req.body;
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return res.status(401).json({ error: 'Não autorizado' });

  const { error } = await supabase.from('Service').insert({
    title,
    description,
    price: parseFloat(price),
    userId: user.id,
  });

  if (error) return res.status(400).json({ error: error.message });
  return res.status(200).json({ message: 'Serviço criado' });
}