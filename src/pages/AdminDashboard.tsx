import { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCidade } from '@/contexts/CidadeContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import {
  ArrowLeft, Users, Shield, Target, Filter, Search,
  ChevronDown, ChevronUp, UserCheck, Loader2, Download, Eye, Trophy,
  BarChart3, UserCog, Building2, Plus, MapPin
} from 'lucide-react';
import { exportAllCadastros } from '@/lib/exportXlsx';
import {
  ResponsiveContainer, CartesianGrid, XAxis, YAxis, Tooltip, BarChart, Bar
} from 'recharts';
import SeletorCidade from '@/components/SeletorCidade';

/* ── types ── */
interface Pessoa {
  nome: string;
  cpf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  zona_eleitoral: string | null;
  secao_eleitoral: string | null;
}

interface LiderancaReg {
  id: string;
  criado_em: string;
  cadastrado_por: string | null;
  suplente_id: string | null;
  status: string | null;
  regiao_atuacao: string | null;
  tipo_lideranca: string | null;
  municipio_id: string | null;
  origem_captacao: string | null;
  pessoas: Pessoa | null;
}

interface FiscalReg {
  id: string;
  criado_em: string;
  cadastrado_por: string | null;
  suplente_id: string | null;
  status: string | null;
  zona_fiscal: string | null;
  secao_fiscal: string | null;
  colegio_eleitoral: string | null;
  municipio_id: string | null;
  origem_captacao: string | null;
  pessoas: Pessoa | null;
}

interface EleitorReg {
  id: string;
  criado_em: string;
  cadastrado_por: string | null;
  suplente_id: string | null;
  compromisso_voto: string | null;
  municipio_id: string | null;
  origem_captacao: string | null;
  pessoas: Pessoa | null;
}

interface HierarquiaUsuario {
  id: string;
  nome: string;
  tipo: string;
  suplente_id: string | null;
  municipio_id: string | null;
  ativo: boolean | null;
}

/* ── helpers ── */
const TIPO_COLORS: Record<string, string> = {
  lideranca: 'hsl(217 91% 60%)',
  fiscal: 'hsl(142 71% 45%)',
  eleitor: 'hsl(280 70% 55%)',
};

type Periodo = 'hoje' | 'semana' | 'mes' | 'total';
type TipoFiltro = 'todos' | 'lideranca' | 'fiscal' | 'eleitor';
type VistaAtiva = 'resumo' | 'ranking' | 'usuarios' | 'registros' | 'cidades';

export default function AdminDashboard() {
  const { isAdmin } = useAuth();
  const { municipios, isTodasCidades, cidadeAtiva, setCidadeAtiva, nomeMunicipioPorId } = useCidade();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [periodo, setPeriodo] = useState<Periodo>('total');
  const [tipoFiltro, setTipoFiltro] = useState<TipoFiltro>('todos');
  const [vistaAtiva, setVistaAtiva] = useState<VistaAtiva>('resumo');
  const [searchTerm, setSearchTerm] = useState('');
  const [exporting, setExporting] = useState(false);
  const [userCityFilter, setUserCityFilter] = useState<string>('todos');

  const [liderancas, setLiderancas] = useState<LiderancaReg[]>([]);
  const [fiscais, setFiscais] = useState<FiscalReg[]>([]);
  const [eleitores, setEleitores] = useState<EleitorReg[]>([]);
  const [usuarios, setUsuarios] = useState<HierarquiaUsuario[]>([]);

  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [expandedTipo, setExpandedTipo] = useState<string | null>(null);

  const filtroMunicipioId = useMemo(() =>
    isTodasCidades ? null : cidadeAtiva?.id || null
  , [isTodasCidades, cidadeAtiva]);

  const fetchData = useCallback(async () => {
    setLoading(true);

    let lQuery = (supabase as any).from('liderancas').select('id, criado_em, cadastrado_por, suplente_id, status, regiao_atuacao, tipo_lideranca, municipio_id, origem_captacao, pessoas(nome, cpf, telefone, whatsapp, zona_eleitoral, secao_eleitoral)').order('criado_em', { ascending: false }).limit(2000);
    let fQuery = (supabase as any).from('fiscais').select('id, criado_em, cadastrado_por, suplente_id, status, zona_fiscal, secao_fiscal, colegio_eleitoral, municipio_id, origem_captacao, pessoas(nome, cpf, telefone, whatsapp, zona_eleitoral, secao_eleitoral)').order('criado_em', { ascending: false }).limit(2000);
    let eQuery = (supabase as any).from('possiveis_eleitores').select('id, criado_em, cadastrado_por, suplente_id, compromisso_voto, municipio_id, origem_captacao, pessoas(nome, cpf, telefone, whatsapp, zona_eleitoral, secao_eleitoral)').order('criado_em', { ascending: false }).limit(2000);

    if (filtroMunicipioId) {
      lQuery = lQuery.eq('municipio_id', filtroMunicipioId);
      fQuery = fQuery.eq('municipio_id', filtroMunicipioId);
      eQuery = eQuery.eq('municipio_id', filtroMunicipioId);
    }

    const [lRes, fRes, eRes, uRes] = await Promise.all([
      lQuery, fQuery, eQuery,
      supabase.from('hierarquia_usuarios').select('id, nome, tipo, suplente_id, municipio_id, ativo').eq('ativo', true).order('nome'),
    ]);

    setLiderancas((lRes.data || []) as any);
    setFiscais((fRes.data || []) as any);
    setEleitores((eRes.data || []) as any);
    setUsuarios((uRes.data || []) as any);
    setLoading(false);
  }, [filtroMunicipioId]);

  useEffect(() => {
    if (!isAdmin) { navigate('/'); return; }
    fetchData();
  }, [isAdmin, fetchData]);

  const handleExport = async (tipo?: 'lideranca' | 'fiscal' | 'eleitor') => {
    setExporting(true);
    try {
      const count = await exportAllCadastros(tipo);
      toast({ title: `✅ ${count} registros exportados!` });
    } catch (err: any) {
      toast({ title: 'Erro ao exportar', description: err.message, variant: 'destructive' });
    } finally { setExporting(false); }
  };

  /* ── date boundaries ── */
  const hoje = useMemo(() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; }, []);
  const inicioSemana = useMemo(() => { const d = new Date(hoje); d.setDate(d.getDate() - d.getDay()); return d; }, [hoje]);
  const inicioMes = useMemo(() => new Date(hoje.getFullYear(), hoje.getMonth(), 1), [hoje]);

  const getDateFilter = (p: Periodo) => {
    if (p === 'hoje') return hoje;
    if (p === 'semana') return inicioSemana;
    if (p === 'mes') return inicioMes;
    return null;
  };

  const dateFilter = (criado_em: string) => {
    const dateLimit = getDateFilter(periodo);
    if (!dateLimit) return true;
    return new Date(criado_em) >= dateLimit;
  };

  const filteredLiderancas = useMemo(() => liderancas.filter(r => dateFilter(r.criado_em)), [liderancas, periodo]);
  const filteredFiscais = useMemo(() => fiscais.filter(r => dateFilter(r.criado_em)), [fiscais, periodo]);
  const filteredEleitores = useMemo(() => eleitores.filter(r => dateFilter(r.criado_em)), [eleitores, periodo]);

  const totais = useMemo(() => ({
    liderancas: filteredLiderancas.length,
    fiscais: filteredFiscais.length,
    eleitores: filteredEleitores.length,
    total: filteredLiderancas.length + filteredFiscais.length + filteredEleitores.length,
  }), [filteredLiderancas, filteredFiscais, filteredEleitores]);

  const totalVisitas = useMemo(() => {
    return [...filteredLiderancas, ...filteredFiscais, ...filteredEleitores]
      .filter(r => (r as any).origem_captacao === 'visita_comite').length;
  }, [filteredLiderancas, filteredFiscais, filteredEleitores]);

  /* ── Ranking por usuário ── */
  const rankingUsuarios = useMemo(() => {
    const map: Record<string, { l: number; f: number; e: number }> = {};
    filteredLiderancas.forEach(r => { if (!r.cadastrado_por) return; if (!map[r.cadastrado_por]) map[r.cadastrado_por] = { l: 0, f: 0, e: 0 }; map[r.cadastrado_por].l++; });
    filteredFiscais.forEach(r => { if (!r.cadastrado_por) return; if (!map[r.cadastrado_por]) map[r.cadastrado_por] = { l: 0, f: 0, e: 0 }; map[r.cadastrado_por].f++; });
    filteredEleitores.forEach(r => { if (!r.cadastrado_por) return; if (!map[r.cadastrado_por]) map[r.cadastrado_por] = { l: 0, f: 0, e: 0 }; map[r.cadastrado_por].e++; });

    return Object.entries(map)
      .map(([id, stats]) => {
        const u = usuarios.find(u => u.id === id);
        return { id, nome: u?.nome || 'Desconhecido', tipo: u?.tipo || '—', municipio_id: u?.municipio_id || null, total: stats.l + stats.f + stats.e, ...stats };
      })
      .sort((a, b) => b.total - a.total);
  }, [filteredLiderancas, filteredFiscais, filteredEleitores, usuarios]);

  /* ── Dados do usuário expandido ── */
  const usuarioExpandido = useMemo(() => {
    if (!expandedUser) return null;
    return {
      liderancas: filteredLiderancas.filter(r => r.cadastrado_por === expandedUser),
      fiscais: filteredFiscais.filter(r => r.cadastrado_por === expandedUser),
      eleitores: filteredEleitores.filter(r => r.cadastrado_por === expandedUser),
    };
  }, [expandedUser, filteredLiderancas, filteredFiscais, filteredEleitores]);

  /* ── All registros ── */
  const allRegistros = useMemo(() => {
    let result: { tipo: string; pessoa: Pessoa | null; criado_em: string; cadastrado_por: string | null; extra: string; origem: string | null }[] = [];
    if (tipoFiltro === 'todos' || tipoFiltro === 'lideranca') {
      filteredLiderancas.forEach(r => result.push({ tipo: 'lideranca', pessoa: r.pessoas, criado_em: r.criado_em, cadastrado_por: r.cadastrado_por, extra: r.status || '', origem: r.origem_captacao }));
    }
    if (tipoFiltro === 'todos' || tipoFiltro === 'fiscal') {
      filteredFiscais.forEach(r => result.push({ tipo: 'fiscal', pessoa: r.pessoas, criado_em: r.criado_em, cadastrado_por: r.cadastrado_por, extra: `Z${r.zona_fiscal || '?'} S${r.secao_fiscal || '?'}`, origem: r.origem_captacao }));
    }
    if (tipoFiltro === 'todos' || tipoFiltro === 'eleitor') {
      filteredEleitores.forEach(r => result.push({ tipo: 'eleitor', pessoa: r.pessoas, criado_em: r.criado_em, cadastrado_por: r.cadastrado_por, extra: r.compromisso_voto || '', origem: r.origem_captacao }));
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      result = result.filter(r => r.pessoa?.nome?.toLowerCase().includes(s) || r.pessoa?.cpf?.includes(s));
    }
    return result.sort((a, b) => new Date(b.criado_em).getTime() - new Date(a.criado_em).getTime());
  }, [filteredLiderancas, filteredFiscais, filteredEleitores, tipoFiltro, searchTerm]);

  /* ── timeline ── */
  const timelineData = useMemo(() => {
    const map: Record<string, { liderancas: number; fiscais: number; eleitores: number }> = {};
    const addToMap = (criado_em: string, tipo: string) => {
      const d = new Date(criado_em);
      const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`;
      if (!map[key]) map[key] = { liderancas: 0, fiscais: 0, eleitores: 0 };
      if (tipo === 'lideranca') map[key].liderancas++;
      if (tipo === 'fiscal') map[key].fiscais++;
      if (tipo === 'eleitor') map[key].eleitores++;
    };
    filteredLiderancas.forEach(r => addToMap(r.criado_em, 'lideranca'));
    filteredFiscais.forEach(r => addToMap(r.criado_em, 'fiscal'));
    filteredEleitores.forEach(r => addToMap(r.criado_em, 'eleitor'));
    return Object.entries(map)
      .sort(([a], [b]) => { const [da, ma] = a.split('/').map(Number); const [db, mb] = b.split('/').map(Number); return ma !== mb ? ma - mb : da - db; })
      .map(([dia, vals]) => ({ dia, ...vals, total: vals.liderancas + vals.fiscais + vals.eleitores }));
  }, [filteredLiderancas, filteredFiscais, filteredEleitores]);

  const tipoLabel = (t: string) => {
    const labels: Record<string, string> = { super_admin: 'Admin', coordenador: 'Coord.', suplente: 'Suplente', lideranca: 'Liderança', fiscal: 'Fiscal' };
    return labels[t] || t;
  };

  const getMedalEmoji = (i: number) => i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `${i + 1}º`;
  const getUserName = (id: string | null) => {
    if (!id) return '—';
    return usuarios.find(u => u.id === id)?.nome || '—';
  };

  const periodoLabels: Record<Periodo, string> = { hoje: 'Hoje', semana: 'Semana', mes: 'Mês', total: 'Total' };
  const tipoFiltroLabels: Record<TipoFiltro, string> = { todos: 'Todos', lideranca: 'Lideranças', fiscal: 'Fiscais', eleitor: 'Eleitores' };
  const vistaLabels: { id: VistaAtiva; icon: typeof BarChart3; label: string }[] = [
    { id: 'resumo', icon: BarChart3, label: 'Resumo' },
    { id: 'ranking', icon: Trophy, label: 'Ranking' },
    { id: 'usuarios', icon: UserCog, label: 'Usuários' },
    { id: 'registros', icon: Eye, label: 'Registros' },
    ...(municipios.length > 1 ? [{ id: 'cidades' as VistaAtiva, icon: Building2, label: 'Cidades' }] : []),
  ];

  // Users filtered by city filter in "usuarios" tab
  const filteredUsuariosTab = useMemo(() => {
    let list = usuarios.filter(u => u.tipo !== 'super_admin');
    if (userCityFilter !== 'todos') {
      list = list.filter(u => u.municipio_id === userCityFilter);
    }
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(u => u.nome.toLowerCase().includes(s));
    }
    return list;
  }, [usuarios, userCityFilter, searchTerm]);

  // Group users by type for the usuarios tab
  const usersByType = useMemo(() => {
    const groups: Record<string, typeof filteredUsuariosTab> = {};
    filteredUsuariosTab.forEach(u => {
      if (!groups[u.tipo]) groups[u.tipo] = [];
      groups[u.tipo].push(u);
    });
    return groups;
  }, [filteredUsuariosTab]);

  const tipoOrder = ['coordenador', 'suplente', 'lideranca', 'fiscal'];

  if (loading) {
    return (
      <div className="h-full bg-background flex items-center justify-center">
        <Loader2 size={28} className="animate-spin text-primary" />
      </div>
    );
  }

  const renderRegistroCard = (r: any, tipo: string) => {
    const colors: Record<string, { bg: string; fg: string }> = {
      lideranca: { bg: 'hsla(217, 91%, 60%, 0.1)', fg: TIPO_COLORS.lideranca },
      fiscal: { bg: 'hsla(142, 71%, 45%, 0.1)', fg: TIPO_COLORS.fiscal },
      eleitor: { bg: 'hsla(280, 70%, 55%, 0.1)', fg: TIPO_COLORS.eleitor },
    };
    const c = colors[tipo] || colors.lideranca;
    const isVisita = r.origem_captacao === 'visita_comite';

    return (
      <div key={r.id} className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center gap-3 p-3">
          <div className="w-9 h-9 rounded-full flex items-center justify-center shrink-0" style={{ background: c.bg }}>
            <span className="text-xs font-bold" style={{ color: c.fg }}>{(r.pessoas?.nome || '?').charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground truncate">{r.pessoas?.nome || '—'}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {r.status && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">{r.status}</span>}
              {r.compromisso_voto && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-muted text-muted-foreground">{r.compromisso_voto}</span>}
              {isVisita && <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium bg-blue-500/10 text-blue-600">Visita</span>}
            </div>
          </div>
          <span className="text-[10px] text-muted-foreground shrink-0">{new Date(r.criado_em).toLocaleDateString('pt-BR')}</span>
        </div>
        <div className="px-3 pb-2.5 grid grid-cols-2 gap-x-4 gap-y-1">
          {r.pessoas?.cpf && <div className="flex justify-between"><span className="text-[10px] text-muted-foreground">CPF</span><span className="text-[10px] font-medium text-foreground">{r.pessoas.cpf}</span></div>}
          {r.pessoas?.telefone && <div className="flex justify-between"><span className="text-[10px] text-muted-foreground">Tel</span><a href={`tel:${r.pessoas.telefone}`} className="text-[10px] font-medium text-primary">{r.pessoas.telefone}</a></div>}
          {r.pessoas?.whatsapp && <div className="flex justify-between"><span className="text-[10px] text-muted-foreground">WhatsApp</span><span className="text-[10px] font-medium text-foreground">{r.pessoas.whatsapp}</span></div>}
          {r.pessoas?.zona_eleitoral && <div className="flex justify-between"><span className="text-[10px] text-muted-foreground">Zona</span><span className="text-[10px] font-medium text-foreground">{r.pessoas.zona_eleitoral}</span></div>}
          {r.pessoas?.secao_eleitoral && <div className="flex justify-between"><span className="text-[10px] text-muted-foreground">Seção</span><span className="text-[10px] font-medium text-foreground">{r.pessoas.secao_eleitoral}</span></div>}
        </div>
      </div>
    );
  };

  return (
    <div className="h-full bg-background overflow-y-auto overscroll-contain pb-8">
      <div className="h-[1.5px] gradient-header" />

      <header className="sticky top-0 z-40 bg-background/95 backdrop-blur-xl border-b border-border">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate('/')} className="p-1.5 rounded-xl hover:bg-muted active:scale-95 transition-all">
            <ArrowLeft size={20} className="text-foreground" />
          </button>
          <div className="flex-1">
            <h1 className="text-lg font-bold text-foreground">Painel Admin</h1>
            <p className="text-[10px] text-muted-foreground">Visão completa da rede</p>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-primary">{totais.total}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">cadastros</p>
          </div>
        </div>
        {municipios.length > 1 && (
          <div className="max-w-3xl mx-auto px-4 pb-2">
            <SeletorCidade />
          </div>
        )}
      </header>

      <div className="max-w-3xl mx-auto px-4 py-4 space-y-4">

        {/* ── Card Cadastros por Visita ── */}
        <button onClick={() => navigate('/admin/externos')}
          className="w-full flex items-center justify-between p-4 rounded-xl border border-border bg-card active:scale-[0.98] transition-transform">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <UserCheck size={18} className="text-blue-600" />
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold">Cadastros por Visita</p>
              <p className="text-[11px] text-muted-foreground">Via visita ao comitê</p>
            </div>
          </div>
          {totalVisitas > 0 && (
            <span className="bg-blue-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full min-w-[24px] text-center">
              {totalVisitas}
            </span>
          )}
        </button>

        {/* ── Navegação de vistas ── */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
          {vistaLabels.map(({ id, icon: Icon, label }) => (
            <button key={id} onClick={() => { setVistaAtiva(id); setSearchTerm(''); setExpandedUser(null); }}
              className={`shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${
                vistaAtiva === id ? 'gradient-primary text-white shadow-sm' : 'bg-muted text-muted-foreground'
              }`}>
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* ── Filtros ── */}
        <div className="section-card">
          <div className="flex items-center gap-2 mb-3">
            <Filter size={14} className="text-primary" />
            <h2 className="text-xs font-bold text-foreground uppercase tracking-wider">Filtros</h2>
          </div>
          <div className="space-y-2">
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(Object.keys(periodoLabels) as Periodo[]).map(p => (
                <button key={p} onClick={() => setPeriodo(p)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                    periodo === p ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>{periodoLabels[p]}</button>
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto pb-1">
              {(Object.keys(tipoFiltroLabels) as TipoFiltro[]).map(t => (
                <button key={t} onClick={() => setTipoFiltro(t)}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                    tipoFiltro === t ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>{tipoFiltroLabels[t]}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ══════════ RESUMO ══════════ */}
        {vistaAtiva === 'resumo' && (
          <>
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Users, label: 'Lideranças', value: totais.liderancas, color: TIPO_COLORS.lideranca },
                { icon: Shield, label: 'Fiscais', value: totais.fiscais, color: TIPO_COLORS.fiscal },
                { icon: Target, label: 'Eleitores', value: totais.eleitores, color: TIPO_COLORS.eleitor },
              ].map(({ icon: Icon, label, value, color }) => (
                <div key={label} className="section-card text-center">
                  <Icon size={18} className="mx-auto mb-1" style={{ color }} />
                  <p className="text-xl font-bold text-foreground">{value}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">{label}</p>
                </div>
              ))}
            </div>

            {/* Usuários ativos */}
            <div className="section-card">
              <h2 className="section-title">👥 Usuários Ativos</h2>
              <div className="grid grid-cols-2 gap-2">
                {['suplente', 'lideranca', 'fiscal', 'coordenador'].map(tipo => {
                  const count = usuarios.filter(u => u.tipo === tipo).length;
                  if (count === 0) return null;
                  return (
                    <div key={tipo} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                      <span className="text-xs text-muted-foreground">{tipoLabel(tipo)}</span>
                      <span className="text-sm font-bold text-foreground">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {timelineData.length > 0 && (
              <div className="section-card">
                <h2 className="section-title">📈 Cadastros por Dia</h2>
                <div className="h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={timelineData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                      <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                      <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 12, fontSize: 12 }} />
                      <Bar dataKey="liderancas" name="Lideranças" stackId="a" fill={TIPO_COLORS.lideranca} />
                      <Bar dataKey="fiscais" name="Fiscais" stackId="a" fill={TIPO_COLORS.fiscal} />
                      <Bar dataKey="eleitores" name="Eleitores" stackId="a" fill={TIPO_COLORS.eleitor} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* Top 5 */}
            <div className="section-card">
              <h2 className="section-title">🔥 Top 5 – Quem mais cadastrou</h2>
              <div className="space-y-1.5">
                {rankingUsuarios.slice(0, 5).map((u, i) => (
                  <div key={u.id} className="flex items-center gap-2 p-2.5 rounded-xl bg-muted/50 border border-border/50">
                    <span className="text-base w-7 text-center shrink-0">{getMedalEmoji(i)}</span>
                    <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{u.nome.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.nome}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">{tipoLabel(u.tipo)}</span>
                        {u.municipio_id && <span className="text-[9px] text-muted-foreground">· {nomeMunicipioPorId(u.municipio_id) || ''}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {u.l > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(217, 91%, 60%, 0.1)', color: TIPO_COLORS.lideranca }}>{u.l}</span>}
                      {u.f > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(142, 71%, 45%, 0.1)', color: TIPO_COLORS.fiscal }}>{u.f}</span>}
                      {u.e > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(280, 70%, 55%, 0.1)', color: TIPO_COLORS.eleitor }}>{u.e}</span>}
                    </div>
                    <p className="text-sm font-bold text-primary shrink-0">{u.total}</p>
                  </div>
                ))}
              </div>
            </div>

            <button onClick={() => handleExport()} disabled={exporting}
              className="w-full h-10 flex items-center justify-center gap-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground active:scale-[0.97] transition-all disabled:opacity-50">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exportar Todos (CSV)
            </button>
          </>
        )}

        {/* ══════════ RANKING ══════════ */}
        {vistaAtiva === 'ranking' && (
          <div className="section-card">
            <h2 className="section-title">🏆 Ranking Completo</h2>
            {rankingUsuarios.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">Nenhum cadastro no período</p>
            ) : (
              <div className="space-y-1.5">
                {rankingUsuarios.map((u, i) => (
                  <div key={u.id} className={`flex items-center gap-2 p-3 rounded-xl border transition-all ${
                    i === 0 ? 'border-amber-400/40 bg-amber-500/5' : i === 1 ? 'border-slate-400/30 bg-slate-500/5' : i === 2 ? 'border-orange-400/30 bg-orange-500/5' : 'border-border bg-card'
                  }`}>
                    <span className="text-lg w-8 text-center shrink-0">{getMedalEmoji(i)}</span>
                    <div className="w-9 h-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <span className="text-sm font-bold text-primary">{u.nome.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{u.nome}</p>
                      <div className="flex items-center gap-1">
                        <span className="text-[9px] text-muted-foreground">{tipoLabel(u.tipo)}</span>
                        {u.municipio_id && <span className="text-[9px] text-muted-foreground flex items-center gap-0.5"><MapPin size={8} />{nomeMunicipioPorId(u.municipio_id)}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      {u.l > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(217, 91%, 60%, 0.1)', color: TIPO_COLORS.lideranca }}>L{u.l}</span>}
                      {u.f > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(142, 71%, 45%, 0.1)', color: TIPO_COLORS.fiscal }}>F{u.f}</span>}
                      {u.e > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(280, 70%, 55%, 0.1)', color: TIPO_COLORS.eleitor }}>E{u.e}</span>}
                    </div>
                    <p className="text-lg font-bold text-primary shrink-0">{u.total}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══════════ USUÁRIOS (agrupados por tipo, com filtro cidade) ══════════ */}
        {vistaAtiva === 'usuarios' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Buscar usuário..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground" />
            </div>

            {/* City filter for users */}
            {municipios.length > 1 && (
              <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                <button onClick={() => setUserCityFilter('todos')}
                  className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                    userCityFilter === 'todos' ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground'
                  }`}>Todas cidades</button>
                {municipios.map(m => (
                  <button key={m.id} onClick={() => setUserCityFilter(m.id)}
                    className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-semibold transition-all active:scale-95 ${
                      userCityFilter === m.id ? 'gradient-primary text-white' : 'bg-muted text-muted-foreground'
                    }`}>{m.nome}</button>
                ))}
              </div>
            )}

            <p className="text-xs text-muted-foreground">{filteredUsuariosTab.length} usuário{filteredUsuariosTab.length !== 1 ? 's' : ''}</p>

            {tipoOrder.map(tipo => {
              const group = usersByType[tipo];
              if (!group || group.length === 0) return null;
              return (
                <div key={tipo} className="space-y-2">
                  <h3 className="text-xs font-bold text-foreground uppercase tracking-wider flex items-center gap-2">
                    {tipoLabel(tipo)}
                    <span className="text-[10px] font-normal text-muted-foreground">({group.length})</span>
                  </h3>
                  {group.map(u => {
                    const uL = filteredLiderancas.filter(r => r.cadastrado_por === u.id);
                    const uF = filteredFiscais.filter(r => r.cadastrado_por === u.id);
                    const uE = filteredEleitores.filter(r => r.cadastrado_por === u.id);
                    const total = uL.length + uF.length + uE.length;
                    const isExpanded = expandedUser === u.id;
                    const cityName = nomeMunicipioPorId(u.municipio_id);

                    return (
                      <div key={u.id} className="section-card !p-0 overflow-hidden">
                        <button
                          onClick={() => { setExpandedUser(isExpanded ? null : u.id); setExpandedTipo(null); }}
                          className="w-full text-left p-3 flex items-center gap-3 active:bg-muted/50 transition-all"
                        >
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                            <span className="text-sm font-bold text-primary">{u.nome.charAt(0)}</span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-foreground truncate">{u.nome}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              {cityName && (
                                <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                                  <MapPin size={8} />{cityName}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-1 shrink-0">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(217, 91%, 60%, 0.1)', color: TIPO_COLORS.lideranca }}>{uL.length}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(142, 71%, 45%, 0.1)', color: TIPO_COLORS.fiscal }}>{uF.length}</span>
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: 'hsla(280, 70%, 55%, 0.1)', color: TIPO_COLORS.eleitor }}>{uE.length}</span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <p className="text-lg font-bold text-primary">{total}</p>
                            {isExpanded ? <ChevronUp size={14} className="text-muted-foreground" /> : <ChevronDown size={14} className="text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && usuarioExpandido && (
                          <div className="border-t border-border px-3 pb-3 pt-2 space-y-2">
                            <div className="flex gap-1.5">
                              {[
                                { key: 'lideranca', label: `Lideranças (${usuarioExpandido.liderancas.length})`, color: TIPO_COLORS.lideranca },
                                { key: 'fiscal', label: `Fiscais (${usuarioExpandido.fiscais.length})`, color: TIPO_COLORS.fiscal },
                                { key: 'eleitor', label: `Eleitores (${usuarioExpandido.eleitores.length})`, color: TIPO_COLORS.eleitor },
                              ].map(({ key, label, color }) => (
                                <button key={key}
                                  onClick={() => setExpandedTipo(expandedTipo === key ? null : key)}
                                  className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                                    expandedTipo === key ? 'text-white' : 'bg-muted text-muted-foreground'
                                  }`}
                                  style={expandedTipo === key ? { background: color } : undefined}
                                >{label}</button>
                              ))}
                            </div>

                            {expandedTipo === 'lideranca' && (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {usuarioExpandido.liderancas.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">Nenhuma liderança</p>
                                ) : usuarioExpandido.liderancas.map(r => renderRegistroCard(r, 'lideranca'))}
                              </div>
                            )}
                            {expandedTipo === 'fiscal' && (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {usuarioExpandido.fiscais.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum fiscal</p>
                                ) : usuarioExpandido.fiscais.map(r => renderRegistroCard(r, 'fiscal'))}
                              </div>
                            )}
                            {expandedTipo === 'eleitor' && (
                              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                                {usuarioExpandido.eleitores.length === 0 ? (
                                  <p className="text-xs text-muted-foreground text-center py-4">Nenhum eleitor</p>
                                ) : usuarioExpandido.eleitores.map(r => renderRegistroCard(r, 'eleitor'))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        )}

        {/* ══════════ REGISTROS ══════════ */}
        {vistaAtiva === 'registros' && (
          <div className="space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input type="text" placeholder="Buscar por nome ou CPF..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl bg-muted border border-border text-sm text-foreground placeholder:text-muted-foreground" />
            </div>

            <p className="text-xs text-muted-foreground">{allRegistros.length} registros encontrados</p>

            <div className="space-y-1.5 max-h-[600px] overflow-y-auto">
              {allRegistros.map((r, i) => (
                <div key={i} className="flex items-start gap-2 p-2.5 rounded-xl bg-card border border-border">
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: TIPO_COLORS[r.tipo] }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-foreground truncate">{r.pessoa?.nome || '—'}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[10px] text-muted-foreground">
                      <span>{r.pessoa?.cpf || 'Sem CPF'}</span>
                      <span>{r.pessoa?.telefone || 'Sem tel.'}</span>
                      <span>{r.extra}</span>
                      {r.origem === 'visita_comite' && <span className="text-blue-600 font-medium">Visita</span>}
                    </div>
                    <p className="text-[9px] text-primary/70 mt-0.5">
                      Por: {getUserName(r.cadastrado_por)} · {new Date(r.criado_em).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <span className="text-[9px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{
                    background: r.tipo === 'lideranca' ? 'hsla(217, 91%, 60%, 0.1)' : r.tipo === 'fiscal' ? 'hsla(142, 71%, 45%, 0.1)' : 'hsla(280, 70%, 55%, 0.1)',
                    color: TIPO_COLORS[r.tipo]
                  }}>
                    {r.tipo === 'lideranca' ? 'Liderança' : r.tipo === 'fiscal' ? 'Fiscal' : 'Eleitor'}
                  </span>
                </div>
              ))}
            </div>

            <button onClick={() => handleExport(tipoFiltro === 'todos' ? undefined : tipoFiltro as any)} disabled={exporting}
              className="w-full h-10 flex items-center justify-center gap-2 bg-card border border-border rounded-xl text-sm font-medium text-foreground active:scale-[0.97] transition-all disabled:opacity-50">
              {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
              Exportar {tipoFiltro === 'todos' ? 'Todos' : tipoFiltroLabels[tipoFiltro]} (CSV)
            </button>
          </div>
        )}

        {/* ══════════ CIDADES ══════════ */}
        {vistaAtiva === 'cidades' && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input type="text" placeholder="Nome da nova cidade..." id="nova-cidade-input"
                className="flex-1 h-10 px-3 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30" />
              <button
                onClick={async () => {
                  const input = document.getElementById('nova-cidade-input') as HTMLInputElement;
                  const nome = input?.value?.trim();
                  if (!nome) return;
                  const { error } = await (supabase as any).from('municipios').insert({ nome, uf: 'GO' });
                  if (error) { toast({ title: 'Erro', description: error.message, variant: 'destructive' }); return; }
                  toast({ title: `✅ ${nome} adicionada!` });
                  input.value = '';
                  fetchData();
                }}
                className="h-10 px-4 gradient-primary text-white rounded-xl text-sm font-semibold flex items-center gap-1 active:scale-95">
                <Plus size={14} /> Adicionar
              </button>
            </div>

            {municipios.map(m => {
              const lidCount = liderancas.filter((l: any) => l.municipio_id === m.id).length;
              const fisCount = fiscais.filter((f: any) => (f as any).municipio_id === m.id).length;
              const eleCount = eleitores.filter((e: any) => (e as any).municipio_id === m.id).length;
              const userCount = usuarios.filter(u => u.municipio_id === m.id).length;
              const totalCity = lidCount + fisCount + eleCount;

              return (
                <div key={m.id} className="section-card">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <Building2 size={18} className="text-primary" />
                      <div>
                        <p className="text-sm font-bold text-foreground">{m.nome}</p>
                        <p className="text-[10px] text-muted-foreground">{m.uf} · {userCount} usuários</p>
                      </div>
                    </div>
                    <button onClick={() => { setCidadeAtiva({ id: m.id, nome: m.nome }); setVistaAtiva('usuarios'); setUserCityFilter(m.id); }}
                      className="text-[10px] text-primary font-semibold px-2 py-1 rounded-lg bg-primary/5 active:scale-95">
                      Ver →
                    </button>
                  </div>
                  <div className="flex items-center gap-3 mt-2 pt-2 border-t border-border">
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Users size={10} /> {lidCount} lid.</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Shield size={10} /> {fisCount} fisc.</span>
                    <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><Target size={10} /> {eleCount} eleit.</span>
                    <span className="ml-auto text-xs font-bold text-primary">{totalCity}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

      </div>
    </div>
  );
}
