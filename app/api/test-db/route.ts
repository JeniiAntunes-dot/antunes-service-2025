import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET() {
  try {
    // Teste simples de conexão com o banco
    await prisma.$connect();
    
    // Tenta fazer uma query simples
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    
    await prisma.$disconnect();
    
    return NextResponse.json({ 
      status: 'success', 
      message: 'Conexão com banco de dados funcionando',
      result 
    });
  } catch (error: any) {
    console.error('Erro de conexão com banco:', error);
    
    return NextResponse.json({ 
      status: 'error', 
      message: 'Erro de conexão com banco de dados',
      error: error.message,
      code: error.code
    }, { status: 500 });
  }
}