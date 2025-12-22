import { useState, useEffect, useMemo } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from "../components/ThemeToggle";
import {
    LayoutDashboard,
    Briefcase,
    FileBarChart,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Search,
    Bell,
    Building,
    Workflow,
    AlertTriangle,
    Shield,
    History,
    LucideShieldUser
} from 'lucide-react'

// 1. Definimos los roles tal cual están en tu Base de Datos (Case Sensitive)
const ROLES = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    USUARIO: 'Usuario',
}

// 2. Agregamos 'allowedRoles' a cada ítem
const MENU_ITEMS_CONFIG = [
    {
        name: 'Dashboard',
        path: '/',
        icon: LayoutDashboard,
        allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.USUARIO]
    },
    {
        name: 'Tareas',
        path: '/tareas',
        icon: Briefcase,
        allowedRoles: [ROLES.ADMIN, ROLES.MANAGER, ROLES.USUARIO]
    },
    {
        name: 'Usuarios',
        path: '/usuarios',
        icon: LucideShieldUser,
        allowedRoles: [ROLES.ADMIN] // Solo Admin
    },
    {
        name: 'Departamentos',
        path: '/departamentos',
        icon: Building,
        allowedRoles: [ROLES.ADMIN] // Admin
    },
    {
        name: 'Departamentos',
        path: '/departamentos-manager',
        icon: Building,
        allowedRoles: [ROLES.MANAGER] // Manager
    },
    {
        name: 'Roles',
        path: '/roles',
        icon: Shield,
        allowedRoles: [ROLES.ADMIN]
    },
    {
        name: 'Estados Tarea',
        path: '/estados-tarea',
        icon: Workflow,
        allowedRoles: [ROLES.ADMIN]
    },
    {
        name: 'Prioridades',
        path: '/prioridades',
        icon: AlertTriangle,
        allowedRoles: [ROLES.ADMIN]
    },
    {
        name: 'Reportes',
        path: '/reportes',
        icon: FileBarChart,
        allowedRoles: [ROLES.ADMIN, ROLES.MANAGER]
    },
    {
        name: 'Historial',
        path: '/historial',
        icon: History,
        allowedRoles: [ROLES.ADMIN]
    },
]

export default function Layout() {
    const { profile, signOut } = useAuth() // Obtenemos el perfil y la función signOut
    const navigate = useNavigate()
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const location = useLocation()

    // 3. Filtramos los items basándonos en el rol del usuario
    const filteredMenuItems = useMemo(() => {
        if (!profile?.rol_nombre) return []; // Si no ha cargado el perfil, no muestra nada o muestra items públicos

        return MENU_ITEMS_CONFIG.filter(item =>
            item.allowedRoles.includes(profile.rol_nombre || '')
        );
    }, [profile]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false)
            } else {
                setIsSidebarOpen(true)
            }
        }
        window.addEventListener('resize', handleResize)
        return () => window.removeEventListener('resize', handleResize)
    }, [])

    const handleLogout = async () => {
        await signOut(); // Usamos la función del contexto que limpia todo correctamente
        navigate("/login", { replace: true });
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">

            {/* --- SIDEBAR DESKTOP --- */}
            <aside
                className={`hidden md:flex flex-col h-full bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ease-in-out relative z-30 shrink-0 ${isSidebarOpen ? 'w-72' : 'w-20'}`}
            >
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -right-3 top-9 z-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-500 hover:text-indigo-600 rounded-full p-1.5 shadow-sm hover:shadow-md transition-transform hover:scale-110 focus:outline-none"
                >
                    {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* Header Logo */}
                <div className="h-20 flex items-center px-4 sm:px-6 border-b border-gray-100 dark:border-slate-800 shrink-0 overflow-hidden">
                    <div className="flex items-center gap-3 w-full">
                        <div className="shrink-0 h-10 w-10 bg-blue-800 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200/50 dark:shadow-none text-white font-bold text-xl">
                            GP
                        </div>
                        <div className={`flex flex-col overflow-hidden transition-all duration-300 whitespace-nowrap ${isSidebarOpen ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-5'}`}>
                            <h1 className="font-bold text-lg leading-tight tracking-tight text-slate-800 dark:text-white">GestorPro</h1>
                            <span className="text-xs text-slate-400 font-medium">Enterprise Edition</span>
                        </div>
                    </div>
                </div>

                {/* Navegación (Aquí usamos filteredMenuItems en lugar de MENU_ITEMS) */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-6 px-3 space-y-1">
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`group relative flex items-center px-3 py-3 rounded-xl transition-all duration-200 mx-1 ${isActive
                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-blue-600 dark:text-blue-800'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                <div className={`${!isSidebarOpen && 'w-full flex justify-center'}`}>
                                    <Icon size={22} strokeWidth={isActive ? 2.5 : 2} className="shrink-0" />
                                </div>

                                <span className={`ml-3 font-medium whitespace-nowrap transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}>
                                    {item.name}
                                </span>

                                {isActive && (
                                    <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-blue-700 rounded-r-full transition-opacity ${isSidebarOpen ? 'opacity-100' : 'opacity-0'}`} />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer del Sidebar */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen ? 'justify-center' : ''}`}>

                        <Link to="/perfil" className="relative shrink-0 group cursor-pointer">
                            {profile?.avatar_url ? (
                                // 1. SI TIENE FOTO: Mostramos la imagen
                                <img
                                    src={profile.avatar_url}
                                    alt="Avatar"
                                    className="h-10 w-10 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-md"
                                />
                            ) : (
                                // 2. NO TIENE FOTO: Mostramos tus iniciales
                                <div className="h-10 w-10 rounded-full bg-linear-to-tr from-indigo-400 to-blue-800 flex items-center justify-center text-white font-bold text-sm ring-2 ring-white dark:ring-slate-800 shadow-md">
                                    {profile?.nombre_completo
                                        ? profile.nombre_completo.substring(0, 2).toUpperCase()
                                        : 'US'}
                                </div>
                            )}
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-emerald-500 border-2 border-white dark:border-slate-800 rounded-full"></span>
                        </Link>

                        <div className={`flex flex-1 items-center justify-between overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100 ml-0' : 'w-0 opacity-0 ml-0'}`}>
                            <div className="overflow-hidden">
                                {/* Datos dinámicos del AuthContext */}
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                                    {profile?.nombre_completo || 'Usuario'}
                                </p>
                                <p className="text-xs text-slate-500 truncate">
                                    {profile?.rol_nombre || 'Cargando...'}
                                </p>
                            </div>
                            <button
                                onClick={handleLogout}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                                title="Cerrar Sesión"
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>

                    {!isSidebarOpen && (
                        <button
                            onClick={handleLogout}
                            className="mt-4 w-full flex justify-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={20} />
                        </button>
                    )}
                </div>
            </aside>

            {/* --- MOBILE MENU OVERLAY --- */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            {/* --- MOBILE DRAWER --- */}
            <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 z-50 transform transition-transform duration-300 ease-in-out md:hidden flex flex-col shadow-2xl ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <div className="h-8 w-8 bg-blue-800 rounded-lg flex items-center justify-center text-white font-bold">GP</div>
                        <span className="font-bold text-xl text-slate-800 dark:text-white">GestorPro</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(false)} className="text-slate-500 p-2 hover:bg-gray-100 rounded-full">
                        <X size={24} />
                    </button>
                </div>

                <nav className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-2">
                    {/* También filtramos en mobile */}
                    {filteredMenuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all ${location.pathname === item.path
                                ? 'bg-blue-700 text-white shadow-lg shadow-indigo-200'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800'
                                }`}
                        >
                            <item.icon size={22} />
                            <span className="font-medium">{item.name}</span>
                        </Link>
                    ))}
                </nav>

                <div className="p-4 border-t border-gray-100 dark:border-slate-800">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium">
                        <LogOut size={22} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900">
                <header className="h-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 z-20 sticky top-0">
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => setIsMobileMenuOpen(true)}
                            className="md:hidden p-2 text-slate-500 hover:bg-gray-100 rounded-lg"
                        >
                            <Menu size={24} />
                        </button>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800 dark:text-white capitalize">
                                {location.pathname === '/' ? 'Dashboard General' : location.pathname.replace('/', '').replace('-', ' ')}
                            </h2>
                            <p className="text-xs text-slate-500 hidden sm:block">
                                Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="hidden sm:flex items-center bg-gray-100 dark:bg-slate-800 rounded-full px-4 py-2">
                            <Search size={18} className="text-slate-400" />
                            <input
                                type="text"
                                placeholder="Buscar..."
                                className="bg-transparent border-none outline-none text-sm ml-2 w-32 focus:w-48 transition-all"
                            />
                        </div>
                        {/* Toggle Light / Dark */}
                        <ThemeToggle />
                        <button className="p-2.5 text-slate-500 hover:bg-gray-100 rounded-full relative">
                            <Bell size={20} />
                            <span className="absolute top-2 right-2.5 w-2 h-2 bg-red-500 rounded-full border border-white"></span>
                        </button>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    )
}