import postgres from 'https://deno.land/x/postgresjs@v3.4.5/mod.js';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const dbUrl = Deno.env.get('SUPABASE_DB_URL')!;
  const sql = postgres(dbUrl);

  try {
    const results: string[] = [];

    // Indexes on liderancas
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_liderancas_municipio_id ON public.liderancas(municipio_id)`);
    results.push('idx_liderancas_municipio_id');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_liderancas_cadastrado_por ON public.liderancas(cadastrado_por)`);
    results.push('idx_liderancas_cadastrado_por');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_liderancas_criado_em ON public.liderancas(criado_em DESC)`);
    results.push('idx_liderancas_criado_em');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_liderancas_suplente_id ON public.liderancas(suplente_id)`);
    results.push('idx_liderancas_suplente_id');

    // Indexes on fiscais
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_fiscais_municipio_id ON public.fiscais(municipio_id)`);
    results.push('idx_fiscais_municipio_id');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_fiscais_cadastrado_por ON public.fiscais(cadastrado_por)`);
    results.push('idx_fiscais_cadastrado_por');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_fiscais_criado_em ON public.fiscais(criado_em DESC)`);
    results.push('idx_fiscais_criado_em');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_fiscais_suplente_id ON public.fiscais(suplente_id)`);
    results.push('idx_fiscais_suplente_id');

    // Indexes on possiveis_eleitores
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_eleitores_municipio_id ON public.possiveis_eleitores(municipio_id)`);
    results.push('idx_eleitores_municipio_id');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_eleitores_cadastrado_por ON public.possiveis_eleitores(cadastrado_por)`);
    results.push('idx_eleitores_cadastrado_por');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_eleitores_criado_em ON public.possiveis_eleitores(criado_em DESC)`);
    results.push('idx_eleitores_criado_em');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_eleitores_suplente_id ON public.possiveis_eleitores(suplente_id)`);
    results.push('idx_eleitores_suplente_id');

    // Indexes on pessoas (for joins)
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_pessoas_cpf ON public.pessoas(cpf)`);
    results.push('idx_pessoas_cpf');

    // Indexes on hierarquia_usuarios
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_hierarquia_auth_user_id ON public.hierarquia_usuarios(auth_user_id)`);
    results.push('idx_hierarquia_auth_user_id');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_hierarquia_superior_id ON public.hierarquia_usuarios(superior_id)`);
    results.push('idx_hierarquia_superior_id');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_hierarquia_municipio_id ON public.hierarquia_usuarios(municipio_id)`);
    results.push('idx_hierarquia_municipio_id');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_hierarquia_tipo_ativo ON public.hierarquia_usuarios(tipo, ativo)`);
    results.push('idx_hierarquia_tipo_ativo');

    // Composite indexes for common query patterns
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_liderancas_mun_criado ON public.liderancas(municipio_id, criado_em DESC)`);
    results.push('idx_liderancas_mun_criado');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_fiscais_mun_criado ON public.fiscais(municipio_id, criado_em DESC)`);
    results.push('idx_fiscais_mun_criado');
    await sql.unsafe(`CREATE INDEX IF NOT EXISTS idx_eleitores_mun_criado ON public.possiveis_eleitores(municipio_id, criado_em DESC)`);
    results.push('idx_eleitores_mun_criado');

    // Analyze tables to update statistics
    await sql.unsafe(`ANALYZE public.liderancas`);
    await sql.unsafe(`ANALYZE public.fiscais`);
    await sql.unsafe(`ANALYZE public.possiveis_eleitores`);
    await sql.unsafe(`ANALYZE public.pessoas`);
    await sql.unsafe(`ANALYZE public.hierarquia_usuarios`);
    results.push('ANALYZE complete');

    await sql.end();

    return new Response(
      JSON.stringify({ success: true, indexes_created: results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    await sql.end();
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
