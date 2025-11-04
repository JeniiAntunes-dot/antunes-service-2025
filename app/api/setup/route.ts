import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export async function POST(_req: NextRequest) {
  try {
    // Create Chat table if not exists (case-sensitive name "Chat")
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Chat" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        message text NOT NULL,
        timestamp timestamptz NOT NULL DEFAULT now(),
        "senderId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        "receiverId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE
      );
    `);

    // Create Notification table if not exists
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Notification" (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL REFERENCES "User"(id) ON DELETE CASCADE,
        message text NOT NULL,
        read boolean NOT NULL DEFAULT false,
        timestamp timestamptz NOT NULL DEFAULT now()
      );
    `);

    // Ensure photoUrl column on Review exists
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "Review" ADD COLUMN IF NOT EXISTS "photoUrl" text;
    `);

    return NextResponse.json({ ok: true, message: 'Tables ensured: Chat, Notification, Review.photoUrl' });
  } catch (err: any) {
    console.error('Setup error:', err);
    return NextResponse.json({ error: 'Failed to setup tables', details: String(err?.message ?? err) }, { status: 500 });
  }
}