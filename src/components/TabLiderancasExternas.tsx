import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Search, ChevronRight, ArrowLeft, Phone, MessageCircle,
  Loader2, Users, MapPin, ExternalLink, Star, Target,
  UserCheck, RefreshCw, Hash
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { formatCPF } from '@/lib/cpf';

interface PessoaExterna {
  cpf: string | null;
  telefone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram: string | null;
  facebook: string | null;
  titulo_eleitor: string | null;
  zona_eleitoral: string | null;
  secao_eleitoral: string | null;
  municipio_eleitoral: string | null;
  uf_eleitoral: string | null;
  colegio_eleitoral: string | null;
  endereco_colegio: string | null;
  situacao_titulo: string | null;
}

interface LiderancaExterna {
  id: string;
  nome: string;
  regiao_atuacao: string | null;
  whatsapp: string | null;
  status: string | null;
  tipo_lideranca: string | null;
  nivel_comprometimento: string | null;
  apoiadores_estimados: number | null;
  meta_votos: number | null;
  observacoes: string | null;
  criado_em: string | null;
  pessoa: PessoaExterna | null;
}

const statusColor = (s: string | null) => {
  if (!s) return 'bg-muted text-muted-foreground';
  const low = s.toLowerCase();
  if (low.includes('ativ')) return 'bg-green-500/15 text-green-600';
  if (low.includes('inativ') || low.includes('parad')) return 'bg-destructive/15 text-destructive';
  if (low.includes('pend')) return 'bg-yellow-500/15 text-yellow-600';
  return 'bg-accent text-accent-foreground';
};

const Field = ({ label, value, icon: Icon }: { label: string; value: any; icon?: any }) => (
  <div className="flex items-start gap-2 p-2.5 bg-background rounded-xl">
    {Icon && <Icon size={12} className="text-muted-foreground mt-0.5 shrink-0" />}
    <div className="min-w-0">
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider leading-none mb-0.5">{label}</p>
      <p className={`text-xs leading-tight ${value ? 'text-foreground font-medium' : 'text-muted-foreground/40 italic'}`}>
        {value || '—'}
      </p>
    </div>
  </div>
);

const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] flex items-center gap-2">
      <span className="h-px flex-1 bg-border" />
      {title}
      <span className="h-px flex-1 bg-border" />
    </h3>
    <div className="grid grid-cols-2 gap-1.5">
      {children}
    </div>
  </div>
);

export default function TabLiderancasExternas() {
  const [liderancas, setLiderancas] = useState<LiderancaExterna[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<LiderancaExterna | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('buscar-liderancas-externo');
      if (!error && data) setLiderancas(data);
    } catch (err) {
      console.error('Erro ao buscar lideranças externas:', err);
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = useMemo(() => {
    if (!search) return liderancas;
    const q = search.toLowerCase();
    return liderancas.filter(l =>
      l.nome.toLowerCase().includes(q) ||
      l.regiao_atuacao?.toLowerCase().includes(q) ||
      l.pessoa?.cpf?.includes(q)
    );
  }, [liderancas, search]);

  const stats = useMemo(() => ({
    total: liderancas.length,
    ativos: liderancas.filter(l => l.status?.toLowerCase().includes('ativ') && !l.status?.toLowerCase().includes('inativ')).length,
    comMeta: liderancas.filter(l => l.meta_votos && l.meta_votos > 0).length,
  }), [liderancas]);

  // ── Detail view ──
  if (selected) {
    const p = selected.pessoa;
    return (
      <div className="space-y-4 pb-24 animate-in slide-in-from-right-4 duration-200">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1.5 text-sm text-primary font-medium active:scale-95 transition-transform">
          <ArrowLeft size={16} /> Voltar à lista
        </button>

        {/* Header card */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/5 via-card to-accent/5 border border-border p-5">
          <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 rounded-full -translate-y-8 translate-x-8" />
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
              <span className="text-xl font-black text-primary">{selected.nome.charAt(0)}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-black text-foreground truncate">{selected.nome}</h2>
              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                {selected.regiao_atuacao && (
                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 bg-background/80 px-2 py-0.5 rounded-full">
                    <MapPin size={9} />{selected.regiao_atuacao}
                  </span>
                )}
                {selected.status && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-semibold ${statusColor(selected.status)}`}>
                    {selected.status}
                  </span>
                )}
                <span className="text-[9px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground font-medium flex items-center gap-0.5">
                  <ExternalLink size={7} /> Externo
                </span>
              </div>
            </div>
          </div>

          {/* Quick stats */}
          {(selected.apoiadores_estimados || selected.meta_votos) && (
            <div className="flex gap-3 mt-4">
              {selected.apoiadores_estimados != null && (
                <div className="flex-1 bg-background/60 backdrop-blur rounded-xl p-3 text-center border border-border/50">
                  <p className="text-lg font-black text-primary">{selected.apoiadores_estimados}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Apoiadores</p>
                </div>
              )}
              {selected.meta_votos != null && (
                <div className="flex-1 bg-background/60 backdrop-blur rounded-xl p-3 text-center border border-border/50">
                  <p className="text-lg font-black text-primary">{selected.meta_votos}</p>
                  <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Meta votos</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quick actions */}
        {(p?.whatsapp || selected.whatsapp || p?.telefone) && (
          <div className="flex gap-2">
            {(p?.whatsapp || selected.whatsapp) && (
              <a href={`https://wa.me/55${(p?.whatsapp || selected.whatsapp || '').replace(/\D/g, '')}`}
                target="_blank" rel="noopener noreferrer"
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 rounded-xl text-sm font-bold active:scale-95 transition-all border border-green-500/20">
                <MessageCircle size={16} /> WhatsApp
              </a>
            )}
            {p?.telefone && (
              <a href={`tel:${p.telefone}`}
                className="flex-1 h-11 flex items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary rounded-xl text-sm font-bold active:scale-95 transition-all border border-primary/20">
                <Phone size={16} /> Ligar
              </a>
            )}
          </div>
        )}

        {/* Detail sections */}
        <div className="rounded-2xl bg-card border border-border p-4 space-y-5">
          <Section title="Contato">
            <Field label="CPF" value={p?.cpf ? formatCPF(p.cpf) : null} icon={Hash} />
            <Field label="Telefone" value={p?.telefone} icon={Phone} />
            <Field label="WhatsApp" value={p?.whatsapp || selected.whatsapp} icon={MessageCircle} />
            <Field label="E-mail" value={p?.email} />
            <Field label="Instagram" value={p?.instagram} />
            <Field label="Facebook" value={p?.facebook} />
          </Section>

          <Section title="Dados Eleitorais">
            <Field label="Título" value={p?.titulo_eleitor} />
            <Field label="Zona / Seção" value={p ? `${p.zona_eleitoral || '—'} / ${p.secao_eleitoral || '—'}` : null} />
            <Field label="Município / UF" value={p ? `${p.municipio_eleitoral || '—'} / ${p.uf_eleitoral || '—'}` : null} icon={MapPin} />
            <Field label="Colégio" value={p?.colegio_eleitoral} />
            <Field label="End. Colégio" value={p?.endereco_colegio} />
            <Field label="Situação" value={p?.situacao_titulo} icon={UserCheck} />
          </Section>

          <Section title="Liderança">
            <Field label="Tipo" value={selected.tipo_lideranca} icon={Star} />
            <Field label="Região" value={selected.regiao_atuacao} icon={MapPin} />
            <Field label="Comprometimento" value={selected.nivel_comprometimento} icon={Target} />
            <Field label="Status" value={selected.status} />
          </Section>

          {selected.observacoes && (
            <div className="space-y-2">
              <h3 className="text-[10px] font-bold text-primary uppercase tracking-[0.15em] flex items-center gap-2">
                <span className="h-px flex-1 bg-border" />
                Observações
                <span className="h-px flex-1 bg-border" />
              </h3>
              <p className="text-xs text-foreground bg-background rounded-xl p-3 leading-relaxed border border-border/50">{selected.observacoes}</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 border border-primary/10 flex items-center justify-center">
            <ExternalLink size={18} className="text-primary" />
          </div>
          <div>
            <h2 className="text-base font-black text-foreground">Lideranças Externas</h2>
            <p className="text-[10px] text-muted-foreground">Sincronizado do sistema parceiro</p>
          </div>
        </div>
        <button onClick={fetchData} disabled={loading} className="w-9 h-9 rounded-xl bg-card border border-border flex items-center justify-center text-muted-foreground hover:text-primary active:scale-90 transition-all">
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
        </button>
      </div>

      {/* Stats */}
      {!loading && liderancas.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-black text-foreground">{stats.total}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Total</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-black text-green-600">{stats.ativos}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Ativos</p>
          </div>
          <div className="bg-card border border-border rounded-xl p-3 text-center">
            <p className="text-lg font-black text-primary">{stats.comMeta}</p>
            <p className="text-[9px] text-muted-foreground uppercase tracking-wider">Com Meta</p>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, região ou CPF..."
          className="w-full h-11 pl-9 pr-3 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30 transition-shadow"
        />
      </div>

      {search && (
        <p className="text-[10px] text-muted-foreground">{filtered.length} resultado{filtered.length !== 1 ? 's' : ''}</p>
      )}

      {/* List */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 size={28} className="animate-spin text-primary" />
          <p className="text-xs text-muted-foreground">Carregando lideranças externas...</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto mb-3">
            <Users size={24} className="text-muted-foreground" />
          </div>
          <p className="text-sm font-semibold text-muted-foreground">Nenhuma liderança encontrada</p>
          <p className="text-xs text-muted-foreground/60 mt-1">Tente buscar com outros termos</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((l, i) => (
            <button
              key={l.id}
              onClick={() => setSelected(l)}
              className="w-full text-left p-3.5 rounded-xl bg-card border border-border hover:border-primary/30 hover:shadow-sm transition-all active:scale-[0.98] flex items-center gap-3 group"
              style={{ animationDelay: `${i * 30}ms` }}
            >
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-black text-primary">{l.nome.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate group-hover:text-primary transition-colors">{l.nome}</p>
                <div className="flex items-center gap-1.5 mt-1 flex-wrap">
                  {l.regiao_atuacao && (
                    <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                      <MapPin size={8} />{l.regiao_atuacao}
                    </span>
                  )}
                  {l.tipo_lideranca && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-semibold">{l.tipo_lideranca}</span>
                  )}
                  {l.status && (
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-semibold ${statusColor(l.status)}`}>{l.status}</span>
                  )}
                </div>
              </div>
              {l.meta_votos != null && l.meta_votos > 0 && (
                <div className="text-center shrink-0 mr-1">
                  <p className="text-xs font-black text-primary">{l.meta_votos}</p>
                  <p className="text-[8px] text-muted-foreground">votos</p>
                </div>
              )}
              <ChevronRight size={16} className="text-muted-foreground/40 group-hover:text-primary shrink-0 transition-colors" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
