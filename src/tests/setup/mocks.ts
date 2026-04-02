import { vi } from 'vitest';

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      range: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
      single: vi.fn().mockResolvedValue({ data: null, error: null }),
      then: vi.fn().mockImplementation((cb) => cb({ data: [], error: null })),
    })),
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: null }, error: null }),
      onAuthStateChange: vi.fn().mockReturnValue({ data: { subscription: { unsubscribe: vi.fn() } } }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: [], error: null }),
    },
  },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: vi.fn(() => ({
    user: { id: 'user-123' },
    usuario: {
      id: 'huser-123',
      nome: 'Usuário Teste',
      tipo: 'suplente',
      suplente_id: 'sup-123',
      ativo: true,
    },
    loading: false,
    isAdmin: false,
    isSuplente: true,
    isLideranca: false,
    tipoUsuario: 'suplente',
    municipioId: 'mun-123',
    municipioNome: 'Aparecida de Goiânia',
    signIn: vi.fn(),
    signOut: vi.fn(),
  })),
  AuthProvider: ({ children }: any) => children,
}));

vi.mock('@/contexts/CidadeContext', () => ({
  useCidade: vi.fn(() => ({
    cidadeAtiva: { id: 'mun-123', nome: 'Aparecida de Goiânia' },
    isTodasCidades: false,
    municipios: [],
    nomeMunicipioPorId: vi.fn(() => 'Aparecida de Goiânia'),
  })),
  CidadeProvider: ({ children }: any) => children,
}));

vi.mock('@/hooks/use-toast', () => ({
  toast: vi.fn(),
}));

vi.mock('@/lib/resolverLigacaoPolitica', () => ({
  resolverLigacaoPolitica: vi.fn().mockResolvedValue({
    bloqueado: true,
    nomeFixo: 'Suplente Teste',
    subtitulo: 'Partido X',
    suplenteId: 'sup-123',
    liderancaId: null,
    municipioId: 'mun-123',
  }),
}));
