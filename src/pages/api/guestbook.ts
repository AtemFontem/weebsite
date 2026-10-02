// src/pages/api/guestbook.ts
import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
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
  console.log('[verifyTurnstile] called');
  console.log('[verifyTurnstile] token length:', token.length);
  console.log('[verifyTurnstile] secret is set:', !!secret);
  console.log('[verifyTurnstile] secret starts with:', secret ? secret.substring(0, 10) + '...' : 'NOT SET');

  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`,
    });

    console.log('[verifyTurnstile] response status:', response.status);

    const data = await response.json() as {
      success: boolean;
      'error-codes'?: string[];
      challenge_ts?: string;
      hostname?: string;
      action?: string;
      cdata?: string;
    };

    console.log('[verifyTurnstile] full response:', JSON.stringify(data));

    if (!data.success) {
      console.error('[verifyTurnstile] FAILED. Error codes:', data['error-codes']);
      console.error('[verifyTurnstile] hostname:', data.hostname);
      console.error('[verifyTurnstile] action:', data.action);
    }

    return data.success === true;
  } catch (error) {
    console.error('[verifyTurnstile] fetch error:', error);
    return false;
  }
}

export const POST: APIRoute = async ({ request }) => {
  console.log('[guestbook POST] request received');

  try {
    const db = env.DB;
    const turnstileSecret = env.TURNSTILE_SECRET_KEY;

    console.log('[guestbook POST] env.DB is set:', !!db);
    console.log('[guestbook POST] env.TURNSTILE_SECRET_KEY is set:', !!turnstileSecret);

    if (!db) {
      console.error('[guestbook POST] DB binding is missing');
      return new Response(
        JSON.stringify({ error: 'database unavailable.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!turnstileSecret) {
      console.error('[guestbook POST] TURNSTILE_SECRET_KEY is missing');
      return new Response(
        JSON.stringify({ error: 'verification unavailable.' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

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

    console.log('[guestbook POST] name:', name);
    console.log('[guestbook POST] message length:', message.length);
    console.log('[guestbook POST] turnstile token length:', turnstileToken.length);

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
      console.error('[guestbook POST] no turnstile token in form data');
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

    console.log('[guestbook POST] entry inserted:', id);

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
    console.error('[guestbook POST] error:', error);
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
    console.error('[guestbook GET] error:', error);
    return new Response(
      JSON.stringify({ error: 'failed to fetch guestbook entries.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};