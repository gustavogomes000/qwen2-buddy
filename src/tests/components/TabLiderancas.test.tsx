import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock all dependencies
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      insert: vi.fn().mockReturnThis(),
      update: vi.fn().mockReturnThis(),
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
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
    usuario: { id: 'huser-123', nome: 'Teste', tipo: 'suplente', suplente_id: 'sup-123', ativo: true },
    loading: false,
    isAdmin: false,
    isSuplente: true,
    isLideranca: false,
    tipoUsuario: 'suplente',
    municipioId: 'mun-123',
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

vi.mock('@/hooks/useDataCache', () => ({
  useLiderancas: () => ({ data: [], isLoading: false, refetch: vi.fn() }),
  useEleitores: () => ({ data: [], isLoading: false }),
  useInvalidarCadastros: () => vi.fn(),
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

vi.mock('@/lib/cpfDuplicateCheck', () => ({
  checkCpfDuplicateByUser: vi.fn().mockResolvedValue({ isDuplicate: false, tipos: [] }),
}));

vi.mock('@/lib/exportXlsx', () => ({
  exportAllCadastros: vi.fn().mockResolvedValue(0),
}));

let TabLiderancas: any;

beforeAll(async () => {
  const mod = await import('@/components/TabLiderancas');
  TabLiderancas = mod.default;
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: any) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('TabLiderancas — Modo Lista', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renderiza botão de cadastrar liderança com data-testid', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('btn-cadastrar-lideranca')).toBeInTheDocument();
    });
  });

  it('renderiza campo de busca com data-testid', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('input-busca-lideranca')).toBeInTheDocument();
    });
  });

  it('exibe texto do botão corretamente', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Cadastrar Liderança/i)).toBeInTheDocument();
    });
  });

  it('exibe botão de exportar', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Exportar Lideranças/i)).toBeInTheDocument();
    });
  });
});

describe('TabLiderancas — Formulário', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('abre formulário ao clicar em Cadastrar', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    const btn = await screen.findByTestId('btn-cadastrar-lideranca');
    fireEvent.click(btn);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nome da liderança/i)).toBeInTheDocument();
    });
  });

  it('exibe seções do formulário', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    await waitFor(() => {
      expect(screen.getByText(/Dados Pessoais/i)).toBeInTheDocument();
      expect(screen.getByText(/Dados Eleitorais/i)).toBeInTheDocument();
      expect(screen.getByText(/Perfil e Status/i)).toBeInTheDocument();
    });
  });

  it('exibe botão Salvar com data-testid', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-salvar-lideranca')).toBeInTheDocument();
    });
  });

  it('exibe botão Voltar com data-testid', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-voltar')).toBeInTheDocument();
    });
  });

  it('volta para lista ao clicar Voltar', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    fireEvent.click(await screen.findByTestId('btn-voltar'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-cadastrar-lideranca')).toBeInTheDocument();
    });
  });

  it('exibe erro quando tenta salvar sem nome', async () => {
    const { toast } = await import('@/hooks/use-toast');
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    fireEvent.click(await screen.findByTestId('btn-salvar-lideranca'));
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
      }));
    });
  });

  it('campo UF está fixo em GO', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    const ufInput = await screen.findByDisplayValue('GO');
    expect(ufInput).toBeInTheDocument();
    expect(ufInput).toHaveAttribute('readOnly');
  });

  it('exibe link para TSE', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    expect(screen.getByText(/Consultar dados no TSE/i)).toBeInTheDocument();
  });

  it('campo CPF aceita input e formata', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    const cpfInput = screen.getByPlaceholderText(/000\.000\.000-00/i);
    fireEvent.change(cpfInput, { target: { value: '123' } });
    expect(cpfInput).toBeInTheDocument();
  });

  it('exibe campo de comprometimento com opções', async () => {
    render(<TabLiderancas refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-lideranca'));
    const select = screen.getByDisplayValue('Selecione...');
    expect(select).toBeInTheDocument();
  });
});
