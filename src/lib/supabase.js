/**
 * Supabase Client
 * Reusable client for database operations
 */

import { createClient } from '@supabase/supabase-js';

// Initialize with environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

// Validate configuration
if (!supabaseUrl || !supabaseAnonKey) {
    console.warn('⚠️  Supabase not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in .env');
}

// Create client (will be null if not configured)
export const supabase = supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null;

/**
 * Check if Supabase is configured and available
 */
export function isSupabaseConfigured() {
    return supabase !== null;
}

/**
 * Create admin client with service role key
 * Use only in server-side scripts (migrations, admin operations)
 */
export function createAdminClient() {
    const serviceKey = process.env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !serviceKey) {
        throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY required for admin client');
    }

    return createClient(supabaseUrl, serviceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });
}
