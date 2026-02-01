import { useState, useEffect, useMemo, useRef } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import ThemeToggle from "../components/ThemeToggle";
import { useTheme } from "next-themes";
import NotificationPanel from '../components/NotificationPanel';
import GlobalTaskModal from '../components/GlobalTaskModal';
import type { Notification } from '../types/notification';
import { supabase } from "../supabaseClient";
import { useTaskModal } from '../context/TaskModalContext';

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

// 1. Definimos los roles
const ROLES = {
    ADMIN: 'Admin',
    MANAGER: 'Manager',
    USUARIO: 'Usuario',
}

// 2. Configuración del menú
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
        allowedRoles: [ROLES.ADMIN]
    },
    {
        name: 'Departamentos',
        path: '/departamentos',
        icon: Building,
        allowedRoles: [ROLES.ADMIN]
    },
    {
        name: 'Departamentos',
        path: '/departamentos-manager',
        icon: Building,
        allowedRoles: [ROLES.MANAGER]
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

// --- FUNCIÓN DE SONIDO LOCAL Y LIMPIA ---
const playNotificationSound = () => {
    // Referencia directa al archivo en la carpeta PUBLIC
    // Asegúrate de haber descargado el archivo y renombrado a 'alert.mp3'
    const audio = new Audio('/alert.mp3'); 
    audio.volume = 0.6; 
    
    // Intentar reproducir directamente sin bucles complejos
    const playPromise = audio.play();
    
    if (playPromise !== undefined) {
        playPromise
    }
};

export default function Layout() {
    const { profile, signOut } = useAuth()
    const navigate = useNavigate()
    const { setTheme } = useTheme();
    const { openTaskModal } = useTaskModal();

    // UI States
    const [isSidebarOpen, setIsSidebarOpen] = useState(true)
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
    const [isNotificationOpen, setIsNotificationOpen] = useState(false);

    // Data States
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const location = useLocation()

    // Referencia para evitar sonido en la carga inicial
    const prevCountRef = useRef(-1); 

    // --- DESBLOQUEAR AUDIO EN EL NAVEGADOR ---
    useEffect(() => {
        const unlockAudio = () => {
            const silentAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAAAQAEAAEAfAAAQAQABAAgAZGF0YQAAAAA=');
            silentAudio.volume = 0;
            silentAudio.play().catch(() => {});
            // Una vez desbloqueado, removemos los listeners
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        };

        document.addEventListener('click', unlockAudio);
        document.addEventListener('keydown', unlockAudio);
        
        return () => {
            document.removeEventListener('click', unlockAudio);
            document.removeEventListener('keydown', unlockAudio);
        }
    }, []);

    // Permisos de notificación visual
    useEffect(() => {
        if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission();
        }
    }, []);

    // Inicializar contador
    useEffect(() => {
        const unreadCount = notifications.filter(n => !n.leida).length;
        if (prevCountRef.current === -1) {
            prevCountRef.current = unreadCount;
        }
    }, [notifications]);


    // 1. Cargar Notificaciones Iniciales
    useEffect(() => {
        if (!profile?.id) return;

        const fetchNotifications = async () => {
            const { data, error } = await supabase
                .from('notificaciones')
                .select('*')
                .eq('usuario_id', profile.id)
                .order('created_at', { ascending: false })
                .limit(20);

            if (!error && data) {
                const notifs = data as Notification[];
                setNotifications(notifs);
                prevCountRef.current = notifs.filter(n => !n.leida).length;
            }
        };

        fetchNotifications();

        // 2. Suscripción a Realtime
        const channel = supabase
            .channel('realtime-notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notificaciones',
                    filter: `usuario_id=eq.${profile.id}`,
                },
                (payload) => {
                    const newNotif = payload.new as Notification;
                    setNotifications((prev) => [newNotif, ...prev].slice(0, 50));
                    playNotificationSound();
                    // Notificación Visual del Sistema
                    if ('Notification' in window && Notification.permission === 'granted') {
                        try {
                            new Notification(newNotif.titulo, {
                                body: newNotif.mensaje,
                                icon: '/favicon.ico', 
                                tag: 'task-notification'
                            });
                        } catch (e) {
                            console.error("Error mostrando notificación nativa:", e);
                        }
                    }
                }
            )
            .on(
                'postgres_changes',
                {
                    event: 'UPDATE',
                    schema: 'public',
                    table: 'notificaciones',
                    filter: `usuario_id=eq.${profile.id}`,
                },
                (payload) => {
                    const updatedNotif = payload.new as Notification;
                    setNotifications(prev =>
                        prev.map(n => n.id === updatedNotif.id ? updatedNotif : n)
                    );
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [profile?.id]);

    const markAsRead = async (id: string) => {
        const { error } = await supabase
            .from('notificaciones')
            .update({ leida: true })
            .eq('id', id);

        if (!error) {
            setNotifications(prev =>
                prev.map(n => n.id === id ? { ...n, leida: true } : n)
            );
        }
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.leida).map(n => n.id);
        if (unreadIds.length === 0) return;

        const { error } = await supabase
            .from('notificaciones')
            .update({ leida: true })
            .in('id', unreadIds);

        if (!error) {
            setNotifications(prev =>
                prev.map(n => ({ ...n, leida: true }))
            );
        }
    };

    const handleNotificationClick = (tareaId: string) => {
        openTaskModal(tareaId);
        setIsNotificationOpen(false);
    };

    const unreadCount = notifications.filter(n => !n.leida).length;

    const filteredMenuItems = useMemo(() => {
        if (!profile?.rol_nombre) return [];

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
        setTheme('light');
        await signOut();
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
                    className="absolute -right-3 top-8 z-40 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 text-slate-500 hover:text-blue-600 rounded-full p-1.5 shadow-sm hover:shadow-md transition-all hover:scale-110 focus:outline-none"
                >
                    {isSidebarOpen ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
                </button>

                <div className="h-20 flex items-center justify-center border-b border-gray-100 dark:border-slate-800 shrink-0 relative overflow-hidden">
                    <div className={`flex items-center transition-all duration-300 ${isSidebarOpen ? 'w-full px-6 gap-3' : 'w-full justify-center px-0'}`}>
                        <div className="relative shrink-0 flex items-center justify-center">
                            <div className="absolute inset-0 bg-blue-500/20 blur-xl rounded-full opacity-0 hover:opacity-100 transition-opacity duration-500" />
                            <img
                                src="https://raw.githubusercontent.com/Munir1001/Proyecto-Rafael-Galeth/refs/heads/main/Logo%20Pumy.png"
                                alt="PUMY Logo"
                                className={`object-contain transition-all duration-300 drop-shadow-sm ${isSidebarOpen ? 'h-10 w-10' : 'h-8 w-8'}`}
                            />
                        </div>
                        <div
                            className={`flex flex-col overflow-hidden transition-all duration-300 ease-in-out whitespace-nowrap
                ${isSidebarOpen ? 'w-auto opacity-100 translate-x-0' : 'w-0 opacity-0 -translate-x-4 absolute left-16'}
                `}
                        >
                            <h1 className="font-bold text-xl tracking-tight text-slate-900 dark:text-white leading-none">
                                PUMY
                                <span className="text-blue-600">.</span>
                            </h1>
                            <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 tracking-wide uppercase mt-0.5">
                                Unternehmens Manager
                            </span>
                        </div>
                    </div>
                </div>

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

                <div className="p-4 border-t border-gray-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-950">
                    <div className={`flex items-center gap-3 transition-all duration-300 ${!isSidebarOpen ? 'justify-center' : ''}`}>

                        <Link to="/perfil" className="relative shrink-0 group cursor-pointer overflow-hidden rounded-full">
                            {profile?.avatar_url ? (
                                <img src={profile.avatar_url} alt="Avatar" className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-100 dark:ring-slate-800" />
                            ) : (
                                <div className="h-9 w-9 rounded-full bg-linear-to-tr from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                    {profile?.nombre_completo ? profile.nombre_completo.substring(0, 2).toUpperCase() : 'US'}
                                </div>
                            )}
                        </Link>

                        <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isSidebarOpen ? 'w-auto opacity-100 ml-0' : 'w-0 opacity-0 hidden'}`}>
                            <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate max-w-30">
                                {profile?.nombre_completo || 'Usuario'}
                            </p>
                            <p className="text-[10px] uppercase tracking-wider text-slate-400 truncate">
                                {profile?.rol_nombre || 'Cargando...'}
                            </p>
                        </div>

                        {isSidebarOpen && (
                            <button onClick={handleLogout} className="ml-auto text-slate-400 hover:text-red-500 transition-colors p-1">
                                <LogOut size={16} />
                            </button>
                        )}
                    </div>

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


            {/* --- MOBILE MENU & DRAWER --- */}
            {isMobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
                    onClick={() => setIsMobileMenuOpen(false)}
                />
            )}

            <div className={`fixed inset-y-0 left-0 w-72 bg-white dark:bg-slate-950 z-50 transform transition-transform duration-300 cubic-bezier(0.4, 0, 0.2, 1) md:hidden flex flex-col shadow-2xl border-r border-gray-100 dark:border-slate-800 ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
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

                <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-900/30">
                    <button onClick={handleLogout} className="flex items-center gap-3 w-full px-4 py-3 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 rounded-xl transition-colors font-medium border border-transparent hover:border-red-100">
                        <LogOut size={20} />
                        <span>Cerrar Sesión</span>
                    </button>
                </div>
            </div>

            {/* --- CONTENIDO PRINCIPAL --- */}
            <div className="flex-1 flex flex-col min-w-0 bg-gray-50 dark:bg-slate-900">
                <header className="h-20 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-gray-200 dark:border-slate-800 flex items-center justify-between px-4 sm:px-8 z-40 sticky top-0">
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

                        <ThemeToggle />

                        {/* --- CAMPANA DE NOTIFICACIONES --- */}
                        <div className="relative">
                            <button
                                onClick={() => setIsNotificationOpen(!isNotificationOpen)}
                                className="p-2.5 text-slate-500 hover:bg-gray-100 dark:hover:bg-slate-800 rounded-full relative transition"
                            >
                                <Bell size={20} />
                                {unreadCount > 0 && (
                                    <span className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-pulse">
                                        {unreadCount > 9 ? '9+' : unreadCount}
                                    </span>
                                )}
                            </button>

                            <NotificationPanel
                                isOpen={isNotificationOpen}
                                onClose={() => setIsNotificationOpen(false)}
                                notifications={notifications}
                                onMarkAsRead={markAsRead}
                                onNotificationClick={handleNotificationClick}
                                onMarkAllAsRead={markAllAsRead}
                            />
                        </div>
                    </div>
                </header>

                <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
                    <div className="max-w-7xl mx-auto">
                        <Outlet />
                    </div>
                </main>

                <GlobalTaskModal />
            </div>
        </div>
    )
}