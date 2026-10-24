import {
  Boxes,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingCart,
  Sparkles,
  Users,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type ItemMenu = {
  caminho: string
  titulo: string
  icone: LucideIcon
  /** aparece nas abas de baixo no celular */
  principal?: boolean
  /** etapa em que a tela fica pronta (para a página "em breve") */
  etapa?: number
}

export const MENU: ItemMenu[] = [
  { caminho: '/', titulo: 'Painel', icone: LayoutDashboard, principal: true },
  { caminho: '/orcamentos', titulo: 'Orçamentos', icone: FileText, principal: true, etapa: 2 },
  { caminho: '/pedidos', titulo: 'Pedidos', icone: ClipboardList, principal: true, etapa: 2 },
  { caminho: '/produtos', titulo: 'Produtos', icone: Package, principal: true, etapa: 1 },
  { caminho: '/clientes', titulo: 'Clientes', icone: Users, etapa: 1 },
  { caminho: '/estoque', titulo: 'Estoque', icone: Boxes, etapa: 3 },
  { caminho: '/compras', titulo: 'Compras', icone: ShoppingCart, etapa: 3 },
  { caminho: '/financeiro', titulo: 'Financeiro', icone: Wallet, etapa: 4 },
  { caminho: '/provador', titulo: 'Provador 3D', icone: Sparkles, etapa: 2 },
  { caminho: '/configuracoes', titulo: 'Configurações', icone: Settings, etapa: 1 },
]
