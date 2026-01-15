import { useState, useEffect, useMemo } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "next-themes";
import {
    LayoutDashboard,
    Briefcase,
    FileBarChart,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Bell,
    Building,
    Workflow,
    AlertTriangle,
    Shield,
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
]

export default function Layout() {
    const { profile, signOut } = useAuth() // Obtenemos el perfil y la función signOut
    const navigate = useNavigate()
    const { setTheme } = useTheme();
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
        // Usar setTheme para manejar correctamente el estado del tema y localStorage
        setTheme('light');
        
        await signOut(); // Usamos la función del contexto que limpia todo correctamente
        navigate("/login", { replace: true });
    };

    return (
        <div className="flex h-screen bg-gray-50 dark:bg-slate-900 font-sans text-slate-900 dark:text-slate-100 overflow-hidden">

            {/* --- SIDEBAR DESKTOP --- */}
            <aside
                className={`hidden md:flex flex-col h-full bg-white dark:bg-slate-950 border-r border-gray-200 dark:border-slate-800 transition-all duration-300 ease-in-out relative z-30 shrink-0 ${isSidebarOpen ? 'w-72' : 'w-20'}`}
            >
                {/* Botón Toggle (Colapsar/Expandir) */}
                <button
                    onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                    className="absolute -right-3 top-8 z-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 rounded-full p-1.5 shadow-sm hover:shadow-md transition-all hover:scale-110 focus:outline-none"
                >
                    {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>

                {/* --- HEADER MEJORADO CON LOGO Y TÍTULO --- */}
                <div className="h-20 flex items-center justify-center border-b border-gray-100 dark:border-slate-800 shrink-0 relative overflow-hidden">
                    <div className={`flex items-center transition-all duration-300 ${isSidebarOpen ? 'w-full px-6 gap-3' : 'w-full justify-center px-0'}`}>

                        {/* Logo con efecto hover y sombra suave */}
                        <div className="relative shrink-0 flex items-center justify-center">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 hover:opacity-100 transition-opacity duration-500" />
                            <img
                                src="https://raw.githubusercontent.com/Munir1001/Proyecto-Rafael-Galeth/refs/heads/main/Logo%20Pumy.png"
                                alt="PUMY Logo"
                                className={`object-contain transition-all duration-300 drop-shadow-sm ${isSidebarOpen ? 'h-10 w-10' : 'h-8 w-8'}`}
                            />
                        </div>

                        {/* Texto y Título (Solo visible si está abierto) */}
                        <div
                            className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap
                ${isSidebarOpen ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 absolute left-16'}
                `}
                        >
                            <h1 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                                PUMY
                                <span className="text-blue-600">.</span> {/* Punto de acento */}
                            </h1>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase mt-0.5">
                                Unternehmens Manager
                            </span>
                        </div>
                    </div>
                </div>

                {/* Navegación Desktop */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-hide py-6 px-3 space-y-1">
                    {filteredMenuItems.map((item) => {
                        const Icon = item.icon
                        const isActive = location.pathname === item.path

                        return (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`group relative flex items-center px-3 py-3 rounded-xl transition-all duration-200 mx-1 ${isActive
                                    ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-semibold'
                                    : 'text-slate-500 dark:text-slate-400 hover:bg-gray-50 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-slate-200'
                                    }`}
                            >
                                <div className={`flex items-center justify-center transition-all duration-300 ${!isSidebarOpen ? 'w-full' : ''}`}>
                                    <Icon
                                        size={22}
                                        strokeWidth={isActive ? 2.5 : 2}
                                        className={`shrink-0 transition-transform duration-300 ${isActive ? 'scale-110' : 'group-hover:scale-110'}`}
                                    />
                                </div>

                                <span className={`ml-3 text-sm whitespace-nowrap transition-all duration-300 overflow-hidden ${isSidebarOpen ? 'w-auto opacity-100' : 'w-0 opacity-0 hidden'}`}>
                                    {item.name}
                                </span>

                                {isActive && isSidebarOpen && (
                                    <div className="absolute right-2 w-1.5 h-1.5 rounded-full bg-blue-600" />
                                )}
                            </Link>
                        )
                    })}
                </nav>

                {/* Footer del Sidebar Desktop */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen ? 'justify-center' : ''}`}>

                        <Link to="/perfil" className="relative shrink-0 group cursor-pointer overflow-hidden rounded-full">
                            {/* ... (Tu código de avatar existente se mantiene igual, se ve bien) ... */}
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                    {profile?.nombre_completo ? profile.nombre_completo.substring(0, 2).toUpperCase() : 'US'}
                                </div>
                            )}
                        </Link>

                        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100 ml-0' : 'w-0 opacity-0 hidden'}`}>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                {profile?.nombre_completo || 'Usuario'}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 truncate">
                                {profile?.rol_nombre || 'Cargando...'}
                            </p>
                        </div>

                        {/* Botón logout simplificado cuando está abierto */}
                        {isSidebarOpen && (
                            <button onClick={handleLogout} className="ml-auto text-slate-400 hover:text-red-500 transition-colors p-1">
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>

                    {/* Botón logout cuando está cerrado */}
                    {!isSidebarOpen && (
                        <button
                            onClick={handleLogout}
                            className="mt-3 w-full flex justify-center p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-lg transition-colors"
                            title="Cerrar Sesión"
                        >
                            <LogOut size={18} />
                        </button>
                    )}
                </div>
            </aside>


            {/* --- MOBILE MENU & DRAWER (Actualizado) --- */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 z-50 transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) md:hidden flex flex-col shadow-2xl border-r border-gray-100 dark:border-slate-800 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>

                {/* Header Móvil Mejorado */}
                <div className="h-20 flex items-center justify-between px-6 border-b border-gray-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <img
                            src="https://raw.githubusercontent.com/Munir1001/Proyecto-Rafael-Galeth/refs/heads/main/Logo%20Pumy.png"
                            alt="PUMY Logo"
                            className="h-9 w-9 object-contain drop-shadow-sm"
                        />
                        <div>
                            <h2 className="font-bold text-xl text-slate-900 dark:text-white leading-none">PUMY</h2>
                            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-wider">Mobile Manager</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors shadow-sm border border-transparent hover:border-gray-200 dark:hover:border-slate-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Navegación Móvil */}
                <nav className="flex-1 overflow-y-auto scrollbar-hide p-4 space-y-1">
                    {filteredMenuItems.map((item) => (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => setIsMobileMenuOpen(false)}
                            className={`flex items-center gap-4 px-4 py-3.5 rounded-xl transition-all font-medium ${location.pathname === item.path
                                ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30'
                                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                                }`}
                        >
                            <item.icon size={22} className={location.pathname === item.path ? 'animate-pulse' : ''} />
                            <span>{item.name}</span>
                        </Link>
                    ))}
                </nav>

                {/* Footer Móvil */}
                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-100">
                        <LogOut size={20} />
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
                                {location.pathname === '/' ? 'Panel de control general' : location.pathname.replace('/', '').replace('-', ' ')}
                            </h2>
                            <p className="text-xs text-slate-500 hidden sm:block">
                                Bienvenido, {profile?.nombre_completo?.split(' ')[0] || 'Usuario'}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        
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