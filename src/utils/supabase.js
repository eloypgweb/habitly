import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "";

let client = null;

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function getClient() {
  if (!isConfigured()) {
    return null;
  }

  if (!client) {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }

  return client;
}

async function ensureUserId() {
  const supabase = getClient();
  if (!supabase) {
    return null;
  }

  const sessionResult = await supabase.auth.getSession();
  const currentUserId = sessionResult.data.session?.user?.id;
  return currentUserId ?? null;
}

export function isRemotePersistenceEnabled() {
  return isConfigured();
}

export async function getCurrentUser() {
  const supabase = getClient();
  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) {
    throw error;
  }

  return data.user ?? null;
}

export async function signUpWithPassword(email, password) {
  const supabase = getClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithPassword(email, password) {
  const supabase = getClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.");
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signOutUser() {
  const supabase = getClient();
  if (!supabase) {
    return;
  }

  const { error } = await supabase.auth.signOut();
  if (error) {
    throw error;
  }
}

export async function loadRemoteState() {
  const supabase = getClient();
  if (!supabase) {
    return null;
  }

  const userId = await ensureUserId();
  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("user_states")
    .select("payload")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.payload ?? null;
}

export async function saveRemoteState(state) {
  const supabase = getClient();
  if (!supabase) {
    return;
  }

  const userId = await ensureUserId();
  if (!userId) {
    return;
  }

  const { error } = await supabase.from("user_states").upsert(
    {
      user_id: userId,
      payload: state,
      updated_at: new Date().toISOString(),
    },
    {
      onConflict: "user_id",
    },
  );

  if (error) {
    throw error;
  }
}
