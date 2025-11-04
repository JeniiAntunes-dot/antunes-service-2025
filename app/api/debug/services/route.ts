import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function GET() {
  try {
    // Buscar todos os serviços no Prisma
    const services = await prisma.service.findMany({
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    return NextResponse.json({
      count: services.length,
      services: services.map(s => ({
        id: s.id,
        title: s.title,
        userId: s.userId,
        userName: s.user?.name || 'N/A',
      })),
    });
  } catch (error) {
    console.error('Erro ao buscar serviços:', error);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}