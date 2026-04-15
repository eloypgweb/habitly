import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = import.meta.env.PUBLIC_SUPABASE_ANON_KEY ?? "";

let client = null;

function isConfigured() {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

function normalizeIdentifier(identifier) {
  return identifier.trim();
}

function normalizeUsername(username) {
  return username.trim().toLowerCase();
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

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
  if (sessionError) {
    throw sessionError;
  }

  return sessionData.session?.user ?? null;
}

export async function resolveUsernameAvailability(username) {
  const supabase = getClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.");
  }

  const normalizedUsername = normalizeUsername(username);

  const { data, error } = await supabase.rpc("is_username_available", {
    p_username: normalizedUsername,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

async function resolveEmailByIdentifier(identifier) {
  const supabase = getClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.");
  }

  const normalizedIdentifier = normalizeIdentifier(identifier);
  if (!normalizedIdentifier) {
    throw new Error("Debes introducir correo o usuario.");
  }

  if (normalizedIdentifier.includes("@")) {
    return normalizedIdentifier;
  }

  const { data, error } = await supabase.rpc("get_login_email", {
    p_username: normalizeUsername(normalizedIdentifier),
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new Error("No existe un usuario con ese nombre.");
  }

  return String(data);
}

export async function signUpWithPassword(email, password, username) {
  const supabase = getClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.");
  }

  const normalizedUsername = normalizeUsername(username);

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        username: normalizedUsername,
      },
    },
  });

  if (error) {
    throw error;
  }

  return data;
}

export async function signInWithPassword(identifier, password) {
  const supabase = getClient();
  if (!supabase) {
    throw new Error("Supabase no configurado. Revisa variables PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY.");
  }

  const resolvedEmail = await resolveEmailByIdentifier(identifier);

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
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
