// src/pages/api/guestbook.ts
import type { APIRoute } from 'astro';
import fs from 'fs';
import path from 'path';

// Configuration
const DATA_FILE = path.resolve(process.cwd(), 'guestbook-data.json');
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// TURNSTILE SECRET KEY - Get this from Cloudflare
const TURNSTILE_SECRET_KEY = import.meta.env.TURNSTILE_SECRET_KEY;

// In-memory rate limiting stores
const submissionAttempts: Record<string, { count: number; resetTime: number }> = {};

export interface GuestbookEntry {
  id: string;
  name: string;
  message: string;
  timestamp: string;
  approved: boolean;
  ip?: string;
}

// Load entries from JSON file - ALWAYS newest first
export function loadEntries(): GuestbookEntry[] {
  try {
    if (fs.existsSync(DATA_FILE)) {
      const data = fs.readFileSync(DATA_FILE, 'utf-8');
      const entries = JSON.parse(data);
      // Sort by timestamp descending (newest first)
      return entries.sort((a: GuestbookEntry, b: GuestbookEntry) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
    }
  } catch (e) {
    console.error('failed to load guestbook data:', e);
  }
  return [];
}

// Save entries to JSON file
export function saveEntries(entries: GuestbookEntry[]): void {
  try {
    // Sort before saving (newest first)
    const sorted = entries.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    fs.writeFileSync(DATA_FILE, JSON.stringify(sorted, null, 2));
  } catch (e) {
    console.error('failed to save guestbook data:', e);
  }
}

// Get visitor count (total unique IPs)
export function getVisitorCount(): number {
  const entries = loadEntries();
  const uniqueIps = new Set(entries.map(entry => entry.ip).filter(ip => ip));
  return uniqueIps.size;
}

// Verify Turnstile token
async function verifyTurnstile(token: string): Promise<boolean> {
  try {
    const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${TURNSTILE_SECRET_KEY}&response=${token}`,
    });
    
    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error('Turnstile verification error:', error);
    return false;
  }
}

// Get client IP from request
function getClientIP(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  return headers.get('x-real-ip') || 'unknown';
}

// POST: Submit a new guestbook entry
export const POST: APIRoute = async ({ request }) => {
  try {
    const ip = getClientIP(request);
    
    // Check rate limit
    const now = Date.now();
    const record = submissionAttempts[ip];
    
    if (record && now < record.resetTime) {
      if (record.count >= MAX_SUBMISSIONS_PER_WINDOW) {
        const waitTime = Math.ceil((record.resetTime - now) / 1000);
        return new Response(
          JSON.stringify({ 
            error: `too many submissions. please wait ${waitTime} seconds.`
          }),
          { 
            status: 429, 
            headers: { 'Content-Type': 'application/json' } 
          }
        );
      }
      record.count++;
    } else {
      submissionAttempts[ip] = { count: 1, resetTime: now + RATE_LIMIT_WINDOW };
    }

    // Parse form data
    const formData = await request.formData();
    const name = formData.get('name')?.toString().trim() || '';
    const message = formData.get('message')?.toString().trim() || '';
    const turnstileToken = formData.get('cf-turnstile-response')?.toString() || '';

    // Validate
    if (name.length < 2 || name.length > 30) {
      return new Response(
        JSON.stringify({ error: 'name must be between 2 and 30 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (message.length < 2 || message.length > 50) {
      return new Response(
        JSON.stringify({ error: 'message must be between 2 and 50 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Verify Turnstile
    if (!turnstileToken) {
      return new Response(
        JSON.stringify({ error: 'security verification failed. please refresh and try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const isHuman = await verifyTurnstile(turnstileToken);
    if (!isHuman) {
      return new Response(
        JSON.stringify({ error: 'security verification failed. please refresh and try again.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Create and save entry
    const entries = loadEntries();
    const newEntry: GuestbookEntry = {
      id: Date.now().toString(36) + Math.random().toString(36).substring(2, 7),
      name,
      message,
      timestamp: new Date().toISOString(),
      approved: false,
      ip: ip,
    };

    // Add to beginning of array (newest first)
    entries.unshift(newEntry);
    saveEntries(entries);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'your message has been submitted.',
        entry: newEntry,
        visitorCount: getVisitorCount()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('guestbook error:', error);
    return new Response(
      JSON.stringify({ error: 'an error occurred. please try again.' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// GET: Retrieve approved entries - ALREADY SORTED NEWEST FIRST
export const GET: APIRoute = async () => {
  try {
    const entries = loadEntries(); // This already sorts newest first
    const approvedEntries = entries
      .filter(entry => entry.approved)
      .slice(0, 100);
    
    return new Response(
      JSON.stringify({ 
        entries: approvedEntries,
        visitorCount: getVisitorCount()
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('error fetching guestbook:', error);
    return new Response(
      JSON.stringify({ error: 'failed to fetch guestbook entries' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
};

// Admin: Approve an entry
export async function approveEntry(id: string): Promise<boolean> {
  const entries = loadEntries();
  const entry = entries.find(e => e.id === id);
  if (entry) {
    entry.approved = true;
    saveEntries(entries);
    return true;
  }
  return false;
}

// Admin: Delete an entry
export async function deleteEntry(id: string): Promise<boolean> {
  const entries = loadEntries();
  const index = entries.findIndex(e => e.id === id);
  if (index !== -1) {
    entries.splice(index, 1);
    saveEntries(entries);
    return true;
  }
  return false;
}

// Admin: Get all entries
export function getAllEntries(): GuestbookEntry[] {
  return loadEntries();
}