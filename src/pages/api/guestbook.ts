// src/pages/api/guestbook.ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const RATE_LIMIT_WINDOW = 60 * 1000;
const MAX_SUBMISSIONS_PER_WINDOW = 5;

const submissionAttempts: Record<string, { count: number; resetTime: number }> = {};

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  timestamp: string;
  approved: number;
  ip?: string;
}

function getClientIP(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || 'unknown';
}

async function verifyTurnstile(token: string, secret: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${secret}&response=${token}`,
    });

    const data = await response.json() as { success: boolean };
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const db = env.DB;
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;

    const ip = getClientIP(request);
    const now = Date.now();
    const record = submissionAttempts[ip];

    if (record && now < record.resetTime) {
      if (record.count >= MAX_SUBMISSIONS_PER_WINDOW) {
        const waitTime = Math.ceil((record.resetTime - now) / 1000);
        return new Response(
          JSON.stringify({ error: `too many submissions. please wait ${waitTime} seconds.` }),
          { status: 429, headers: { 'Content-Type': 'application/json' } }
        );
      }
      record.count++;
    } else {
      submissionAttempts[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    }

    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim() || '';
    const message = formData.get('message')?.toString().trim() || '';
    const turnstileToken = formData.get('cf-turnstile-response')?.toString() || '';

    if (name.length < 2 || name.length > 20) {
      return new Response(
        JSON.stringify({ error: 'name must be between 2 and 20 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (message.length < 2 || message.length > 50) {
      return new Response(
        JSON.stringify({ error: 'message must be between 2 and 50 characters.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!turnstileToken) {
      return new Response(
        JSON.stringify({ error: 'verification failed. please refresh the page.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isHuman = await verifyTurnstile(turnstileToken, turnstileSecret);
    if (!isHuman) {
      return new Response(
        JSON.stringify({ error: 'verification failed. please refresh the page.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 7);
    const timestamp = new Date().toISOString();

    await db
      .prepare('INSERT INTO guestbook (id, name, message, timestamp, approved, ip) VALUES (?, ?, ?, ?, 0, ?)')
      .bind(id, name, message, timestamp, ip)
      .run();

    const newEntry: GuestbookEntry = {
      id,
      name,
      message,
      timestamp,
      approved: 0,
      ip,
    };

    return new Response(
      JSON.stringify({
        success: true,
        message: 'your message has been posted.',
        entry: newEntry,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Guestbook error:', error);
    return new Response(
      JSON.stringify({ error: 'an error occurred. please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

export const GET: APIRoute = async () => {
  try {
    const db = env.DB;

    const { results } = await db
      .prepare('SELECT id, name, message, timestamp, approved FROM guestbook WHERE approved = 1 ORDER BY timestamp DESC LIMIT 100')
      .all<GuestbookEntry>();

    return new Response(
      JSON.stringify({ entries: results }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error fetching guestbook:', error);
    return new Response(
      JSON.stringify({ error: 'failed to fetch guestbook entries.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};