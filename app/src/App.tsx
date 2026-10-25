import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router'
import { Loader2 } from 'lucide-react'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthProvider, useAuth } from '@/lib/auth'
import { MENU } from '@/lib/menu'
import { TemaProvider } from '@/lib/tema'
import { ClienteForm } from '@/pages/ClienteForm'
import { Configuracoes } from '@/pages/Configuracoes'
import { Clientes } from '@/pages/Clientes'
import { EmBreve } from '@/pages/EmBreve'
import { Login } from '@/pages/Login'
import { OrcamentoForm } from '@/pages/OrcamentoForm'
import { OrcamentoPublico } from '@/pages/OrcamentoPublico'
import { Orcamentos } from '@/pages/Orcamentos'
import { Painel } from '@/pages/Painel'
import { PedidoDetalhe } from '@/pages/PedidoDetalhe'
import { Pedidos } from '@/pages/Pedidos'
import { ProdutoForm } from '@/pages/ProdutoForm'
import { Provador } from '@/pages/Provador'
import { Produtos } from '@/pages/Produtos'
import { VendaRapida } from '@/pages/VendaRapida'

/** Só deixa passar quem está logado; senão manda pro login. */
function RotaProtegida() {
  const { carregando, session } = useAuth()
  if (carregando)
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <Loader2 className="text-primary size-8 animate-spin" />
      </div>
    )
  return session ? <Outlet /> : <Navigate to="/login" replace />
}

const router = createBrowserRouter([
  { path: '/login', element: <Login /> },
  { path: '/o/:token', element: <OrcamentoPublico /> },
  {
    element: <RotaProtegida />,
    children: [
      {
        element: <AppLayout />,
        children: [
          { index: true, element: <Painel /> },
          { path: '/produtos', element: <Produtos /> },
          { path: '/produtos/novo', element: <ProdutoForm /> },
          { path: '/produtos/:id', element: <ProdutoForm /> },
          { path: '/clientes', element: <Clientes /> },
          { path: '/clientes/novo', element: <ClienteForm /> },
          { path: '/clientes/:id', element: <ClienteForm /> },
          { path: '/configuracoes', element: <Configuracoes /> },
          { path: '/orcamentos', element: <Orcamentos /> },
          { path: '/orcamentos/novo', element: <OrcamentoForm /> },
          { path: '/orcamentos/:id', element: <OrcamentoForm /> },
          { path: '/pedidos', element: <Pedidos /> },
          { path: '/pedidos/:id', element: <PedidoDetalhe /> },
          { path: '/venda-rapida', element: <VendaRapida /> },
          { path: '/provador', element: <Provador /> },
          ...MENU.filter((m) => !['/', '/produtos', '/clientes', '/configuracoes', '/orcamentos', '/pedidos', '/provador'].includes(m.caminho)).map((m) => ({ path: m.caminho, element: <EmBreve item={m} /> })),
          { path: '*', element: <Navigate to="/" replace /> },
        ],
      },
    ],
  },
])

export default function App() {
  return (
    <TemaProvider>
      <AuthProvider>
        <RouterProvider router={router} />
      </AuthProvider>
    </TemaProvider>
  )
}
