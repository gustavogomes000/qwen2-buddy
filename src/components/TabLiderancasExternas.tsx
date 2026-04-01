import { useState, useEffect, useMemo, useCallback } from 'react';
import { Search, ChevronRight, ArrowLeft, Phone, MessageCircle, Loader2, Users, MapPin, ExternalLink } from 'lucide-react';
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

const Field = ({ label, value }: { label: string; value: any }) => (
  <div className="text-[11px] bg-background rounded-lg px-2.5 py-1.5">
    <span className="text-muted-foreground">{label}:</span>{' '}
    <span className={value ? 'text-foreground font-medium' : 'text-muted-foreground/50 italic'}>{value || '—'}</span>
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

  // Detail view
  if (selected) {
    const p = selected.pessoa;
    return (
      <div className="space-y-4 pb-24">
        <button onClick={() => setSelected(null)} className="flex items-center gap-1 text-sm text-muted-foreground active:scale-95">
          <ArrowLeft size={16} /> Voltar
        </button>

        <div className="section-card">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Users size={24} className="text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-bold text-foreground truncate">{selected.nome}</h2>
              <div className="flex items-center gap-2 mt-0.5">
                {selected.regiao_atuacao && (
                  <span className="text-[9px] text-muted-foreground flex items-center gap-0.5">
                    <MapPin size={8} />{selected.regiao_atuacao}
                  </span>
                )}
                <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-accent text-accent-foreground font-medium flex items-center gap-0.5">
                  <ExternalLink size={7} /> Sistema externo
                </span>
              </div>
            </div>
          </div>

          {/* Contato */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Contato</h3>
          <div className="grid grid-cols-2 gap-1 mb-4">
            <Field label="CPF" value={p?.cpf ? formatCPF(p.cpf) : null} />
            <Field label="Telefone" value={p?.telefone} />
            <Field label="WhatsApp" value={p?.whatsapp || selected.whatsapp} />
            <Field label="E-mail" value={p?.email} />
            <Field label="Instagram" value={p?.instagram} />
            <Field label="Facebook" value={p?.facebook} />
          </div>

          {/* Dados Eleitorais */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados Eleitorais</h3>
          <div className="grid grid-cols-2 gap-1 mb-4">
            <Field label="Título" value={p?.titulo_eleitor} />
            <Field label="Zona / Seção" value={p ? `${p.zona_eleitoral || '—'} / ${p.secao_eleitoral || '—'}` : null} />
            <Field label="Município / UF" value={p ? `${p.municipio_eleitoral || '—'} / ${p.uf_eleitoral || '—'}` : null} />
            <Field label="Colégio" value={p?.colegio_eleitoral} />
            <Field label="End. Colégio" value={p?.endereco_colegio} />
            <Field label="Situação" value={p?.situacao_titulo} />
          </div>

          {/* Dados da Liderança */}
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Dados da Liderança</h3>
          <div className="grid grid-cols-2 gap-1 mb-4">
            <Field label="Tipo" value={selected.tipo_lideranca} />
            <Field label="Região" value={selected.regiao_atuacao} />
            <Field label="Comprometimento" value={selected.nivel_comprometimento} />
            <Field label="Apoiadores" value={selected.apoiadores_estimados} />
            <Field label="Meta votos" value={selected.meta_votos} />
            <Field label="Status" value={selected.status} />
          </div>

          {selected.observacoes && (
            <>
              <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">Observações</h3>
              <p className="text-xs text-foreground bg-background rounded-lg p-2.5">{selected.observacoes}</p>
            </>
          )}

          {/* Quick actions */}
          {(p?.whatsapp || selected.whatsapp || p?.telefone) && (
            <div className="flex gap-2 mt-4">
              {(p?.whatsapp || selected.whatsapp) && (
                <a href={`https://wa.me/55${(p?.whatsapp || selected.whatsapp || '').replace(/\D/g, '')}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-green-500/10 text-green-600 rounded-xl text-sm font-semibold active:scale-95">
                  <MessageCircle size={16} /> WhatsApp
                </a>
              )}
              {p?.telefone && (
                <a href={`tel:${p.telefone}`}
                  className="flex-1 h-10 flex items-center justify-center gap-2 bg-primary/10 text-primary rounded-xl text-sm font-semibold active:scale-95">
                  <Phone size={16} /> Ligar
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="space-y-3 pb-24">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-full bg-accent flex items-center justify-center">
          <ExternalLink size={16} className="text-accent-foreground" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-foreground">Lideranças do Sistema Externo</h2>
          <p className="text-[10px] text-muted-foreground">Dados sincronizados automaticamente</p>
        </div>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Buscar por nome, região ou CPF..."
          className="w-full h-11 pl-9 pr-3 bg-card border border-border rounded-xl text-sm text-foreground outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} liderança{filtered.length !== 1 ? 's' : ''} externa{filtered.length !== 1 ? 's' : ''}</p>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-primary" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">Nenhuma liderança externa encontrada</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          {filtered.map(l => (
            <button
              key={l.id}
              onClick={() => setSelected(l)}
              className="w-full text-left p-3 rounded-xl bg-card border border-border hover:border-primary/30 transition-all active:scale-[0.98] flex items-center gap-3"
            >
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <span className="text-sm font-bold text-primary">{l.nome.charAt(0)}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">{l.nome}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  {l.regiao_atuacao && (
                    <span className="text-[9px] text-muted-foreground truncate">{l.regiao_atuacao}</span>
                  )}
                  {l.tipo_lideranca && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">{l.tipo_lideranca}</span>
                  )}
                </div>
              </div>
              <ChevronRight size={16} className="text-muted-foreground shrink-0" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
