import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalUrl = Deno.env.get('EXTERNAL_SUPABASE_URL');
    const externalKey = Deno.env.get('EXTERNAL_SUPABASE_SERVICE_KEY') || Deno.env.get('EXTERNAL_SUPABASE_ANON_KEY');

    if (!externalUrl || !externalKey) {
      return new Response(JSON.stringify([]), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const externalSupabase = createClient(externalUrl, externalKey);

    const [lRes, pRes] = await Promise.all([
      externalSupabase.from('liderancas').select('*'),
      externalSupabase.from('pessoas').select('id, nome, cpf, telefone, whatsapp, email, instagram, facebook, titulo_eleitor, zona_eleitoral, secao_eleitoral, municipio_eleitoral, uf_eleitoral, colegio_eleitoral, endereco_colegio, situacao_titulo'),
    ]);

    if (lRes.error && pRes.error) {
      const { data, error } = await externalSupabase
        .from('liderancas')
        .select('id, nome, regiao_atuacao, whatsapp, status, tipo_lideranca, nivel_comprometimento, apoiadores_estimados, meta_votos, observacoes, criado_em')
        .order('nome');

      if (error) {
        console.error('Fallback also failed:', error);
        return new Response(JSON.stringify([]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(JSON.stringify(
        (data || []).map((l: any) => ({
          id: l.id,
          nome: l.nome || '—',
          regiao_atuacao: l.regiao_atuacao || null,
          whatsapp: l.whatsapp || null,
          status: l.status || null,
          tipo_lideranca: l.tipo_lideranca || null,
          nivel_comprometimento: l.nivel_comprometimento || null,
          apoiadores_estimados: l.apoiadores_estimados || null,
          meta_votos: l.meta_votos || null,
          observacoes: l.observacoes || null,
          criado_em: l.criado_em || null,
          pessoa: null,
        }))
      ), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!lRes.error && lRes.data) {
      const pessoasById = new Map(
        (pRes.data ?? []).map((p: any) => [p.id, p])
      );

      const result = (lRes.data || []).map((l: any) => {
        const pessoa = pessoasById.get(l.pessoa_id);
        return {
          id: l.id,
          nome: pessoa?.nome || l.nome || '—',
          regiao_atuacao: l.regiao_atuacao || l.regiao || null,
          whatsapp: pessoa?.whatsapp || l.whatsapp || null,
          status: l.status || null,
          tipo_lideranca: l.tipo_lideranca || null,
          nivel_comprometimento: l.nivel_comprometimento || null,
          apoiadores_estimados: l.apoiadores_estimados || null,
          meta_votos: l.meta_votos || null,
          observacoes: l.observacoes || null,
          criado_em: l.criado_em || null,
          pessoa: pessoa ? {
            cpf: pessoa.cpf || null,
            telefone: pessoa.telefone || null,
            whatsapp: pessoa.whatsapp || null,
            email: pessoa.email || null,
            instagram: pessoa.instagram || null,
            facebook: pessoa.facebook || null,
            titulo_eleitor: pessoa.titulo_eleitor || null,
            zona_eleitoral: pessoa.zona_eleitoral || null,
            secao_eleitoral: pessoa.secao_eleitoral || null,
            municipio_eleitoral: pessoa.municipio_eleitoral || null,
            uf_eleitoral: pessoa.uf_eleitoral || null,
            colegio_eleitoral: pessoa.colegio_eleitoral || null,
            endereco_colegio: pessoa.endereco_colegio || null,
            situacao_titulo: pessoa.situacao_titulo || null,
          } : null,
        };
      });

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify([]), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify([]), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
