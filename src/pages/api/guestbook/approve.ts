// src/pages/api/guestbook/approve.ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = env.DB;
    const body = await request.json() as { id?: string };
    const { id } = body;

    if (!id) {
      return new Response(
        JSON.stringify({ error: 'entry id is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const result = await db
      .prepare('UPDATE guestbook SET approved = 1 WHERE id = ?')
      .bind(id)
      .run();

    if (result.meta.changes > 0) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: 'entry not found.' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Approval error:', error);
    return new Response(
      JSON.stringify({ error: 'an error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};