// src/pages/api/guestbook/delete.ts
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

    await db.prepare('DELETE FROM guestbook WHERE id = ?').bind(id).run();

    return new Response(
      JSON.stringify({ success: true }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: 'an error occurred.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};