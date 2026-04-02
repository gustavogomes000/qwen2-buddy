import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeAll, beforeEach } from 'vitest';
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

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
  useEleitores: () => ({ data: [], isLoading: false }),
  useLiderancas: () => ({ data: [], isLoading: false }),
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

let TabEleitores: any;

beforeAll(async () => {
  const mod = await import('@/components/TabEleitores');
  TabEleitores = mod.default;
});

const createWrapper = () => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: any) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe('TabEleitores — Modo Lista', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('renderiza botão de cadastrar eleitor com data-testid', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('btn-cadastrar-eleitor')).toBeInTheDocument();
    });
  });

  it('renderiza campo de busca com data-testid', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByTestId('input-busca-eleitor')).toBeInTheDocument();
    });
  });

  it('exibe estatísticas: Total, Confirmados, Prováveis', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText('Total')).toBeInTheDocument();
      expect(screen.getByText('Confirmados')).toBeInTheDocument();
      expect(screen.getByText('Prováveis')).toBeInTheDocument();
    });
  });

  it('exibe botão de exportar Excel', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    await waitFor(() => {
      expect(screen.getByText(/Exportar Eleitores/i)).toBeInTheDocument();
    });
  });
});

describe('TabEleitores — Formulário', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('abre formulário ao clicar em Cadastrar Eleitor', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Nome do eleitor/i)).toBeInTheDocument();
    });
  });

  it('exibe seções do formulário', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    await waitFor(() => {
      expect(screen.getByText(/Dados Pessoais/i)).toBeInTheDocument();
      expect(screen.getByText(/Dados Eleitorais/i)).toBeInTheDocument();
    });
  });

  it('exibe botão Salvar com data-testid', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-salvar-eleitor')).toBeInTheDocument();
    });
  });

  it('exibe select de compromisso de voto com data-testid', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    await waitFor(() => {
      expect(screen.getByTestId('select-compromisso-voto')).toBeInTheDocument();
    });
  });

  it('select de compromisso tem opção padrão Indefinido', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    const select = await screen.findByTestId('select-compromisso-voto');
    expect(select).toHaveValue('Indefinido');
  });

  it('campo UF está fixo em GO e readOnly', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    const ufInput = await screen.findByDisplayValue('GO');
    expect(ufInput).toBeInTheDocument();
    expect(ufInput).toHaveAttribute('readOnly');
  });

  it('volta para lista ao clicar Voltar', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    fireEvent.click(await screen.findByTestId('btn-voltar'));
    await waitFor(() => {
      expect(screen.getByTestId('btn-cadastrar-eleitor')).toBeInTheDocument();
    });
  });

  it('exibe erro quando tenta salvar sem nome', async () => {
    const { toast } = await import('@/hooks/use-toast');
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    fireEvent.click(await screen.findByTestId('btn-salvar-eleitor'));
    await waitFor(() => {
      expect(toast).toHaveBeenCalledWith(expect.objectContaining({
        variant: 'destructive',
      }));
    });
  });

  it('exibe link para TSE', async () => {
    render(<TabEleitores refreshKey={0} />, { wrapper: createWrapper() });
    fireEvent.click(await screen.findByTestId('btn-cadastrar-eleitor'));
    expect(screen.getByText(/Consultar dados no TSE/i)).toBeInTheDocument();
  });
});
