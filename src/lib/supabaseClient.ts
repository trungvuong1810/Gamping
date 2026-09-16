import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Environment variables for client-side Supabase if provided
const env = (import.meta as any).env || {};
const supabaseUrl = env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = env.VITE_SUPABASE_ANON_KEY || '';

let client: SupabaseClient | null = null;

if (supabaseUrl && supabaseAnonKey) {
  try {
    client = createClient(supabaseUrl, supabaseAnonKey);
  } catch (err) {
    console.warn('Failed to initialize Supabase client:', err);
  }
}

export const supabase = client;

export function isSupabaseConfigured(): boolean {
  return Boolean(client && supabaseUrl);
}
