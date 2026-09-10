// src/pages/api/guestbook/delete.ts
import type { APIRoute } from 'astro';
import { deleteEntry } from '../guestbook';

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { id } = body;
    
    if (!id) {
      return new Response(
        JSON.stringify({ error: 'Entry ID is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    const success = await deleteEntry(id);
    
    if (success) {
      return new Response(
        JSON.stringify({ success: true, message: 'Entry deleted successfully' }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    } else {
      return new Response(
        JSON.stringify({ error: 'Entry not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Delete error:', error);
    return new Response(
      JSON.stringify({ error: 'An error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};