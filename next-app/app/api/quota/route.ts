import { NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

export const dynamic = 'force-dynamic';

const DAILY_LIMIT = 20;

let redis: Redis | null = null;
try {
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    });
  }
} catch { /* proceed without Redis */ }

export async function GET() {
  if (!redis) {
    return NextResponse.json({ used: 0, remaining: DAILY_LIMIT, limit: DAILY_LIMIT });
  }

  const today = new Date().toISOString().split('T')[0];
  const key = `unfpa:queries:${today}`;
  const used = (await redis.get<number>(key)) ?? 0;

  return NextResponse.json({
    used,
    remaining: Math.max(0, DAILY_LIMIT - used),
    limit: DAILY_LIMIT,
  });
}
