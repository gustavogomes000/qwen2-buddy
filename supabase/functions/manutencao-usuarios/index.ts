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
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Verify caller is super_admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Não autenticado' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const token = authHeader.replace('Bearer ', '');
    const { data: { user: caller } } = await supabaseAdmin.auth.getUser(token);
    if (!caller) {
      return new Response(JSON.stringify({ error: 'Token inválido' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const { data: callerH } = await supabaseAdmin
      .from('hierarquia_usuarios')
      .select('tipo')
      .eq('auth_user_id', caller.id)
      .eq('ativo', true)
      .maybeSingle();
    if (!callerH || !['super_admin', 'coordenador'].includes(callerH.tipo)) {
      return new Response(JSON.stringify({ error: 'Sem permissão' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json().catch(() => ({}));
    const acao = body.acao;

    // ── RESETAR SENHAS ──
    if (acao === 'resetar_senhas') {
      const novaSenha = body.nova_senha || '123456';
      const excluirNomes = (body.excluir_nomes || []).map((n: string) => n.trim().toLowerCase());

      const { data: usuarios } = await supabaseAdmin
        .from('hierarquia_usuarios')
        .select('id, nome, auth_user_id')
        .eq('ativo', true)
        .not('auth_user_id', 'is', null);

      const resultados: any[] = [];
      let atualizados = 0;
      let pulados = 0;

      for (const u of (usuarios || [])) {
        const nomeLower = u.nome.trim().toLowerCase();
        if (excluirNomes.some((ex: string) => nomeLower.includes(ex))) {
          resultados.push({ nome: u.nome, status: 'pulado', motivo: 'Na lista de exclusão' });
          pulados++;
          continue;
        }
        if (!u.auth_user_id) continue;

        try {
          const { error } = await supabaseAdmin.auth.admin.updateUserById(u.auth_user_id, {
            password: novaSenha,
          });
          if (error) {
            resultados.push({ nome: u.nome, status: 'erro', motivo: error.message });
          } else {
            resultados.push({ nome: u.nome, status: 'atualizado' });
            atualizados++;
          }
        } catch (e) {
          resultados.push({ nome: u.nome, status: 'erro', motivo: String(e) });
        }
      }

      return new Response(JSON.stringify({
        resumo: { atualizados, pulados, total: (usuarios || []).length },
        detalhes: resultados,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── APAGAR USUARIOS TESTE ──
    if (acao === 'apagar_teste') {
      const pattern = body.pattern || 'teste';

      const { data: usuarios } = await supabaseAdmin
        .from('hierarquia_usuarios')
        .select('id, nome, auth_user_id')
        .ilike('nome', `%${pattern}%`);

      const resultados: any[] = [];
      let apagados = 0;

      for (const u of (usuarios || [])) {
        // Delete auth user if exists
        if (u.auth_user_id) {
          try {
            await supabaseAdmin.auth.admin.deleteUser(u.auth_user_id);
          } catch (e) {
            console.error('Erro deletar auth:', e);
          }
        }
        // Deactivate/delete from hierarquia
        await supabaseAdmin.from('hierarquia_usuarios')
          .update({ ativo: false })
          .eq('id', u.id);

        resultados.push({ nome: u.nome, status: 'removido' });
        apagados++;
      }

      return new Response(JSON.stringify({
        resumo: { apagados, total: (usuarios || []).length },
        detalhes: resultados,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── LISTAR TODOS ──
    if (acao === 'listar') {
      const { data: usuarios } = await supabaseAdmin
        .from('hierarquia_usuarios')
        .select('id, nome, tipo, auth_user_id, ativo')
        .order('nome');

      return new Response(JSON.stringify({ usuarios }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // ── DIAGNÓSTICO COMPLETO ──
    if (acao === 'diagnostico') {
      const [
        { data: usuarios },
        { count: totalLid },
        { count: totalEle },
        { count: totalFis },
        { data: suplentes },
      ] = await Promise.all([
        supabaseAdmin.from('hierarquia_usuarios').select('id, nome, tipo, suplente_id, municipio_id, ativo').eq('ativo', true).order('nome'),
        supabaseAdmin.from('liderancas').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('possiveis_eleitores').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('fiscais').select('id', { count: 'exact', head: true }),
        supabaseAdmin.from('suplentes').select('id, nome, cargo_disputado'),
      ]);

      return new Response(JSON.stringify({
        usuarios_ativos: usuarios?.length || 0,
        lista_usuarios: usuarios,
        total_liderancas: totalLid || 0,
        total_eleitores: totalEle || 0,
        total_fiscais: totalFis || 0,
        suplentes_com_cargo: suplentes?.filter(s => s.cargo_disputado) || [],
        suplentes_todos: suplentes || [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // ── ATUALIZAR CARGO/PROFISSÃO ──
    if (acao === 'atualizar_cargo') {
      const { nome_busca, cargo } = body;
      if (!nome_busca || !cargo) {
        return new Response(JSON.stringify({ error: 'nome_busca e cargo são obrigatórios' }), {
          status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const { data: users } = await supabaseAdmin
        .from('hierarquia_usuarios')
        .select('id, nome, suplente_id, tipo')
        .ilike('nome', `%${nome_busca}%`)
        .eq('ativo', true);

      if (!users || users.length === 0) {
        return new Response(JSON.stringify({ ok: false, erro: 'Usuário não encontrado' }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const user = users[0];
      let updated = false;
      let detalhes = '';

      if (user.suplente_id) {
        const { error } = await supabaseAdmin
          .from('suplentes')
          .update({ cargo_disputado: cargo, updated_at: new Date().toISOString() })
          .eq('id', user.suplente_id);
        updated = !error;
        detalhes = error ? `Erro: ${error.message}` : `Atualizado suplente ${user.suplente_id}`;
      } else if (user.tipo === 'suplente') {
        // Livre suplente - create suplente record
        const { error } = await supabaseAdmin
          .from('suplentes')
          .upsert({
            id: user.id,
            nome: user.nome,
            cargo_disputado: cargo,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'id' });

        if (!error) {
          await supabaseAdmin
            .from('hierarquia_usuarios')
            .update({ suplente_id: user.id })
            .eq('id', user.id);
          updated = true;
          detalhes = `Criado suplente livre com cargo e vinculado`;
        } else {
          detalhes = `Erro: ${error.message}`;
        }
      } else {
        detalhes = `Usuário tipo ${user.tipo} sem suplente_id — não é possível atribuir cargo`;
      }

      return new Response(JSON.stringify({ ok: updated, usuario: user, detalhes }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ error: 'Ação inválida. Use: resetar_senhas, apagar_teste, listar, diagnostico, atualizar_cargo' }), {
      status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Erro interno' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
