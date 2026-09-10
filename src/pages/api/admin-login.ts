// src/pages/api/admin-login.ts
import type { APIRoute } from 'astro';

// Admin credentials - CHANGE THESE!
const ADMIN_USERNAME = import.meta.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = import.meta.env.ADMIN_PASSWORD;

export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse the request body as JSON
    const body = await request.json();
    const { username, password } = body as { username?: string; password?: string };
    
    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username and password required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      return new Response(
        JSON.stringify({ success: true }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    return new Response(
      JSON.stringify({ success: false, error: 'Invalid credentials' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Login error:', error);
    return new Response(
      JSON.stringify({ success: false, error: 'An error occurred' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};