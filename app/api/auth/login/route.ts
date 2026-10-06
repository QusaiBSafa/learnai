import { NextResponse } from 'next/server';
import { checkLogin, startSession } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const r = await checkLogin(body.username, body.password);
  if (!r.ok) return NextResponse.json({ error: r.error }, { status: r.status });
  await startSession(r.user.id);
  return NextResponse.json({ user: r.user });
}
