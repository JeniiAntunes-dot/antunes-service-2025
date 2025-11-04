import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { id } = params;
  if (!id) {
    return NextResponse.json({ error: 'serviceId ausente' }, { status: 400 });
  }
  try {
    const reviews = await prisma.review.findMany({
      where: { serviceId: id },
      orderBy: { id: 'desc' },
      include: { user: { select: { id: true, name: true } } },
    });

    const formatted = reviews.map((r) => ({
      id: r.id,
      content: r.content,
      rating: r.rating,
      serviceId: r.serviceId,
      userId: r.userId,
      photoUrl: r.photoUrl ?? null,
      author_name: r.user?.name ?? undefined,
    }));

    return NextResponse.json({ reviews: formatted }, { status: 200 });
  } catch (err: any) {
    console.error('Erro ao listar avaliações do serviço:', err);
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
}