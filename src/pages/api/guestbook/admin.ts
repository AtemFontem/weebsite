// src/pages/api/guestbook/admin.ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  timestamp: string;
  approved: number;
  ip?: string;
}

export const GET: APIRoute = async () => {
  try {
    const db = env.DB;

    const { results: entries } = await db
      .prepare('SELECT id, name, message, timestamp, approved, ip FROM guestbook ORDER BY timestamp DESC')
      .all<GuestbookEntry>();

    const { results: visitorRows } = await db
      .prepare('SELECT COUNT(DISTINCT ip) AS count FROM guestbook WHERE ip IS NOT NULL')
      .all<{ count: number }>();

    const visitorCount = visitorRows[0]?.count ?? 0;

    return new Response(
      JSON.stringify({ entries, visitorCount }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Admin fetch error:', error);
    return new Response(
      JSON.stringify({ error: 'failed to fetch entries.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};