import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';

let client: SupabaseClient | null = null;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(supabaseUrl && supabaseAnonKey);
}

export function getSupabaseClient(): SupabaseClient | null {
  if (!isSupabaseConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(supabaseUrl as string, supabaseAnonKey as string, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
      },
    });
  }

  return client;
}

export async function getCurrentUser(): Promise<User | null> {
  const supabase = getSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user;
}

export async function signInWithGoogle(origin: string): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) {
    throw new Error('SUPABASE_NOT_CONFIGURED');
  }

  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${origin}/`,
    },
  });

  if (error) {
    throw error;
  }
}

export async function signOutSupabase(): Promise<void> {
  const supabase = getSupabaseClient();
  if (!supabase) return;

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export function subscribeAuthChange(callback: () => void): (() => void) {
  const supabase = getSupabaseClient();
  if (!supabase) {
    return () => {};
  }

  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(() => {
    callback();
  });

  return () => subscription.unsubscribe();
}
