import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export class SupabaseConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SupabaseConfigError";
  }
}

let cachedClient: SupabaseClient | null = null;

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!url || !serviceRoleKey) {
    throw new SupabaseConfigError(
      "Configuração do Supabase incompleta no servidor. Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local."
    );
  }

  if (!/^https?:\/\//i.test(url)) {
    throw new SupabaseConfigError(
      "SUPABASE_URL inválida no servidor: informe a Project URL do Supabase iniciando com https:// (ex.: https://<projeto>.supabase.co), não a chave publishable."
    );
  }

  const normalizedUrl = new URL(url).origin;

  if (!cachedClient) {
    cachedClient = createClient(normalizedUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  }

  return cachedClient;
}
