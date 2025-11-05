import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
  },
});

function isClient() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined';
}

if (isClient()) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (session) {
      localStorage.setItem('supabase.auth.token', session.access_token);
    } else {
      localStorage.removeItem('supabase.auth.token');
    }
    console.log('Auth state changed:', event, session);
  });

  // Recupera a sessão do localStorage ao inicializar
const storedSessionString = localStorage.getItem('supabase.auth.token');
 if (storedSessionString) {
  try {
    // Tenta converter a string JSON para um objeto
    const tokens = JSON.parse(storedSessionString); 
    
    // Verifica se os tokens OBRIGATÓRIOS existem e são strings (evita o 'undefined')
    if (tokens && typeof tokens.access_token === 'string' && typeof tokens.refresh_token === 'string') {
        
        // LINHA 36 CORRIGIDA: Agora, o TypeScript sabe que ambos são strings
        supabase.auth.setSession({ 
            access_token: tokens.access_token, 
            refresh_token: tokens.refresh_token 
        });
}

export const initializeAuth = async () => {
  if (isClient()) {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
      console.log('Sessão inicial carregada:', session);
    }
  }
};

if (isClient()) {
  initializeAuth();
}
