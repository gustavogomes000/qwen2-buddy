import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-token',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const TOKEN_SECRETO = Deno.env.get('CADASTRO_EXTERNO_TOKEN');
    const tokenRecebido = req.headers.get('x-api-token');
    if (!tokenRecebido || tokenRecebido !== TOKEN_SECRETO) {
      return new Response(
        JSON.stringify({ erro: 'Token inválido ou ausente' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const externalSupabase = createClient(
      Deno.env.get('EXTERNAL_SUPABASE_URL')!,
      Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY') || Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY')!
    );

    // Fonte A — suplentes do banco externo
    const { data: suplentesExternos } = await externalSupabase
      .from('suplentes')
      .select('id, nome, partido, regiao_atuacao, situacao')
      .order('nome');

    // Fonte B — usuários locais desta plataforma
    const { data: usuariosLocais } = await supabaseAdmin
      .from('hierarquia_usuarios')
      .select('id, nome, tipo, municipio_id, municipios(nome)')
      .eq('ativo', true)
      .in('tipo', ['suplente', 'lideranca', 'coordenador'])
      .order('nome');

    function tipoLabel(tipo: string): string {
      const labels: Record<string, string> = {
        suplente: 'Suplente',
        lideranca: 'Liderança',
        coordenador: 'Coordenador',
      };
      return labels[tipo] ?? tipo;
    }

    const listaUnificada = [
      ...(suplentesExternos ?? []).map((s: any) => ({
        id: s.id,
        nome: s.nome,
        tipo: 'suplente',
        subtitulo: [s.partido, s.regiao_atuacao].filter(Boolean).join(' · '),
        municipio: null,
        fonte: 'externo',
      })),
      ...(usuariosLocais ?? []).map((u: any) => ({
        id: u.id,
        nome: u.nome,
        tipo: u.tipo,
        subtitulo: tipoLabel(u.tipo),
        municipio: (u.municipios as any)?.nome ?? null,
        fonte: 'local',
      })),
    ].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

    return new Response(
      JSON.stringify(listaUnificada),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Erro em listar-usuarios-externos:', error);
    return new Response(
      JSON.stringify({ erro: 'Erro interno do servidor' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
