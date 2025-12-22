import { useState, useEffect, useMemo, useRef } from 'react';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Paperclip, MessageSquare, MoreHorizontal,
    Layout, List, BarChart3, Filter, ChevronDown, ChevronUp,
    User as UserIcon, X, FileText, Edit2, Trash2, Eye,
    CheckCircle, AlertCircle, XCircle, Users,
    Bell, Upload, Star,
    TrendingUp, Target, Activity,
    RefreshCw, Save, Clock
} from 'lucide-react';

// --- INTERFACES ---
interface Tarea {
    id: string;
    titulo: string;
    descripcion: string;
    prioridad_id: string;
    estado_id: string;
    asignado_a: string | null;
    fecha_inicio: string;
    fecha_fin: string;
    fecha_completado?: string | null;
    completada_a_tiempo?: boolean | null;
    motivo_rechazo?: string | null;
    motivo_bloqueo?: string | null;
    departamento_id: string | null;
    creador_id: string;
    created_at: string;
    updated_at: string;
    // Relaciones
    asignado?: { nombre_completo: string, avatar_url: string | null, email: string };
    prioridad?: { nombre: string, color: string, nivel: number };
    estado?: { nombre: string, color: string };
    creador?: { nombre_completo: string, avatar_url: string | null };
    departamento?: { nombre: string, manager?: { nombre_completo: string } };
    adjuntos?: Adjunto[];
    comentarios?: Comentario[];
    historial_estados?: HistorialEstado[];
    adjuntos_count?: number;
    comentarios_count?: number;
}

interface Adjunto {
    id: string;
    tarea_id: string;
    subido_por: string;
    nombre_archivo: string;
    url_archivo: string;
    tipo_mime?: string;
    tamano_bytes?: number;
    created_at: string;
    subido_por_user?: { nombre_completo: string, avatar_url: string | null };
}

interface Comentario {
    id: string;
    tarea_id: string;
    usuario_id: string;
    contenido: string;
    created_at: string;
    updated_at: string;
    usuario?: { nombre_completo: string, avatar_url: string | null };
}

interface HistorialEstado {
    id: string;
    tarea_id: string;
    estado_anterior_id?: string;
    estado_nuevo_id: string;
    cambiado_por: string;
    comentario?: string;
    created_at: string;
    estado_anterior?: { nombre: string, color: string };
    estado_nuevo?: { nombre: string, color: string };
    cambiado_por_user?: { nombre_completo: string };
}

interface Catalogo {
    id: string;
    nombre: string;
    color: string;
    nivel?: number;
    es_final?: boolean;
}

interface UsuarioSelect {
    id: string;
    nombre_completo: string;
    avatar_url: string | null;
    email: string;
    departamento_id?: string;
    rol_nombre?: string;
}

interface Departamento {
    id: string;
    nombre: string;
    descripcion?: string;
    manager_id?: string;
    manager?: { nombre_completo: string, avatar_url: string | null };
}

interface Notificacion {
    id: string;
    usuario_id: string;
    tipo: string;
    titulo: string;
    mensaje: string;
    tarea_id?: string;
    leida: boolean;
    created_at: string;
}

// --- COMPONENTES VISUALES AVANZADOS ---

// Badge de Prioridad Mejorado
const PriorityBadge = ({ nombre, color, level }: { nombre: string, color: string, level?: number }) => {
    const getIntensity = () => {
        switch (nombre.toLowerCase()) {
            case 'urgente': return 'bg-red-50 text-red-700 ring-1 ring-red-600/20';
            case 'alta': return 'bg-orange-50 text-orange-700 ring-1 ring-orange-600/20';
            case 'media': return 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-600/20';
            case 'baja': return 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20';
            default: return 'bg-slate-50 text-slate-700 ring-1 ring-slate-600/20';
        }
    };

    return (
        <div className="relative group">
            <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider transition-all duration-200 ${getIntensity()}`}>
                <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
                {nombre}
            </span>
        </div>
    );
};

// Avatar Mejorado
const UserAvatar = ({ url, name, size = "sm", showTooltip = true }: {
    url?: string | null,
    name: string,
    size?: "sm" | "md" | "lg" | "xl",
    showTooltip?: boolean
}) => {
    const sizeClasses = {
        sm: "h-8 w-8 text-xs",
        md: "h-10 w-10 text-xs",
        lg: "h-12 w-12 text-sm",
        xl: "h-14 w-14 text-base"
    };

    const initials = name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';

    return (
        <div className={`relative group ${showTooltip ? '' : ''}`}>
            {url ? (
                <img
                    src={url}
                    alt={name}
                    className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white shadow-sm transition-all duration-200 group-hover:ring-indigo-400 group-hover:scale-105`}
                />
            ) : (
                <div className={`${sizeClasses[size]} rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold ring-2 ring-white shadow-sm transition-all duration-200 group-hover:ring-indigo-400 group-hover:scale-105`}>
                    {initials}
                </div>
            )}
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {name}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800"></div>
                </div>
            )}
        </div>
    );
};

// Selector Personalizado Mejorado
const CustomSelector = ({
    options,
    value,
    onChange,
    placeholder,
    label,
    icon: Icon,
    searchable = true,
    multiple = false,
    className = "",
    getDisplayValue = (option) => option.nombre || option.nombre_completo,
    getSearchValue = (option) => option.nombre || option.nombre_completo,
    getAvatar = (option) => option.avatar_url
}: {
    options: any[];
    value: string | string[];
    onChange: (value: string | string[]) => void;
    placeholder: string;
    label: string;
    icon: any;
    searchable?: boolean;
    multiple?: boolean;
    className?: string;
    getDisplayValue?: (option: any) => string;
    getSearchValue?: (option: any) => string;
    getAvatar?: (option: any) => string | null;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const dropdownRef = useRef<HTMLDivElement>(null);

    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option =>
            getSearchValue(option).toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchTerm, getSearchValue]);

    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const selectedOptions = options.filter(option => selectedValues.includes(option.id));

    const handleSelect = (optionId: string) => {
        if (multiple) {
            const newValue = selectedValues.includes(optionId)
                ? selectedValues.filter(id => id !== optionId)
                : [...selectedValues, optionId];
            onChange(newValue);
        } else {
            onChange(optionId);
            setIsOpen(false);
        }
    };

    const getDisplayText = () => {
        if (selectedOptions.length === 0) return placeholder;
        if (multiple && selectedOptions.length > 1) {
            return `${selectedOptions.length} seleccionados`;
        }
        return getDisplayValue(selectedOptions[0]);
    };

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            {label && (
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">
                    {label}
                </label>
            )}

            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white text-left transition-all duration-200 ${isOpen
                        ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                    }`}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {Icon && (
                        <div className={`flex shrink-0 items-center justify-center h-8 w-8 rounded-lg ${selectedOptions.length > 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            <Icon size={16} />
                        </div>
                    )}
                    <span className={`text-sm truncate ${selectedOptions.length > 0 ? 'text-slate-700 font-medium' : 'text-slate-400'}`}>
                        {getDisplayText()}
                    </span>
                </div>
                {isOpen ? <ChevronUp size={16} className="text-indigo-500 shrink-0 ml-2" /> : <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />}
            </button>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white rounded-xl shadow-xl border border-slate-100 z-50 overflow-hidden animation-fade-in-down">
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border-none bg-white focus:ring-2 focus:ring-indigo-500 placeholder-slate-400"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-sm">
                                No se encontraron opciones
                            </div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.id);
                                return (
                                    <div
                                        key={option.id}
                                        onClick={() => handleSelect(option.id)}
                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected
                                                ? 'bg-indigo-50 text-indigo-700'
                                                : 'hover:bg-slate-50 text-slate-700'
                                            }`}
                                    >
                                        {getAvatar(option) ? (
                                            <div className="shrink-0">
                                                <UserAvatar
                                                    url={getAvatar(option)}
                                                    name={getDisplayValue(option)}
                                                    size="sm"
                                                    showTooltip={false}
                                                />
                                            </div>
                                        ) : (
                                            <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isSelected ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                                {getDisplayValue(option).substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">
                                                {getDisplayValue(option)}
                                            </div>
                                            {option.email && (
                                                <div className="text-xs text-slate-400 truncate">
                                                    {option.email}
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <CheckCircle size={16} className="text-indigo-600 shrink-0" />
                                        )}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// Componente de Notificaciones Toast
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'warning' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const getIcon = () => {
        switch (type) {
            case 'success': return <CheckCircle className="text-green-500" size={20} />;
            case 'error': return <XCircle className="text-red-500" size={20} />;
            case 'warning': return <AlertCircle className="text-amber-500" size={20} />;
            case 'info': return <Bell className="text-blue-500" size={20} />;
        }
    };

    const getStyles = () => {
        switch (type) {
            case 'success': return 'bg-white border-green-100 shadow-lg shadow-green-500/10';
            case 'error': return 'bg-white border-red-100 shadow-lg shadow-red-500/10';
            case 'warning': return 'bg-white border-amber-100 shadow-lg shadow-amber-500/10';
            case 'info': return 'bg-white border-blue-100 shadow-lg shadow-blue-500/10';
        }
    };

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border ${getStyles()} animate-slide-in-right max-w-sm w-full backdrop-blur-sm`}>
            {getIcon()}
            <span className="text-sm font-medium text-slate-700">{message}</span>
            <button onClick={onClose} className="ml-auto text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors">
                <X size={16} />
            </button>
        </div>
    );
};

// Componente Principal
export default function TareasAvanzadas() {
    const { profile } = useAuth();

    // Estados principales
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'timeline' | 'analytics'>('kanban');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toasts, setToasts] = useState<Array<{ id: string, message: string, type: 'success' | 'error' | 'warning' | 'info' }>>([]);

    // Datos
    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [estados, setEstados] = useState<Catalogo[]>([]);
    const [prioridades, setPrioridades] = useState<Catalogo[]>([]);
    const [usuariosParaAsignar, setUsuariosParaAsignar] = useState<UsuarioSelect[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

    // Filtros avanzados
    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('all');
    const [filterPrioridad, setFilterPrioridad] = useState('all');
    const [filterUsuario, setFilterUsuario] = useState('all');
    const [filterDepartamento] = useState('all');
    const [filterFecha, setFilterFecha] = useState('all');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    // Modal y edición
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Tarea | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Tarea | null>(null);

    // Estado del formulario
    const [newTask, setNewTask] = useState({
        titulo: '',
        descripcion: '',
        prioridad_id: '',
        asignado_a: '',
        fecha_inicio: new Date().toISOString().split('T')[0],
        fecha_fin: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
        departamento_id: '',
    });

    // Funciones auxiliares
    const addToast = (message: string, type: 'success' | 'error' | 'warning' | 'info') => {
        const id = Math.random().toString(36).substr(2, 9);
        setToasts(prev => [...prev, { id, message, type }]);
    };

    const removeToast = (id: string) => {
        setToasts(prev => prev.filter(toast => toast.id !== id));
    };

    const getInitials = (name: string) => {
        return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : '??';
    };

    // Efectos
    useEffect(() => {
        if (profile) fetchData();
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Cargar catálogos en paralelo
            const [resEstados, resPrioridades, resDepartamentos] = await Promise.all([
                supabase.from('estados_tarea').select('*').order('nombre'),
                supabase.from('prioridades').select('*').order('nivel', { ascending: false }),
                supabase.from('departamentos').select('*, manager:manager_id(nombre_completo, avatar_url)').order('nombre')
            ]);

            if (resEstados.data) setEstados(resEstados.data);
            if (resPrioridades.data) setPrioridades(resPrioridades.data);

            if (resDepartamentos.data) {
                setDepartamentos(resDepartamentos.data as unknown as Departamento[]);
            }

            // Cargar usuarios para asignar
            if (['Admin', 'Manager'].includes(profile?.rol_nombre || '')) {
                let userQuery = supabase
                    .from('usuarios')
                    .select('id, nombre_completo, avatar_url, email, departamento_id, roles(nombre)')
                    .eq('activo', true);

                if (profile?.rol_nombre === 'Manager' && profile.departamento_id) {
                    userQuery = userQuery.eq('departamento_id', profile.departamento_id);
                }

                const { data: usersData } = await userQuery;

                const usersWithRole = usersData?.map(user => ({
                    ...user,
                    rol_nombre: Array.isArray(user.roles)
                        ? user.roles[0]?.nombre
                        :user.roles
                        
                })) || [];

                setUsuariosParaAsignar(usersWithRole);
            }

            // Cargar notificaciones
            if (profile) {
                const { data: notifData } = await supabase
                    .from('notificaciones')
                    .select('*')
                    .eq('usuario_id', profile.id)
                    .eq('leida', false)
                    .order('created_at', { ascending: false })
                    .limit(10);

                if (notifData) setNotificaciones(notifData);
            }

            await fetchTareas();

        } catch (error) {
            console.error("Error cargando datos:", error);
            addToast("Error al cargar los datos", "error");
        } finally {
            setLoading(false);
        }
    };

    const fetchTareas = async () => {
        try {
            let query = supabase
                .from('tareas')
                .select(`
          *,
          asignado:asignado_a(id, nombre_completo, avatar_url, email),
          prioridad:prioridad_id(nombre, color, nivel),
          estado:estado_id(nombre, color),
          creador:creador_id(nombre_completo, avatar_url),
          departamento:departamento_id(nombre, manager:manager_id(nombre_completo))
        `)
                .order(sortBy, { ascending: sortOrder === 'asc' });

            // Filtrar según rol
            if (profile?.rol_nombre === 'Usuario') {
                query = query.eq('asignado_a', profile.id);
            } else if (profile?.rol_nombre === 'Manager') {
                // Managers ven tareas de su departamento
                if (profile.departamento_id) {
                    query = query.eq('departamento_id', profile.departamento_id);
                }
            }

            const { data: tareasData, error } = await query;
            if (error) throw error;

            // Cargar conteos de adjuntos y comentarios
            const tareasWithCounts = await Promise.all(
                (tareasData || []).map(async (tarea) => {
                    const [adjuntosRes, comentariosRes] = await Promise.all([
                        supabase.from('adjuntos').select('id').eq('tarea_id', tarea.id),
                        supabase.from('comentarios').select('id').eq('tarea_id', tarea.id)
                    ]);

                    return {
                        ...tarea,
                        adjuntos_count: adjuntosRes.data?.length || 0,
                        comentarios_count: comentariosRes.data?.length || 0
                    };
                })
            );

            setTareas(tareasWithCounts);
        } catch (error) {
            console.error("Error cargando tareas:", error);
            addToast("Error al cargar las tareas", "error");
        }
    };

    const handleCreateTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const defaultState = estados.find(e => e.nombre === 'Nueva')?.id || estados[0]?.id;

            const taskData = {
                ...newTask,
                creador_id: profile?.id,
                estado_id: defaultState,
                departamento_id: newTask.departamento_id || profile?.departamento_id || null
            };

            const { error } = await supabase.from('tareas').insert(taskData);
            if (error) throw error;

            addToast("Tarea creada exitosamente", "success");
            setIsModalOpen(false);
            await fetchTareas();

            // Reset form
            setNewTask({
                titulo: '',
                descripcion: '',
                prioridad_id: '',
                asignado_a: '',
                fecha_inicio: new Date().toISOString().split('T')[0],
                fecha_fin: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0],
                departamento_id: '',
            });

        } catch (error) {
            console.error("Error creando tarea:", error);
            addToast("Error al crear la tarea", "error");
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatusId: string) => {
        try {
            // Obtener estado anterior
            const task = tareas.find(t => t.id === taskId);
            if (!task) return;

            // Actualizar tarea
            const { error } = await supabase
                .from('tareas')
                .update({
                    estado_id: newStatusId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;

            // Registrar en historial
            await supabase.from('historial_estados').insert({
                tarea_id: taskId,
                estado_anterior_id: task.estado_id,
                estado_nuevo_id: newStatusId,
                cambiado_por: profile?.id,
            });

            // Crear notificación si es necesario
            const newStatus = estados.find(e => e.id === newStatusId);
            if (task.asignado_a && newStatus?.nombre === 'Completada') {
                await supabase.from('notificaciones').insert({
                    usuario_id: task.asignado_a,
                    tipo: 'tarea_completada',
                    titulo: 'Tarea Completada',
                    mensaje: `La tarea "${task.titulo}" ha sido marcada como completada`,
                    tarea_id: taskId
                });
            }

            addToast("Estado de tarea actualizado", "success");
            await fetchTareas();

        } catch (error) {
            console.error("Error actualizando estado:", error);
            addToast("Error al actualizar el estado", "error");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta tarea?")) return;

        try {
            const { error } = await supabase.from('tareas').delete().eq('id', taskId);
            if (error) throw error;

            addToast("Tarea eliminada", "success");
            await fetchTareas();
        } catch (error) {
            console.error("Error eliminando tarea:", error);
            addToast("Error al eliminar la tarea", "error");
        }
    };

    const openTaskDetail = async (task: Tarea) => {
        setSelectedTaskForDetail(task);
        setIsDetailModalOpen(true);

        // Marcar notificaciones como leídas
        if (notificaciones.some(n => n.tarea_id === task.id)) {
            await supabase
                .from('notificaciones')
                .update({ leida: true })
                .eq('tarea_id', task.id)
                .eq('usuario_id', profile?.id);

            setNotificaciones(prev => prev.filter(n => n.tarea_id !== task.id));
        }
    };

    // Filtrado y ordenamiento avanzado
    const filteredAndSortedTareas = useMemo(() => {
        let filtered = tareas.filter(tarea => {
            const matchesSearch = !searchTerm ||
                tarea.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
                tarea.descripcion?.toLowerCase().includes(searchTerm.toLowerCase());

            const matchesEstado = filterEstado === 'all' || tarea.estado_id === filterEstado;
            const matchesPrioridad = filterPrioridad === 'all' || tarea.prioridad_id === filterPrioridad;
            const matchesUsuario = filterUsuario === 'all' || tarea.asignado_a === filterUsuario;
            const matchesDepartamento = filterDepartamento === 'all' || tarea.departamento_id === filterDepartamento;

            let matchesFecha = true;
            if (filterFecha !== 'all') {
                const today = new Date();
                const taskDate = new Date(tarea.fecha_fin);

                switch (filterFecha) {
                    case 'today':
                        matchesFecha = taskDate.toDateString() === today.toDateString();
                        break;
                    case 'week':
                        const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
                        matchesFecha = taskDate <= weekFromNow;
                        break;
                    case 'overdue':
                        matchesFecha = taskDate < today && tarea.estado?.nombre !== 'Completada';
                        break;
                }
            }

            return matchesSearch && matchesEstado && matchesPrioridad && matchesUsuario && matchesDepartamento && matchesFecha;
        });

        // Ordenamiento
        filtered.sort((a, b) => {
            let aValue, bValue;

            switch (sortBy) {
                case 'titulo':
                    aValue = a.titulo.toLowerCase();
                    bValue = b.titulo.toLowerCase();
                    break;
                case 'fecha_fin':
                    aValue = new Date(a.fecha_fin);
                    bValue = new Date(b.fecha_fin);
                    break;
                case 'prioridad':
                    aValue = a.prioridad?.nivel || 0;
                    bValue = b.prioridad?.nivel || 0;
                    break;
                case 'created_at':
                default:
                    aValue = new Date(a.created_at);
                    bValue = new Date(b.created_at);
                    break;
            }

            if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
            if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        return filtered;
    }, [tareas, searchTerm, filterEstado, filterPrioridad, filterUsuario, filterDepartamento, filterFecha, sortBy, sortOrder]);

    // --- VISTA KANBAN MEJORADA ---
    const KanbanBoard = () => {
        const [draggedTask, setDraggedTask] = useState<Tarea | null>(null);
        const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

        const handleDragStart = (e: React.DragEvent, task: Tarea) => {
            setDraggedTask(task);
            e.dataTransfer.effectAllowed = 'move';
        };

        const handleDragOver = (e: React.DragEvent, estadoId: string) => {
            e.preventDefault();
            setDragOverColumn(estadoId);
        };

        const handleDragLeave = () => {
            setDragOverColumn(null);
        };

        const handleDrop = async (e: React.DragEvent, newEstadoId: string) => {
            e.preventDefault();
            setDragOverColumn(null);

            if (draggedTask && draggedTask.estado_id !== newEstadoId) {
                await handleUpdateTaskStatus(draggedTask.id, newEstadoId);
            }
            setDraggedTask(null);
        };

        return (
            <div className="flex gap-6 overflow-x-auto pb-8 h-[calc(100vh-280px)] px-2 snap-x">
                {estados.map(estado => {
                    const tareasEnColumna = filteredAndSortedTareas.filter(t => t.estado_id === estado.id);
                    const isDragOver = dragOverColumn === estado.id;

                    return (
                        <div
                            key={estado.id}
                            className={`min-w-[340px] w-[340px] flex flex-col gap-4 transition-all duration-300 rounded-2xl p-2 snap-center ${isDragOver ? 'bg-indigo-50/50 ring-2 ring-indigo-200' : 'bg-slate-100/50'
                                }`}
                            onDragOver={(e) => handleDragOver(e, estado.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, estado.id)}
                        >
                            {/* Header de Columna */}
                            <div className="flex items-center justify-between p-3 rounded-xl bg-white/80 backdrop-blur-md shadow-sm border border-white/50 sticky top-0 z-10">
                                <div className="flex items-center gap-3">
                                    <div
                                        className="w-3 h-3 rounded-full shadow-sm ring-2 ring-white"
                                        style={{ backgroundColor: estado.color }}
                                    />
                                    <span className="font-bold text-slate-700 text-sm tracking-tight">{estado.nombre}</span>
                                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-bold border border-slate-200">
                                        {tareasEnColumna.length}
                                    </span>
                                </div>
                                <button className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                                    <MoreHorizontal size={16} />
                                </button>
                            </div>

                            {/* Área de Cards */}
                            <div className="flex flex-col gap-3 overflow-y-auto pr-1 pb-2 custom-scrollbar flex-1">
                                {tareasEnColumna.map(tarea => (
                                    <div
                                        key={tarea.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, tarea)}
                                        onClick={() => openTaskDetail(tarea)}
                                        className="group relative bg-white p-4 rounded-xl shadow-sm border border-slate-200/60 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-grab active:cursor-grabbing"
                                        style={{ borderLeft: `4px solid ${tarea.prioridad?.color || '#cbd5e1'}` }}
                                    >
                                        <div className="flex justify-between items-start mb-3">
                                            {tarea.prioridad && (
                                                <PriorityBadge
                                                    nombre={tarea.prioridad.nombre}
                                                    color={tarea.prioridad.color}
                                                    level={tarea.prioridad.nivel}
                                                />
                                            )}
                                            <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setEditingTask(tarea);
                                                        setIsModalOpen(true);
                                                    }}
                                                    className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                {profile?.rol_nombre === 'Admin' && (
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            handleDeleteTask(tarea.id);
                                                        }}
                                                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                    >
                                                        <Trash2 size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </div>

                                        <h4 className="font-bold text-slate-800 mb-2 line-clamp-2 text-sm leading-snug group-hover:text-indigo-700 transition-colors">
                                            {tarea.titulo}
                                        </h4>

                                        {tarea.descripcion && (
                                            <p className="text-xs text-slate-500 mb-4 line-clamp-2 leading-relaxed">
                                                {tarea.descripcion}
                                            </p>
                                        )}

                                        <div className="flex items-center gap-4 text-xs text-slate-500 mb-4 border-t border-dashed border-slate-100 pt-3">
                                            <div className="flex items-center gap-1.5">
                                                <Clock size={12} className={new Date(tarea.fecha_fin) < new Date() ? "text-red-500" : ""} />
                                                <span className={new Date(tarea.fecha_fin) < new Date() && tarea.estado?.nombre !== 'Completada' ? "text-red-600 font-bold" : ""}>
                                                    {new Date(tarea.fecha_fin).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                                </span>
                                            </div>
                                        </div>

                                        {/* Footer Card */}
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                {/* Indicadores */}
                                                <div className="flex gap-2">
                                                    {(tarea.adjuntos_count || 0) > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                            <Paperclip size={10} /> {tarea.adjuntos_count}
                                                        </div>
                                                    )}
                                                    {(tarea.comentarios_count || 0) > 0 && (
                                                        <div className="flex items-center gap-1 text-[10px] text-slate-400 bg-slate-50 px-1.5 py-0.5 rounded-md border border-slate-100">
                                                            <MessageSquare size={10} /> {tarea.comentarios_count}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            <div className="flex items-center -space-x-2">
                                                {tarea.asignado ? (
                                                    <div title={tarea.asignado.nombre_completo}>
                                                        <UserAvatar
                                                            url={tarea.asignado.avatar_url}
                                                            name={tarea.asignado.nombre_completo}
                                                            size="sm"
                                                            showTooltip={false}
                                                        />
                                                    </div>
                                                ) : (
                                                    <div className="h-6 w-6 rounded-full bg-slate-100 border border-dashed border-slate-300 flex items-center justify-center">
                                                        <UserIcon size={12} className="text-slate-400" />
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}

                                {tareasEnColumna.length === 0 && (
                                    <div className="h-32 border-2 border-dashed border-slate-200 rounded-xl flex items-center justify-center text-slate-400 text-sm bg-slate-50/50">
                                        <div className="text-center opacity-60">
                                            <FileText size={24} className="mx-auto mb-2" />
                                            <p>Vacío</p>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        );
    };

    // --- VISTA LISTA MEJORADA ---
    const ListBoard = () => (
        <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-slate-50/80 border-b border-slate-200 backdrop-blur-sm">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider w-[40%]">Tarea</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Prioridad</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Asignado</th>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Fecha</th>
                            <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {filteredAndSortedTareas.map((t) => (
                            <tr
                                key={t.id}
                                className="hover:bg-slate-50/80 transition-all duration-200 cursor-pointer group"
                                onClick={() => openTaskDetail(t)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-10 rounded-full" style={{ backgroundColor: t.prioridad?.color || '#e2e8f0' }}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-900 block mb-1 truncate">{t.titulo}</div>
                                            <div className="text-xs text-slate-500 truncate max-w-md block">{t.descripcion}</div>
                                            <div className="flex items-center gap-3 mt-2">
                                                {(t.adjuntos_count || 0) > 0 && (
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        <Paperclip size={10} /> {t.adjuntos_count}
                                                    </span>
                                                )}
                                                {(t.comentarios_count || 0) > 0 && (
                                                    <span className="text-[10px] text-slate-400 flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded">
                                                        <MessageSquare size={10} /> {t.comentarios_count}
                                                    </span>
                                                )}
                                                {t.departamento && (
                                                    <span className="text-[10px] text-indigo-500 flex items-center gap-1 bg-indigo-50 px-1.5 py-0.5 rounded font-medium">
                                                        <Users size={10} /> {t.departamento.nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border"
                                        style={{
                                            backgroundColor: `${t.estado?.color}15`,
                                            color: t.estado?.color,
                                            borderColor: `${t.estado?.color}30`
                                        }}
                                    >
                                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.estado?.color }} />
                                        {t.estado?.nombre}
                                    </span>
                                </td>
                                <td className="px-6 py-4">
                                    {t.prioridad && (
                                        <PriorityBadge
                                            nombre={t.prioridad.nombre}
                                            color={t.prioridad.color}
                                            level={t.prioridad.nivel}
                                        />
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    {t.asignado ? (
                                        <div className="flex items-center gap-2">
                                            <UserAvatar
                                                url={t.asignado.avatar_url}
                                                name={t.asignado.nombre_completo}
                                                size="sm"
                                            />
                                            <span className="text-sm text-slate-700 font-medium truncate max-w-[120px]">{t.asignado.nombre_completo}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 text-sm italic flex items-center gap-1">
                                            <UserIcon size={14} /> Sin asignar
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium ${new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada' ? 'text-red-600' : 'text-slate-600'}`}>
                                            {new Date(t.fecha_fin).toLocaleDateString()}
                                        </span>
                                        {new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada' && (
                                            <span className="text-[10px] text-red-500 font-bold bg-red-50 px-1 rounded w-fit mt-0.5">Vencida</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openTaskDetail(t);
                                            }}
                                            className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                                            title="Ver detalles"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setEditingTask(t);
                                                setIsModalOpen(true);
                                            }}
                                            className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                            title="Editar"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        {profile?.rol_nombre === 'Admin' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTask(t.id);
                                                }}
                                                className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                title="Eliminar"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );

    // --- VISTA TIMELINE MEJORADA ---
    const TimelineBoard = () => {
        const getTaskProgress = (task: Tarea) => {
            const now = new Date();
            const start = new Date(task.fecha_inicio);
            const end = new Date(task.fecha_fin);
            const total = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            return Math.min(Math.max((elapsed / total) * 100, 0), 100);
        };

        return (
            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 p-8">
                <h3 className="text-lg font-bold text-slate-800 mb-6">Línea de Tiempo del Proyecto</h3>
                <div className="space-y-8">
                    {filteredAndSortedTareas.map(tarea => {
                        const progress = getTaskProgress(tarea);
                        const isOverdue = new Date(tarea.fecha_fin) < new Date() && tarea.estado?.nombre !== 'Completada';

                        return (
                            <div key={tarea.id} className="group relative">
                                <div className="flex flex-col md:flex-row md:items-center gap-4 mb-3">
                                    <div className="w-full md:w-56 shrink-0">
                                        <div className="font-bold text-sm text-slate-800 truncate mb-1">{tarea.titulo}</div>
                                        <div className="flex items-center gap-2">
                                            {tarea.asignado ? (
                                                <div className="flex items-center gap-1.5">
                                                    <UserAvatar url={tarea.asignado.avatar_url} name={tarea.asignado.nombre_completo} size="sm" showTooltip={false} />
                                                    <span className="text-xs text-slate-500 truncate max-w-[120px]">{tarea.asignado.nombre_completo}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xs text-slate-400 italic">Sin asignar</span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="flex-1 relative h-10 bg-slate-100 rounded-lg overflow-hidden border border-slate-200">
                                        {/* Grid lines */}
                                        <div className="absolute inset-0 flex">
                                            {[...Array(10)].map((_, i) => (
                                                <div key={i} className="flex-1 border-r border-slate-200/60 last:border-0" />
                                            ))}
                                        </div>

                                        {/* Progress bar */}
                                        <div
                                            className={`absolute top-1 bottom-1 left-1 rounded-md shadow-sm transition-all duration-1000 ease-out flex items-center justify-end px-2 ${isOverdue
                                                    ? 'bg-gradient-to-r from-red-400 to-red-500'
                                                    : 'bg-gradient-to-r from-indigo-400 to-violet-500'
                                                }`}
                                            style={{
                                                width: `${Math.max(progress, 5)}%`
                                            }}
                                        >
                                            <span className="text-[10px] text-white font-bold drop-shadow-md">
                                                {Math.round(progress)}%
                                            </span>
                                        </div>
                                    </div>

                                    <div className="w-full md:w-32 text-right">
                                        <div className="text-sm font-bold text-slate-700">
                                            {new Date(tarea.fecha_fin).toLocaleDateString()}
                                        </div>
                                        <div className="text-xs font-medium px-2 py-0.5 rounded-full inline-block mt-1" style={{ backgroundColor: `${tarea.estado?.color}20`, color: tarea.estado?.color }}>
                                            {tarea.estado?.nombre}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    // --- VISTA ANALYTICS ---
    const AnalyticsBoard = () => {
        const metrics = useMemo(() => {
            const total = tareas.length;
            const completed = tareas.filter(t => t.estado?.nombre === 'Completada').length;
            const inProgress = tareas.filter(t => t.estado?.nombre === 'En Progreso').length;
            const overdue = tareas.filter(t => new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada').length;
            const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

            const byPriority = prioridades.map(prioridad => ({
                ...prioridad,
                count: tareas.filter(t => t.prioridad_id === prioridad.id).length
            }));

            const byUser = usuariosParaAsignar.map(user => ({
                user,
                count: tareas.filter(t => t.asignado_a === user.id).length,
                completed: tareas.filter(t => t.asignado_a === user.id && t.estado?.nombre === 'Completada').length
            }));

            return {
                total,
                completed,
                inProgress,
                overdue,
                completionRate,
                byPriority,
                byUser
            };
        }, [tareas, prioridades, usuariosParaAsignar]);

        const CardMetric = ({ title, value, icon: Icon, colorClass, bgClass }: any) => (
            <div className="bg-white p-6 rounded-2xl shadow-lg shadow-slate-200/50 border border-slate-100 hover:scale-105 transition-transform duration-300">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-slate-500 mb-1">{title}</p>
                        <p className={`text-3xl font-black ${colorClass}`}>{value}</p>
                    </div>
                    <div className={`p-4 ${bgClass} rounded-2xl`}>
                        <Icon className={colorClass} size={28} />
                    </div>
                </div>
            </div>
        );

        return (
            <div className="space-y-8 animate-fade-in-up">
                {/* Métricas principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <CardMetric
                        title="Total Tareas"
                        value={metrics.total}
                        icon={Target}
                        colorClass="text-indigo-600"
                        bgClass="bg-indigo-50"
                    />
                    <CardMetric
                        title="Completadas"
                        value={metrics.completed}
                        icon={CheckCircle}
                        colorClass="text-emerald-600"
                        bgClass="bg-emerald-50"
                    />
                    <CardMetric
                        title="En Progreso"
                        value={metrics.inProgress}
                        icon={Activity}
                        colorClass="text-blue-600"
                        bgClass="bg-blue-50"
                    />
                    <CardMetric
                        title="Tasa de Éxito"
                        value={`${metrics.completionRate}%`}
                        icon={TrendingUp}
                        colorClass="text-violet-600"
                        bgClass="bg-violet-50"
                    />
                </div>

                {/* Gráficos */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Por prioridad */}
                    <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Distribución por Prioridad</h3>
                        <div className="space-y-5">
                            {metrics.byPriority.map(prioridad => {
                                const percentage = metrics.total > 0 ? (prioridad.count / metrics.total) * 100 : 0;
                                return (
                                    <div key={prioridad.id} className="group">
                                        <div className="flex justify-between text-sm mb-2">
                                            <span className="font-medium text-slate-700 flex items-center gap-2">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: prioridad.color }} />
                                                {prioridad.nombre}
                                            </span>
                                            <span className="font-bold text-slate-900">{prioridad.count} <span className="text-slate-400 font-normal text-xs">({Math.round(percentage)}%)</span></span>
                                        </div>
                                        <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-1000 ease-out relative"
                                                style={{
                                                    backgroundColor: prioridad.color,
                                                    width: `${percentage}%`
                                                }}
                                            >
                                                <div className="absolute inset-0 bg-white/20"></div>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Rendimiento por usuario */}
                    <div className="bg-white p-8 rounded-2xl shadow-xl shadow-slate-200/40 border border-slate-100">
                        <h3 className="text-lg font-bold text-slate-800 mb-6">Top Rendimiento</h3>
                        <div className="space-y-4 max-h-80 overflow-y-auto pr-2 custom-scrollbar">
                            {metrics.byUser
                                .filter(item => item.count > 0)
                                .sort((a, b) => b.completed - a.completed)
                                .map((item, index) => {
                                    const completionRate = item.count > 0 ? Math.round((item.completed / item.count) * 100) : 0;
                                    return (
                                        <div key={item.user.id} className="flex items-center gap-4 p-3 rounded-xl hover:bg-slate-50 transition-colors border border-transparent hover:border-slate-100">
                                            <div className="font-bold text-slate-300 text-lg w-6 text-center">#{index + 1}</div>
                                            <UserAvatar
                                                url={item.user.avatar_url}
                                                name={item.user.nombre_completo}
                                                size="md"
                                                showTooltip={false}
                                            />
                                            <div className="flex-1">
                                                <div className="flex justify-between text-sm mb-1">
                                                    <span className="font-semibold text-slate-800">{item.user.nombre_completo}</span>
                                                    <span className="font-bold text-indigo-600">{completionRate}%</span>
                                                </div>
                                                <div className="w-full bg-slate-100 rounded-full h-2">
                                                    <div
                                                        className="h-2 rounded-full bg-gradient-to-r from-indigo-500 to-violet-500 transition-all duration-1000"
                                                        style={{ width: `${completionRate}%` }}
                                                    />
                                                </div>
                                                <div className="text-[10px] text-slate-400 mt-1">
                                                    {item.completed} de {item.count} tareas completadas
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })}
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    // --- RENDER PRINCIPAL ---
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-indigo-50/30 p-4 md:p-8 font-sans text-slate-600 transition-colors duration-300">

            {/* Toasts */}
            <div className="fixed top-6 right-6 z-[60] space-y-3 pointer-events-none">
                {toasts.map(toast => (
                    <div className="pointer-events-auto" key={toast.id}>
                        <Toast
                            message={toast.message}
                            type={toast.type}
                            onClose={() => removeToast(toast.id)}
                        />
                    </div>
                ))}
            </div>

            {/* Header Mejorado */}
            <div className="flex flex-col h-full bg-white border-x border-slate-200 min-h-screen">
    
    {/* 1. HEADER SUPERIOR: Título y Vistas (Estilo Pestañas) */}
    <div className="flex flex-col md:flex-row items-start md:items-center justify-between px-6 py-4 border-b border-slate-200 bg-white sticky top-0 z-20">
        <div className="flex items-center gap-6">
            {/* Título más compacto */}
            <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                    <Layout size={20} />
                </div>
                <div>
                    <h1 className="text-xl font-bold text-slate-800">Tablero de Control</h1>
                    <p className="text-xs text-slate-500 font-medium">Gestión de proyectos</p>
                </div>
            </div>

            {/* Separador vertical */}
            <div className="h-8 w-px bg-slate-200 hidden md:block"></div>

            {/* VISTAS TIPO PESTAÑA (ClickUp Style) */}
            <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {[
                    { id: 'kanban', icon: Layout, label: 'Tablero' },
                    { id: 'list', icon: List, label: 'Lista' },
                    { id: 'timeline', icon: BarChart3, label: 'Cronograma' },
                    { id: 'analytics', icon: TrendingUp, label: 'Reportes' }
                ].map((view) => (
                    <button
                        key={view.id}
                        onClick={() => setViewMode(view.id as any)}
                        className={`
                            group flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap border-b-2
                            ${viewMode === view.id
                                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                            }
                        `}
                    >
                        <view.icon size={16} className={viewMode === view.id ? "text-indigo-600" : (view.id === 'timeline' ? 'rotate-90' : '')} />
                        {view.label}
                    </button>
                ))}
            </div>
        </div>

        {/* Botón Principal a la derecha */}
        {['Admin', 'Manager'].includes(profile?.rol_nombre || '') && (
            <button
                onClick={() => {
                    setEditingTask(null);
                    setIsModalOpen(true);
                }}
                className="hidden md:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-colors shadow-sm"
            >
                <Plus size={16} />
                <span>Nueva Tarea</span>
            </button>
        )}
    </div>

    {/* 2. BARRA DE HERRAMIENTAS (TOOLBAR): Buscador y Filtros Compactos */}
    <div className="flex flex-col xl:flex-row items-center gap-4 px-6 py-3 border-b border-slate-200 bg-slate-50/30">
        
        {/* Buscador Compacto */}
        <div className="relative group w-full xl:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
            <input
                type="text"
                placeholder="Buscar tareas..."
                className="w-full pl-9 pr-4 py-1.5 rounded-md border border-slate-200 bg-white text-sm focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 transition-all placeholder:text-slate-400"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>

        {/* Grupo de Filtros Horizontal */}
        <div className="flex flex-wrap items-center gap-2 w-full">
            <div className="h-6 w-px bg-slate-300 mx-2 hidden xl:block"></div>
            
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mr-1 hidden xl:block">Filtros:</p>

            {/* Nota: Asumo que tus CustomSelector aceptan className para ajustar el tamaño. 
                Si no, envuélvelos en un div con ancho fijo o ajusta sus estilos internos. */}
            
            <div className="w-32 md:w-40">
                <CustomSelector
                                options={estados}
                                value={filterEstado}
                                onChange={(val) => setFilterEstado(val as string)}
                                placeholder="Estado"
                                icon={Filter}
                                searchable={false}
                                className="!py-1.5 !text-xs" // Ajuste CSS para hacerlos "mini"
                                label={''}                />
            </div>

            <div className="w-32 md:w-40">
                <CustomSelector
                                options={prioridades}
                                value={filterPrioridad}
                                onChange={(val) => setFilterPrioridad(val as string)}
                                placeholder="Prioridad"
                                icon={Star}
                                searchable={false}
                                className="!py-1.5 !text-xs" label={''}                />
            </div>

            <div className="w-40 md:w-48">
                <CustomSelector
                                options={usuariosParaAsignar}
                                value={filterUsuario}
                                onChange={(val) => setFilterUsuario(val as string)}
                                placeholder="Asignado a"
                                icon={UserIcon}
                                searchable={true}
                                getDisplayValue={(user) => user.nombre_completo}
                                getSearchValue={(user) => user.nombre_completo}
                                getAvatar={(user) => user.avatar_url}
                                className="!py-1.5 !text-xs" label={''}                />
            </div>

            {/* Fecha Simple */}
            <select
                className="rounded-md border-slate-200 text-xs py-1.5 pl-3 pr-8 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-600"
                value={filterFecha}
                onChange={(e) => setFilterFecha(e.target.value)}
            >
                <option value="all">Cualquier fecha</option>
                <option value="today">Hoy</option>
                <option value="week">Esta semana</option>
                <option value="overdue">Vencidas</option>
            </select>
        </div>

        {/* Botones de Utilidad (Refrescar / Ordenar) a la derecha */}
        <div className="flex items-center gap-2 ml-auto">
            <button
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                title="Ordenar"
            >
                {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            <button
                onClick={async () => {
                    setRefreshing(true);
                    await fetchData();
                    setRefreshing(false);
                    addToast("Sincronizado", "success");
                }}
                disabled={refreshing}
                className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors disabled:opacity-50"
                title="Actualizar"
            >
                <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
            </button>
        </div>
    </div>

    {/* 3. AREA DE CONTENIDO PRINCIPAL */}
    <div className="flex-1 bg-slate-50 overflow-hidden relative">
        {loading ? (
            <div className="flex flex-col items-center justify-center h-full text-slate-400">
                <Layout size={48} className="mb-4 opacity-20 animate-pulse text-indigo-500" />
                <p className="text-sm font-medium">Cargando tablero...</p>
            </div>
        ) : (
            <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
                {/* Aquí renderizas tus componentes existentes, se adaptarán al contenedor */}
                {viewMode === 'kanban' && <KanbanBoard />}
                {viewMode === 'list' && <ListBoard />}
                {viewMode === 'timeline' && <TimelineBoard />}
                {viewMode === 'analytics' && <AnalyticsBoard />}
            </div>
        )}
    </div>
</div>

            {/* Modal de Creación/Edición de Tarea */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto">
                        <div className="px-8 py-5 border-b border-slate-100 flex justify-between items-center bg-white sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 flex items-center gap-3">
                                    {editingTask ? <Edit2 className="text-indigo-500" /> : <Plus className="text-indigo-500" />}
                                    {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                                </h3>
                                <p className="text-sm text-slate-500 mt-1">Completa la información necesaria para el proyecto</p>
                            </div>
                            <button
                                onClick={() => {
                                    setIsModalOpen(false);
                                    setEditingTask(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleCreateTask} className="p-8 space-y-8">
                            {/* Título y descripción */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Título de la Tarea</label>
                                    <input
                                        type="text"
                                        required
                                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all px-5 py-4 text-lg font-medium placeholder-slate-400"
                                        value={newTask.titulo}
                                        onChange={e => setNewTask({ ...newTask, titulo: e.target.value })}
                                        placeholder="Ej: Revisar reporte mensual de ventas"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Descripción</label>
                                    <textarea
                                        rows={4}
                                        className="w-full rounded-xl border-2 border-slate-100 bg-slate-50 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all px-5 py-4 text-base placeholder-slate-400"
                                        value={newTask.descripcion}
                                        onChange={e => setNewTask({ ...newTask, descripcion: e.target.value })}
                                        placeholder="Describe detalladamente la tarea, objetivos, requisitos y cualquier información relevante..."
                                    />
                                </div>
                            </div>

                            {/* Selectores mejorados */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <CustomSelector
                                    options={prioridades}
                                    value={newTask.prioridad_id}
                                    onChange={(value) => setNewTask({ ...newTask, prioridad_id: value as string })}
                                    placeholder="Seleccionar..."
                                    label="Prioridad"
                                    icon={Star}
                                    searchable={false}
                                    getDisplayValue={(p) => p.nombre}
                                    getSearchValue={(p) => p.nombre}
                                />

                                <CustomSelector
                                    options={usuariosParaAsignar}
                                    value={newTask.asignado_a}
                                    onChange={(value) => setNewTask({ ...newTask, asignado_a: value as string })}
                                    placeholder="Sin asignar"
                                    label="Responsable"
                                    icon={UserIcon}
                                    searchable={true}
                                    getDisplayValue={(u) => u.nombre_completo}
                                    getSearchValue={(u) => u.nombre_completo}
                                    getAvatar={(u) => u.avatar_url}
                                />

                                <CustomSelector
                                    options={departamentos}
                                    value={newTask.departamento_id}
                                    onChange={(value) => setNewTask({ ...newTask, departamento_id: value as string })}
                                    placeholder="Sin departamento"
                                    label="Departamento"
                                    icon={Users}
                                    searchable={true}
                                    getDisplayValue={(d) => d.nombre}
                                    getSearchValue={(d) => d.nombre}
                                />
                            </div>

                            {/* Fechas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Inicio</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all px-4 py-3"
                                        value={newTask.fecha_inicio}
                                        onChange={e => setNewTask({ ...newTask, fecha_inicio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Vencimiento</label>
                                    <input
                                        type="date"
                                        className="w-full rounded-xl border-none bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all px-4 py-3"
                                        value={newTask.fecha_fin}
                                        onChange={e => setNewTask({ ...newTask, fecha_fin: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Zona de adjuntos */}
                            <div className="border-3 border-dashed border-slate-200 rounded-2xl p-8 text-center hover:bg-slate-50 hover:border-indigo-300 transition-all cursor-pointer group">
                                <div className="flex flex-col items-center gap-3 text-slate-400 group-hover:text-indigo-600 transition-colors">
                                    <div className="p-4 bg-slate-100 rounded-full group-hover:bg-indigo-100 transition-colors">
                                        <Upload size={28} />
                                    </div>
                                    <div>
                                        <span className="text-base font-bold block text-slate-600 group-hover:text-indigo-700">Subir archivos adjuntos</span>
                                        <span className="text-sm text-slate-400 block mt-1">
                                            Soporta: PDF, DOC, XLS, JPG, PNG (máx. 10MB)
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Botones de acción */}
                            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-4">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsModalOpen(false);
                                        setEditingTask(null);
                                    }}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                                >
                                    <Save size={18} />
                                    {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal de Detalles de Tarea */}
            {isDetailModalOpen && selectedTaskForDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
                    <div className="bg-white w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[95vh] overflow-y-auto">
                        <div className="px-8 py-6 border-b border-slate-100 flex justify-between items-start bg-white sticky top-0 z-10">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    {selectedTaskForDetail.prioridad && (
                                        <PriorityBadge
                                            nombre={selectedTaskForDetail.prioridad.nombre}
                                            color={selectedTaskForDetail.prioridad.color}
                                            level={selectedTaskForDetail.prioridad.nivel}
                                        />
                                    )}
                                    <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">ID: {selectedTaskForDetail.id.slice(0, 8)}</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 leading-tight">
                                    {selectedTaskForDetail.titulo}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    setSelectedTaskForDetail(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="p-8">
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                {/* Información principal */}
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="prose prose-slate max-w-none">
                                        <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide mb-3">Descripción</h4>
                                        <div className="bg-slate-50 rounded-2xl p-6 border border-slate-100">
                                            <p className="text-slate-700 whitespace-pre-wrap leading-relaxed">
                                                {selectedTaskForDetail.descripcion || 'Sin descripción disponible.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wide">Comentarios y Actividad</h4>
                                            <button className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Agregar comentario</button>
                                        </div>
                                        <div className="space-y-4">
                                            {selectedTaskForDetail.comentarios?.map(comentario => (
                                                <div key={comentario.id} className="flex gap-4">
                                                    <div className="shrink-0">
                                                        <UserAvatar
                                                            url={comentario.usuario?.avatar_url}
                                                            name={comentario.usuario?.nombre_completo || 'Usuario'}
                                                            size="md"
                                                            showTooltip={false}
                                                        />
                                                    </div>
                                                    <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex-1">
                                                        <div className="flex justify-between items-center mb-1">
                                                            <span className="font-bold text-slate-800 text-sm">
                                                                {comentario.usuario?.nombre_completo}
                                                            </span>
                                                            <span className="text-xs text-slate-400 font-medium">
                                                                {new Date(comentario.created_at).toLocaleString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-slate-600 text-sm">{comentario.contenido}</p>
                                                    </div>
                                                </div>
                                            )) || (
                                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                        <MessageSquare size={40} className="mx-auto mb-3 text-slate-300" />
                                                        <p className="text-slate-500 font-medium">No hay comentarios aún</p>
                                                        <p className="text-slate-400 text-sm">Sé el primero en comentar sobre esta tarea</p>
                                                    </div>
                                                )}
                                        </div>
                                    </div>
                                </div>

                                {/* Panel lateral */}
                                <div className="space-y-6">
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Estado Actual</h4>
                                        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div
                                                className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white"
                                                style={{ backgroundColor: selectedTaskForDetail.estado?.color }}
                                            />
                                            <span className="font-bold text-slate-800 text-lg">
                                                {selectedTaskForDetail.estado?.nombre}
                                            </span>
                                        </div>

                                        <label className="text-xs font-bold text-slate-500 mb-2 block">Cambiar estado:</label>
                                        <select
                                            className="w-full rounded-xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 px-3 py-2.5 text-sm font-medium"
                                            value={selectedTaskForDetail.estado_id}
                                            onChange={(e) => handleUpdateTaskStatus(selectedTaskForDetail.id, e.target.value)}
                                        >
                                            {estados.map(estado => (
                                                <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Responsable</h4>
                                        {selectedTaskForDetail.asignado ? (
                                            <div className="flex items-center gap-4">
                                                <UserAvatar
                                                    url={selectedTaskForDetail.asignado.avatar_url}
                                                    name={selectedTaskForDetail.asignado.nombre_completo}
                                                    size="lg"
                                                />
                                                <div className="overflow-hidden">
                                                    <div className="font-bold text-slate-900 truncate">
                                                        {selectedTaskForDetail.asignado.nombre_completo}
                                                    </div>
                                                    <div className="text-xs text-slate-500 truncate">
                                                        {selectedTaskForDetail.asignado.email}
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-slate-500 italic text-sm flex items-center gap-2">
                                                <UserIcon size={16} /> Sin asignar
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Cronograma</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                <span className="text-slate-500 text-sm font-medium">Inicio</span>
                                                <span className="text-slate-900 font-bold">
                                                    {new Date(selectedTaskForDetail.fecha_inicio).toLocaleDateString()}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl relative overflow-hidden">
                                                {new Date(selectedTaskForDetail.fecha_fin) < new Date() && selectedTaskForDetail.estado?.nombre !== 'Completada' && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                                )}
                                                <span className="text-slate-500 text-sm font-medium">Vencimiento</span>
                                                <span className={`font-bold ${new Date(selectedTaskForDetail.fecha_fin) < new Date() && selectedTaskForDetail.estado?.nombre !== 'Completada' ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {new Date(selectedTaskForDetail.fecha_fin).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <div className="flex justify-between items-center mb-4">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide">Archivos</h4>
                                            <button className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1">
                                                <Plus size={12} /> Agregar
                                            </button>
                                        </div>
                                        {selectedTaskForDetail.adjuntos && selectedTaskForDetail.adjuntos.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedTaskForDetail.adjuntos.map(adjunto => (
                                                    <div key={adjunto.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl hover:bg-slate-100 transition-colors cursor-pointer group">
                                                        <div className="bg-white p-2 rounded-lg shadow-sm">
                                                            <FileText size={18} className="text-indigo-500" />
                                                        </div>
                                                        <span className="text-sm font-medium text-slate-700 flex-1 truncate">
                                                            {adjunto.nombre_archivo}
                                                        </span>
                                                        <Upload size={14} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 text-sm text-center py-4 italic">No hay archivos adjuntos</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}