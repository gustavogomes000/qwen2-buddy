// One-shot migration: create cadastros_fernanda table + RLS + add 'fernanda' enum value
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(supabaseUrl, serviceKey);

  const sqls: string[] = [
    // 1) add enum value
    `DO $$ BEGIN
       IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'fernanda' AND enumtypid = 'public.tipo_usuario'::regtype) THEN
         ALTER TYPE public.tipo_usuario ADD VALUE 'fernanda';
       END IF;
     END $$;`,
    // 2) create table
    `CREATE TABLE IF NOT EXISTS public.cadastros_fernanda (
       id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
       nome text NOT NULL,
       telefone text NOT NULL,
       cidade text,
       instagram text,
       cadastrado_por uuid,
       criado_em timestamptz NOT NULL DEFAULT now(),
       atualizado_em timestamptz NOT NULL DEFAULT now()
     );`,
    `CREATE INDEX IF NOT EXISTS idx_cadastros_fernanda_criado_em ON public.cadastros_fernanda (criado_em DESC);`,
    `CREATE INDEX IF NOT EXISTS idx_cadastros_fernanda_cadastrado_por ON public.cadastros_fernanda (cadastrado_por);`,
    // 3) RLS
    `ALTER TABLE public.cadastros_fernanda ENABLE ROW LEVEL SECURITY;`,
    `DROP POLICY IF EXISTS "Fernanda e admin selecionam" ON public.cadastros_fernanda;`,
    `CREATE POLICY "Fernanda e admin selecionam" ON public.cadastros_fernanda
       FOR SELECT TO authenticated
       USING (
         eh_admin_hierarquia()
         OR cadastrado_por = get_meu_usuario_id()
         OR EXISTS (SELECT 1 FROM hierarquia_usuarios h WHERE h.auth_user_id = auth.uid() AND h.tipo = 'fernanda')
       );`,
    `DROP POLICY IF EXISTS "Fernanda e admin inserem" ON public.cadastros_fernanda;`,
    `CREATE POLICY "Fernanda e admin inserem" ON public.cadastros_fernanda
       FOR INSERT TO authenticated
       WITH CHECK (
         eh_admin_hierarquia()
         OR EXISTS (SELECT 1 FROM hierarquia_usuarios h WHERE h.auth_user_id = auth.uid() AND h.tipo = 'fernanda')
       );`,
    `DROP POLICY IF EXISTS "Fernanda e admin atualizam" ON public.cadastros_fernanda;`,
    `CREATE POLICY "Fernanda e admin atualizam" ON public.cadastros_fernanda
       FOR UPDATE TO authenticated
       USING (
         eh_admin_hierarquia()
         OR EXISTS (SELECT 1 FROM hierarquia_usuarios h WHERE h.auth_user_id = auth.uid() AND h.tipo = 'fernanda')
       );`,
    `DROP POLICY IF EXISTS "Admin deleta cadastros_fernanda" ON public.cadastros_fernanda;`,
    `CREATE POLICY "Admin deleta cadastros_fernanda" ON public.cadastros_fernanda
       FOR DELETE TO authenticated
       USING (
         eh_admin_hierarquia()
         OR EXISTS (SELECT 1 FROM hierarquia_usuarios h WHERE h.auth_user_id = auth.uid() AND h.tipo = 'fernanda')
       );`,
  ];

  const results: any[] = [];
  for (const sql of sqls) {
    const { error } = await admin.rpc("exec_sql" as any, { sql }).then(
      (r) => r,
      async () => {
        // fallback: use direct query via PostgREST is not possible; use pg via fetch to the SQL rest
        const resp = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
          method: "POST",
          headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({ sql }),
        });
        return { error: resp.ok ? null : { message: await resp.text() } };
      }
    );
    results.push({ sql: sql.slice(0, 60), error: error?.message || null });
  }

  return new Response(JSON.stringify({ ok: true, results }, null, 2), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
