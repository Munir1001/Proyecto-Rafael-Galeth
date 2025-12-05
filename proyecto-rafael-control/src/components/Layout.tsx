// src/components/Layout.tsx
import { useState } from 'react'
import { Outlet, Link, useLocation } from 'react-router-dom'
import { 
  LayoutDashboard, 
  Briefcase, 
  FileBarChart, 
  User, 
  LogOut, 
  Menu, 
  X,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'

const MENU_ITEMS = [
  { name: 'Dashboard', path: '/', icon: LayoutDashboard },
  { name: 'Proyectos', path: '/proyectos', icon: Briefcase },
  { name: 'Reportes', path: '/reportes', icon: FileBarChart },
  { name: 'Perfil', path: '/perfil', icon: User },
]

export default function Layout() {
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)
  const location = useLocation()

  return (
    <div className="flex h-screen bg-background overflow-hidden font-sans text-gray-900 dark:text-white">
      {/* SIDEBAR */}
      <aside className={`${isSidebarOpen ? 'w-64' : 'w-20'} bg-white dark:bg-gray-800 shadow-xl transition-all duration-300 ease-in-out flex flex-col relative z-20`}>
        <button 
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="absolute -right-3 top-6 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-full p-1 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 cursor-pointer"
        >
          {isSidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>

        <div className="h-16 flex items-center justify-center border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center gap-2 font-bold text-xl text-primary">
            <span>🚀</span>
            {isSidebarOpen && <span>GestorPro</span>}
          </div>
        </div>

        <nav className="flex-1 py-6 px-3 space-y-2">
          {MENU_ITEMS.map((item) => {
            const Icon = item.icon
            const isActive = location.pathname === item.path
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-3 rounded-lg transition-colors ${
                  isActive 
                    ? 'bg-blue-50 dark:bg-blue-900/30 text-primary' 
                    : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                <Icon size={22} />
                {isSidebarOpen && <span className="font-medium">{item.name}</span>}
              </Link>
            )
          })}
        </nav>

        <div className="p-4 border-t border-gray-100 dark:border-gray-700">
          <button className="flex items-center gap-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 px-3 py-3 rounded-lg w-full transition-colors cursor-pointer">
            <LogOut size={22} />
            {isSidebarOpen && <span className="font-medium">Salir</span>}
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL */}
      <main className="flex-1 overflow-y-auto relative bg-background dark:bg-gray-900">
        <header className="md:hidden h-16 bg-white dark:bg-gray-800 shadow-sm flex items-center px-4 justify-between">
          <span className="font-bold text-gray-900 dark:text-white">GestorPro</span>
          <button onClick={() => setIsSidebarOpen(!isSidebarOpen)}>
            {isSidebarOpen ? <X /> : <Menu />}
          </button>
        </header>

        <div className="p-8">
          <Outlet /> 
        </div>
      </main>
    </div>
  )
}