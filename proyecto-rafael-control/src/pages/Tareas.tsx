import { useState, useEffect, useMemo, useRef } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
// Estilos de FilePond
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
// Plugins de FilePond
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

// Registrar los plugins
registerPlugin(FilePondPluginImagePreview, FilePondPluginFileValidateType);
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Paperclip, MessageSquare, MoreHorizontal,
    Layout, List, BarChart3, Filter, ChevronDown, ChevronUp,
    User as UserIcon, X, FileText, Edit2, Trash2, Eye,
    CheckCircle, AlertCircle, XCircle, Users,
    Bell, Star,

    RefreshCw, Save, Clock
} from 'lucide-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';



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
    archivos_json?: string[];
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
    colaboradores?: { usuario_id: string, usuario: { nombre_completo: string, avatar_url: string | null } }[]; // Nuevo campo
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
    comentario_id?: string | null;
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

interface TempAttachment {
    path: string;
    name: string;
    size: number;
    type: string;
}

// --- COMPONENTES VISUALES AVANZADOS ---
// Componente de Notificaciones Toast
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'warning' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const toastConfig = {
        success: { icon: CheckCircle, color: 'text-green-500', style: 'border-green-100 shadow-green-500/10' },
        error: { icon: XCircle, color: 'text-red-500', style: 'border-red-100 shadow-red-500/10' },
        warning: { icon: AlertCircle, color: 'text-amber-500', style: 'border-amber-100 shadow-amber-500/10' },
        info: { icon: Bell, color: 'text-blue-500', style: 'border-blue-100 shadow-blue-500/10' },
    }[type];

    const Icon = toastConfig.icon;

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border bg-white/95 backdrop-blur-sm shadow-lg ${toastConfig.style} animate-slide-in-right max-w-sm w-full`}>
            <Icon className={toastConfig.color} size={20} />
            <span className="text-sm font-medium text-slate-700 flex-1">{message}</span>
            <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 hover:bg-slate-100 rounded-lg transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

// 1. Para leer desde la Base de Datos (o edición):
// Simplemente cortamos el string. Si viene "2025-12-26T00:00:00", tomamos los primeros 10 caracteres.
const parseDateString = (dateStr?: string | null) => {
    if (!dateStr) return '';
    // Tomamos estrictamente la parte de la fecha calendario YYYY-MM-DD
    return dateStr.substring(0, 10);
};

// 2. Para generar la fecha de "Hoy" o futuros días en TU hora local (Ecuador):
// Construimos el string manualmente para evitar que toISOString() convierta a UTC.
const getLocalISOString = (daysToAdd = 0) => {
    const date = new Date();
    // Sumar días si es necesario
    if (daysToAdd !== 0) {
        date.setDate(date.getDate() + daysToAdd);
    }

    const year = date.getFullYear();
    // getMonth() devuelve 0-11, así que sumamos 1. padStart asegura que sea '01' en vez de '1'
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
};

// Función para mostrar fecha CORTA (ej: 26 dic) forzando UTC
const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-EC', {
        timeZone: 'UTC', // <--- LA CLAVE: Forzar UTC
        day: 'numeric',
        month: 'short'
    });
};

// Función para mostrar fecha LARGA (ej: 26/12/2025) forzando UTC
const formatFullDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-EC', {
        timeZone: 'UTC', // <--- LA CLAVE: Forzar UTC
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

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
                <div className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold ring-2 ring-white shadow-sm transition-all duration-200 group-hover:ring-indigo-400 group-hover:scale-105`}>
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

// Selector Personalizado
const CustomSelector = ({
    options,
    value,
    onChange,
    placeholder,
    label,
    icon: Icon,
    searchable = true,
    multiple = false,
    disabled = false, // <--- NUEVA PROPIEDAD
    className = "",
    getDisplayValue = (option: any) => option.nombre || option.nombre_completo,
    getSearchValue = (option: any) => option.nombre || option.nombre_completo,
    getAvatar = (option: any) => option.avatar_url
}: {
    options: any[];
    value: string | string[];
    onChange: (value: string | string[]) => void;
    placeholder: string;
    label: string;
    icon: any;
    searchable?: boolean;
    multiple?: boolean;
    disabled?: boolean; // <--- TIPO NUEVA PROPIEDAD
    className?: string;
    getDisplayValue?: (option: any) => string;
    getSearchValue?: (option: any) => string;
    getAvatar?: (option: any) => string | null;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ left: 0, top: 0, width: 0, maxHeight: 300 });

    // ... (lógica de filteredOptions, selectedValues, handleSelect, etc. se mantiene igual)
    const filteredOptions = useMemo(() => {
        if (!searchTerm) return options;
        return options.filter(option => getSearchValue(option).toLowerCase().includes(searchTerm.toLowerCase()));
    }, [options, searchTerm, getSearchValue]);

    const selectedValues = Array.isArray(value) ? value : value ? [value] : [];
    const selectedOptions = options.filter(option => selectedValues.includes(option.id));

    const handleSelect = (optionId: string) => {
        if (multiple) {
            const newValue = selectedValues.includes(optionId) ? selectedValues.filter(id => id !== optionId) : [...selectedValues, optionId];
            onChange(newValue);
        } else {
            onChange(optionId);
            setIsOpen(false);
        }
    };

    const getDisplayText = () => {
        if (selectedOptions.length === 0) return placeholder;
        if (multiple && selectedOptions.length > 1) return `${selectedOptions.length} seleccionados`;
        return getDisplayValue(selectedOptions[0]);
    };

    // ... (lógica de posicionamiento y useEffects se mantiene igual)
    const updatePosition = () => {
        if (buttonRef.current) {
            const rect = buttonRef.current.getBoundingClientRect();
            const windowHeight = window.innerHeight;
            const spaceBelow = windowHeight - rect.bottom;
            const TARGET_HEIGHT = 300;
            const MARGIN_BOTTOM = 20;
            const dynamicMaxHeight = Math.max(100, Math.min(TARGET_HEIGHT, spaceBelow - MARGIN_BOTTOM));

            setCoords({
                left: rect.left + window.scrollX,
                top: rect.bottom + window.scrollY + 6,
                width: rect.width,
                maxHeight: dynamicMaxHeight
            });
        }
    };

    useEffect(() => {
        if (isOpen) {
            updatePosition();
            window.addEventListener('resize', updatePosition);
            window.addEventListener('scroll', updatePosition, true);
        }
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, true);
        };
    }, [isOpen]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (isOpen && buttonRef.current && !buttonRef.current.contains(event.target as Node)) {
                const dropdownElement = document.getElementById(`dropdown-${label || placeholder}`);
                if (dropdownElement && !dropdownElement.contains(event.target as Node)) {
                    setIsOpen(false);
                }
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen, label, placeholder]);

    return (
        <div className={`relative ${className} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}> {/* Estilo visual para disabled */}
            {label && (
                <label className="block text-xs font-bold uppercase text-slate-500 mb-1.5 ml-1">
                    {label}
                </label>
            )}

            <button
                ref={buttonRef}
                type="button"
                disabled={disabled} // Bloqueo funcional
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white text-left transition-all duration-200 
                    ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg' : 'border-slate-200'}
                    ${!disabled && 'hover:border-slate-300 hover:bg-slate-50/50'}
                `}
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
                {/* Ocultamos el chevron si está deshabilitado para que parezca más "solo lectura" */}
                {!disabled && (isOpen ? <ChevronUp size={16} className="text-indigo-500 shrink-0 ml-2" /> : <ChevronDown size={16} className="text-slate-400 shrink-0 ml-2" />)}
            </button>

            {isOpen && !disabled && createPortal(
                <div
                    id={`dropdown-${label || placeholder}`}
                    className="absolute bg-white rounded-xl shadow-xl border border-slate-100 overflow-hidden animation-fade-in-down z-9999 flex flex-col"
                    style={{
                        left: coords.left,
                        top: coords.top,
                        width: coords.width,
                        minWidth: '220px',
                        maxHeight: coords.maxHeight
                    }}
                >
                    {/* ... (contenido del dropdown se mantiene igual) ... */}
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 bg-slate-50/50 shrink-0">
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

                    <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 text-sm">No se encontraron opciones</div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.id);
                                return (
                                    <div
                                        key={option.id}
                                        onClick={() => handleSelect(option.id)}
                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 text-indigo-700' : 'hover:bg-slate-50 text-slate-700'}`}
                                    >
                                        {getAvatar(option) ? (
                                            <div className="shrink-0">
                                                <UserAvatar url={getAvatar(option)} name={getDisplayValue(option)} size="sm" showTooltip={false} />
                                            </div>
                                        ) : (
                                            <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isSelected ? 'bg-indigo-500' : 'bg-slate-300'}`}>
                                                {getDisplayValue(option).substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{getDisplayValue(option)}</div>
                                            {option.email && <div className="text-xs text-slate-400 truncate">{option.email}</div>}
                                        </div>
                                        {isSelected && <CheckCircle size={16} className="text-indigo-600 shrink-0" />}
                                    </div>
                                );
                            })
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};

// --- HOOK REUTILIZABLE PARA TOOLTIPS ---
const useTaskTooltip = () => {
    const [tooltipData, setTooltipData] = useState<{ x: number; y: number; days: number; title: string } | null>(null);

    const handleMouseEnter = (e: React.MouseEvent, tarea: Tarea) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const daysLeft = Math.ceil((new Date(tarea.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        setTooltipData({
            x: rect.left + (rect.width / 2), // Centrado
            y: rect.top,
            days: daysLeft,
            title: tarea.titulo
        });
    };

    const handleMouseLeave = () => setTooltipData(null);

    // Componente que renderiza el portal automáticamente
    const TooltipComponent = () => (
        tooltipData ? createPortal(
            <div className="fixed z-9999 pointer-events-none flex flex-col items-center animate-fade-in"
                style={{ left: tooltipData.x, top: tooltipData.y - 10, transform: 'translate(-50%, -100%)' }}>
                <div className="bg-slate-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-xl flex flex-col items-center">
                    <span className="font-bold mb-0.5">{tooltipData.title}</span>
                    <span className={`${tooltipData.days < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                        {tooltipData.days < 0 ? `Venció hace ${Math.abs(tooltipData.days)} días` : `Vence en: ${tooltipData.days} días`}
                    </span>
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800"></div>
            </div>, document.body
        ) : null
    );

    return { handleMouseEnter, handleMouseLeave, TooltipComponent };
};


// Componente Principal
export default function TareasAvanzadas() {
    const { profile } = useAuth();

    // Estados principales
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'timeline'>('kanban');
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
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');

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
    const [tempAttachments, setTempAttachments] = useState<TempAttachment[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const FilePondComponent = FilePond as any;
    const MySwal = withReactContent(Swal);

    // Estados para el COMENTARIO
    const [newCommentText, setNewCommentText] = useState('');
    const [commentFiles, setCommentFiles] = useState<any[]>([]); // Visual FilePond Comentarios
    const [tempCommentAttachments, setTempCommentAttachments] = useState<TempAttachment[]>([]); // Datos FilePond Comentarios
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);

    // Estado del formulario
    const [newTask, setNewTask] = useState({
        titulo: '',
        descripcion: '',
        prioridad_id: '',
        asignado_a: '',
        colaboradores: [] as string[],
        // AQUÍ EL CAMBIO: Usamos la nueva función para obtener la fecha local exacta
        fecha_inicio: getLocalISOString(0), // 0 días = Hoy
        fecha_fin: getLocalISOString(2),    // 2 días = Pasado mañana
        departamento_id: '',
    });

    useEffect(() => {
        if (editingTask) {
            // --- MODO EDICIÓN ---
            // Obtenemos datos derivados
            const assignedUser = usuariosParaAsignar.find(u => u.id === editingTask.asignado_a);
            const derivedDeptId = assignedUser?.departamento_id || editingTask.departamento_id || '';

            setNewTask({
                titulo: editingTask.titulo,
                descripcion: editingTask.descripcion || '',
                prioridad_id: editingTask.prioridad_id || '',
                asignado_a: editingTask.asignado_a || '',

                // CORRECCIÓN: Tratamos la fecha como texto plano. 
                // Cortamos los primeros 10 caracteres y listo.
                fecha_inicio: parseDateString(editingTask.fecha_inicio),
                fecha_fin: parseDateString(editingTask.fecha_fin),
                colaboradores: editingTask.colaboradores?.map(c => c.usuario_id) || [], // Cargar IDs
                departamento_id: derivedDeptId
            });
        } else {
            // --- MODO CREAR NUEVA ---

            setNewTask({
                titulo: '',
                descripcion: '',
                prioridad_id: '',
                asignado_a: '',
                // CORRECCIÓN: Generamos el string YYYY-MM-DD basado en tu hora local de PC
                fecha_inicio: getLocalISOString(0), // Hoy
                fecha_fin: getLocalISOString(2),    // Hoy + 2 días
                departamento_id: profile?.departamento_id || '',
                colaboradores: [],
            });
        }
    }, [editingTask, profile, usuariosParaAsignar]);

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
                        : user.roles

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
                departamento:departamento_id(nombre, manager:manager_id(nombre_completo)),
                adjuntos(*),
                comentarios(
                    *,
                    usuario:usuario_id(nombre_completo, avatar_url)
                ),
                colaboradores:tarea_colaboradores(
                    usuario_id,
                    usuario:usuario_id(nombre_completo, avatar_url)
                )
            `)
                .order(sortBy, { ascending: sortOrder === 'asc' });

            // Solo aplicamos filtro extra para Manager (opcional, para enfocar su vista)
            if (profile?.rol_nombre === 'Manager') {
                if (profile.departamento_id) {
                    query = query.eq('departamento_id', profile.departamento_id);
                }
            }

            const { data: tareasData, error } = await query;
            if (error) throw error;

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

            // Filtrado Final en Memoria (Esto está bien, se mantiene para reforzar la UI)
            let finalTareas = tareasWithCounts;

            if (profile?.rol_nombre === 'Usuario') {
                finalTareas = tareasWithCounts.filter(t =>
                    t.asignado_a === profile.id ||
                    t.creador_id === profile.id ||
                    // Verifica si su ID está en la lista de colaboradores descargada
                    (t.colaboradores && t.colaboradores.some((c: any) => c.usuario_id === profile.id))
                );
            }

            setTareas(finalTareas);
        } catch (error) {
            console.error("Error cargando tareas:", error);
            addToast("Error al cargar las tareas", "error");
        }
    };

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // --- VALIDACIÓN DE SEGURIDAD FRONTEND ---
            let asignadoFinal = newTask.asignado_a || null;

            // Si es usuario, forzamos la asignación a sí mismo para cumplir la regla SQL
            if (profile?.rol_nombre === 'Usuario') {
                asignadoFinal = profile.id;
            }
            // 1. Preparamos los datos de la TAREA (sin archivos_json)
            const taskData = {
                titulo: newTask.titulo,
                descripcion: newTask.descripcion,
                prioridad_id: newTask.prioridad_id,
                asignado_a: newTask.asignado_a || null,
                fecha_inicio: newTask.fecha_inicio,
                fecha_fin: newTask.fecha_fin,
                departamento_id: newTask.departamento_id || profile?.departamento_id || null,
                creador_id: editingTask ? editingTask.creador_id : profile?.id,
                // Quitamos archivos_json
            };

            let tareaId = editingTask?.id;

            // 2. Insertamos o Actualizamos la TAREA
            if (editingTask) {
                const { error } = await supabase.from('tareas')
                    .update({ ...taskData, updated_at: new Date().toISOString() })
                    .eq('id', editingTask.id);
                if (error) throw error;
            } else {
                // Es IMPORTANTE usar .select().single() para obtener el ID de la nueva tarea
                const defaultState = estados.find(e => e.nombre === 'Nueva')?.id || estados[0]?.id;
                const { data: newTarea, error } = await supabase.from('tareas')
                    .insert({ ...taskData, estado_id: defaultState })
                    .select()
                    .single();

                if (error) throw error;
                tareaId = newTarea.id;
            }

            if (tareaId) {
                // A. Borrar colaboradores existentes para evitar duplicados/complejidad
                await supabase.from('tarea_colaboradores').delete().eq('tarea_id', tareaId);

                // B. Insertar los nuevos seleccionados
                if (newTask.colaboradores.length > 0) {
                    const colaboradoresData = newTask.colaboradores.map(uid => ({
                        tarea_id: tareaId,
                        usuario_id: uid
                    }));
                    await supabase.from('tarea_colaboradores').insert(colaboradoresData);
                }
            }

            // 3. Insertamos los ADJUNTOS en la tabla (Si hay nuevos)
            if (tempAttachments.length > 0 && tareaId) {
                const attachmentsToInsert = tempAttachments.map(file => ({
                    tarea_id: tareaId,
                    subido_por: profile?.id, // Tu tabla requiere este campo
                    nombre_archivo: file.name,
                    url_archivo: file.path, // Guardamos el path del storage
                    tipo_mime: file.type,
                    tamano_bytes: file.size
                }));

                const { error: adjError } = await supabase
                    .from('adjuntos')
                    .insert(attachmentsToInsert);

                if (adjError) throw adjError;
            }

            addToast("Guardado exitosamente", "success");

            // Limpieza
            setIsModalOpen(false);
            setEditingTask(null);
            setTempAttachments([]); // Limpiamos estado
            setFiles([]); // Limpiamos UI FilePond
            await fetchTareas();

        } catch (error) {
            console.error("Error:", error);
            addToast("Error al guardar", "error");
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatusId: string) => {
        try {
            const task = tareas.find(t => t.id === taskId);
            const newStatusObj = estados.find(e => e.id === newStatusId);

            if (!task || !newStatusObj) return;

            // 1. Actualizar en Supabase
            const { error } = await supabase
                .from('tareas')
                .update({
                    estado_id: newStatusId,
                    updated_at: new Date().toISOString()
                })
                .eq('id', taskId);

            if (error) throw error;

            // 2. REGISTROS SECUNDARIOS (Historial y Notificaciones)
            // Usamos .then() o los dejamos correr para no retrasar la UI del usuario
            supabase.from('historial_estados').insert({
                tarea_id: taskId,
                estado_anterior_id: task.estado_id,
                estado_nuevo_id: newStatusId,
                cambiado_por: profile?.id,
            }).then();

            if (task.asignado_a && newStatusObj.nombre === 'Completada') {
                supabase.from('notificaciones').insert({
                    usuario_id: task.asignado_a,
                    tipo: 'tarea_completada',
                    titulo: 'Tarea Completada',
                    mensaje: `La tarea "${task.titulo}" ha sido marcada como completada`,
                    tarea_id: taskId
                }).then();
            }

            // --- PASOS DE CIERRE Y FEEDBACK ---

            // 3. Mostrar el Toast inmediatamente
            addToast("Estado de tarea actualizado", "success");

            // 4. CERRAR EL MODAL
            // Dependiendo de cómo manejes tu modal, usa una de estas dos (o ambas):
            setSelectedTaskForDetail(null); // Si el modal se abre cuando hay una tarea seleccionada
            // setIsModalOpen(false);       // Si usas un booleano aparte

            // 5. Refrescar la lista principal de fondo
            await fetchTareas();

        } catch (error) {
            console.error("Error actualizando estado:", error);
            addToast("Error al actualizar el estado", "error");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
        // Buscamos la tarea para mostrar su nombre en la alerta
        const taskToDelete = tareas.find(t => t.id === taskId);
        if (!taskToDelete) return;

        MySwal.fire({
            title: <p className="text-2xl font-bold text-slate-800 dark:text-white">¿Eliminar tarea?</p>,
            html: (
                <div className="text-left space-y-2 text-slate-600 dark:text-slate-400">
                    <p>Estás a punto de eliminar la tarea <b>{taskToDelete.titulo}</b>.</p>
                    <p className="text-red-500 font-semibold">⚠️ Esta acción eliminará permanentemente:</p>
                    <ul className="list-disc ml-6 text-sm">
                        <li>Todos los archivos adjuntos vinculados</li>
                        <li>El historial de comentarios y chats</li>
                        <li>El registro de cambios de estado</li>
                        <li>Las notificaciones asociadas</li>
                    </ul>
                    <p className="mt-4 italic text-xs">Esta acción no se puede deshacer.</p>
                </div>
            ),
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#ef4444',
            cancelButtonColor: '#64748b',
            confirmButtonText: 'Sí, eliminar todo',
            cancelButtonText: 'Cancelar',
            background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            customClass: {
                popup: 'rounded-3xl border border-slate-200 dark:border-slate-700 shadow-2xl',
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                try {
                    // 1. Eliminar archivos del storage si existen (limpieza profunda)
                    // Nota: Esto requiere que tengas la columna archivos_json o la tabla adjuntos
                    // Si usas la tabla adjuntos, el ON DELETE CASCADE de SQL debería encargarse, 
                    // pero si usas el array JSON, deberías borrarlos manualmente aquí:
                    /* if (taskToDelete.archivos_json && taskToDelete.archivos_json.length > 0) {
                         await supabase.storage.from('adjuntos').remove(taskToDelete.archivos_json);
                    }
                    */

                    // 2. Eliminar la tarea de la BD
                    const { error } = await supabase.from('tareas').delete().eq('id', taskId);
                    if (error) throw error;

                    // 3. Feedback visual
                    MySwal.fire({
                        title: '¡Eliminada!',
                        text: 'La tarea y sus recursos han sido eliminados correctamente.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                    });

                    // 4. Recargar datos
                    await fetchTareas();

                } catch (error) {
                    console.error("Error eliminando tarea:", error);
                    MySwal.fire({
                        title: 'Error',
                        text: 'No se pudo eliminar la tarea. Intenta nuevamente.',
                        icon: 'error',
                        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                    });
                }
            }
        });
    };

    const handleCancelAndCleanup = async () => {
        // 1. Verificamos si hay adjuntos temporales en el estado nuevo
        if (!editingTask && tempAttachments.length > 0) {
            try {
                // PASO CLAVE: Extraemos solo las rutas (strings) de los objetos
                const pathsToDelete = tempAttachments.map(file => file.path);

                const { error } = await supabase.storage
                    .from('adjuntos')
                    .remove(pathsToDelete); // Le pasamos el array de strings

                if (error) {
                    console.error("Error limpiando archivos temporales:", error);
                } else {
                    console.log("Archivos temporales eliminados correctamente");
                }
            } catch (error) {
                console.error("Error de conexión al limpiar:", error);
            }
        }

        // 2. Limpiamos todos los estados de la interfaz
        setIsModalOpen(false);
        setEditingTask(null);
        setTempAttachments([]); // <--- Actualizado: Limpiamos el array de objetos
        setFiles([]);           // Limpiamos la vista visual de FilePond
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

    // --- REGLAS DE NEGOCIO ---

    const handleDeleteComment = async (commentId: string) => {
        const result = await MySwal.fire({
            title: '¿Eliminar comentario?',
            text: "Esta acción no se puede deshacer",
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Sí, eliminar',
            cancelButtonText: 'Cancelar'
        });

        if (result.isConfirmed) {
            const { error } = await supabase.from('comentarios').delete().eq('id', commentId);
            if (!error) {
                addToast("Comentario eliminado", "success");
                // Actualizar UI localmente o recargar tarea
                if (selectedTaskForDetail) openTaskDetail(selectedTaskForDetail); // Refresca simple
            }
        }
    };

    const handleUpdateComment = async (commentId: string) => {
        if (!editingCommentText.trim()) return;

        const { error } = await supabase
            .from('comentarios')
            .update({ contenido: editingCommentText, updated_at: new Date().toISOString() })
            .eq('id', commentId);

        if (!error) {
            addToast("Comentario actualizado", "success");
            setEditingCommentId(null);
            if (selectedTaskForDetail) openTaskDetail(selectedTaskForDetail);
        }
    };

    // Regla 1 y 2: ¿Puede editar los detalles principales (título, fechas, descripción)?
    const canEditTaskDetails = (task: Tarea | null): boolean => {
        if (!task) return true; // Si es nueva tarea, sí puede editar
        if (!profile) return false;

        // Admin siempre puede
        if (profile.rol_nombre === 'Admin') return true;

        // El creador (dueño) siempre puede (aunque sea Manager o Usuario)
        if (task.creador_id === profile.id) return true;

        // Si se la asignaron a él (es asignado o colaborador) pero NO la creó: NO PUEDE EDITAR DETALLES
        return false;
    };

    // Regla: ¿Puede cambiar el ESTADO de la tarea?
    // Permitido para: Admin, Manager (de su depto), Creador, Responsable y Colaboradores.
    const canChangeStatus = (task: Tarea | null): boolean => {
        if (!task || !profile) return false;

        // 1. Admin siempre puede
        if (profile.rol_nombre === 'Admin') return true;

        // 2. Creador siempre puede
        if (task.creador_id === profile.id) return true;

        // 3. Responsable asignado puede
        if (task.asignado_a === profile.id) return true;

        // 4. Colaboradores pueden (CORRECCIÓN CRÍTICA)
        if (task.colaboradores && task.colaboradores.some(c => c.usuario_id === profile.id)) {
            return true;
        }

        // 5. Manager del mismo departamento puede
        if (profile.rol_nombre === 'Manager' && profile.departamento_id === task.departamento_id) {
            return true;
        }

        return false;
    };

    // Regla 1: Filtro de Estados permitidos
    // Regla de Estados Permitidos
    const getAllowedStatuses = (currentStatusId: string) => {
        const task = editingTask || selectedTaskForDetail;

        // 1. Si estamos creando una tarea nueva, mostramos todos los estados iniciales
        if (!task) return estados;

        // 2. Si es ADMIN, siempre ve todo (opcional, por seguridad)
        if (profile?.rol_nombre === 'Admin') {
            return estados;
        }

        // 3. REGLA DEL CREADOR (Manager o Usuario)
        // Si el usuario logueado es quien CREÓ la tarea, tiene acceso a TODOS los estados.
        // Esto cubre: Manager crea tarea propia o para otros, Usuario crea tarea propia.
        if (task.creador_id === profile?.id) {
            return estados;
        }

        // 4. REGLA DEL ASIGNADO (Manager o Usuario)
        // Si no la creó (se la asignaron a él), solo ve los 3 estados permitidos.
        const allowedNames = ['En Progreso', 'Completada', 'Pendiente'];

        return estados.filter(e =>
            // Permitimos los estados restringidos O el estado actual (para que no desaparezca del select)
            allowedNames.includes(e.nombre) || e.id === currentStatusId
        );
    };


    // Regla 4: ¿Puede editar/borrar comentario? (Ej: ventana de 15 minutos)
    const canManageComment = (comentario: Comentario) => {
        if (!profile) return false;
        if (profile.rol_nombre === 'Admin') return true; // Admin modera todo

        // Solo el autor puede
        if (comentario.usuario_id !== profile.id) return false;

        // Tiempo límite: 15 minutos (900000 ms)
        const timeLimit = 15 * 60 * 1000;
        const commentTime = new Date(comentario.created_at).getTime();
        const now = new Date().getTime();

        return (now - commentTime) < timeLimit;
    };

    const handlePostComment = async () => {
        if (!newCommentText.trim() && tempCommentAttachments.length === 0) {
            MySwal.fire({
                title: 'Campo vacío',
                text: 'Escribe un comentario o sube un archivo.',
                icon: 'warning',
                background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
            });
            return;
        }

        if (!selectedTaskForDetail || !profile) return;

        setIsSubmittingComment(true);

        try {
            // 1. Insertar el Comentario
            const { data: commentData, error: commentError } = await supabase
                .from('comentarios')
                .insert({
                    tarea_id: selectedTaskForDetail.id,
                    usuario_id: profile.id,
                    contenido: newCommentText
                })
                .select()
                .single();

            if (commentError) throw commentError;

            // 2. Insertar Adjuntos del Comentario (Si existen)
            if (tempCommentAttachments.length > 0 && commentData) {
                const attachmentsToInsert = tempCommentAttachments.map(file => ({
                    tarea_id: selectedTaskForDetail.id, // Sigue perteneciendo a la tarea
                    comentario_id: commentData.id,      // <--- VINCULACIÓN NUEVA
                    subido_por: profile.id,
                    nombre_archivo: file.name,
                    url_archivo: file.path,
                    tipo_mime: file.type,
                    tamano_bytes: file.size
                }));

                const { error: adjError } = await supabase
                    .from('adjuntos')
                    .insert(attachmentsToInsert);

                if (adjError) throw adjError;
            }

            // 3. Crear notificación (Opcional, pero recomendado)
            // ... lógica de notificación aquí ...

            const { data: updatedTask, error: refreshError } = await supabase
                .from('tareas')
                .select(`
                *,
                asignado:asignado_a(id, nombre_completo, avatar_url, email),
                prioridad:prioridad_id(nombre, color, nivel),
                estado:estado_id(nombre, color),
                creador:creador_id(nombre_completo, avatar_url),
                departamento:departamento_id(nombre, manager:manager_id(nombre_completo)),
                adjuntos(*),
                comentarios(
                    *,
                    usuario:usuario_id(nombre_completo, avatar_url)
                )
            `)
                .eq('id', selectedTaskForDetail.id)
                .single();

            if (refreshError) throw refreshError;

            // 2. Actualizamos el modal con la nueva info (incluyendo el nuevo comentario)
            setSelectedTaskForDetail(updatedTask);

            // 3. Actualizamos la lista de fondo también
            await fetchTareas();

            // 4. Limpieza
            setNewCommentText('');
            setCommentFiles([]);
            setTempCommentAttachments([]);

            addToast("Comentario agregado", "success");

        } catch (error) {
            console.error("Error publicando comentario:", error);
            // ... tu manejo de error con Swal ...
        } finally {
            setIsSubmittingComment(false);
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
    // --- 1. HOOK PARA TOOLTIPS DE AVATARES
    type AvatarTooltipData =
        | { type: 'user'; x: number; y: number; name: string; role?: string }
        | { type: 'list'; x: number; y: number; users: string[] }
        | null;

    const useAvatarTooltip = () => {
        const [tooltip, setTooltip] = useState<AvatarTooltipData>(null);

        const showUserTooltip = (e: React.MouseEvent, name: string, role?: string) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({
                type: 'user',
                x: rect.left + rect.width / 2,
                y: rect.top,
                name,
                role
            });
        };

        const showListTooltip = (e: React.MouseEvent, users: string[]) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setTooltip({
                type: 'list',
                x: rect.left + rect.width / 2,
                y: rect.top,
                users
            });
        };

        const hideTooltip = () => setTooltip(null);

        const TooltipComponent = () =>
            tooltip ? createPortal(
                <div
                    className="fixed z-9999 pointer-events-none flex flex-col items-center animate-fade-in"
                    style={{
                        left: tooltip.x,
                        top: tooltip.y - 8,
                        transform: 'translate(-50%, -100%)'
                    }}
                >
                    <div className="bg-slate-800 text-white text-xs rounded-md px-3 py-2 shadow-xl whitespace-nowrap flex flex-col items-center">
                        {tooltip.type === 'user' && (
                            <>
                                <span className="font-bold">{tooltip.name}</span>
                                {tooltip.role && <span className="text-[10px] text-slate-300 font-medium">{tooltip.role}</span>}
                            </>
                        )}

                        {tooltip.type === 'list' && (
                            <div className="text-left">
                                <span className="block font-bold mb-1 border-b border-slate-600 pb-1 text-slate-300 text-[10px] uppercase">Otros colaboradores</span>
                                <ul className="space-y-0.5">
                                    {tooltip.users.map((u, i) => (
                                        <li key={i} className="text-slate-200 flex items-center gap-1.5">
                                            <div className="w-1 h-1 rounded-full bg-slate-400"></div> {u}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800" />
                </div>,
                document.body
            ) : null;

        return { showUserTooltip, showListTooltip, hideTooltip, TooltipComponent };
    };

    // --- 2. COMPONENTE KANBAN BOARD ACTUALIZADO ---
    const KanbanBoard = () => {
        const [draggedTask, setDraggedTask] = useState<Tarea | null>(null);
        const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);

        // Integramos el hook aquí
        const { showUserTooltip, showListTooltip, hideTooltip, TooltipComponent } = useAvatarTooltip();

        const handleDragStart = (e: React.DragEvent, task: Tarea) => {
            setDraggedTask(task);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.dropEffect = 'move';
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

            // 1. Validaciones básicas
            if (!draggedTask) return;
            if (draggedTask.estado_id === newEstadoId) {
                setDraggedTask(null);
                return;
            }

            // 2. Buscamos el objeto del estado destino para saber su nombre
            const targetStatus = estados.find(st => st.id === newEstadoId);
            if (!targetStatus) return;

            // --- 3. VALIDACIÓN DE RESTRICCIONES (LA LÓGICA QUE PEDISTE) ---

            // A. Si es ADMIN o es el CREADOR, pase directo (tiene permiso total)
            const isFullAccess =
                profile?.rol_nombre === 'Admin' ||
                draggedTask.creador_id === profile?.id;

            if (!isFullAccess) {
                // B. Si NO tiene acceso total, validamos contra la lista blanca
                const allowedNames = ['En Progreso', 'Completada', 'Pendiente'];

                // NOTA: Asegúrate que targetStatus.nombre coincida exactamente (mayúsculas/espacios)
                if (!allowedNames.includes(targetStatus.nombre)) {

                    // C. BLOQUEO: Mostrar Toast y cancelar
                    addToast(
                        `Permiso restringido.
No tienes autorización para mover tareas al estado "${targetStatus.nombre}". 
Estados permitidos: En Progreso, Pendiente y Completada.`,
                        "warning"
                    );


                    setDraggedTask(null); // Cancelar arrastre visual
                    return; // SALIR DE LA FUNCIÓN SIN GUARDAR
                }
            }

            // 4. Si pasó las validaciones, ejecutamos la actualización
            await handleUpdateTaskStatus(draggedTask.id, newEstadoId);
            setDraggedTask(null);
        };

        return (
            <div className="flex h-full gap-5 px-5 pb-2 overflow-x-auto overflow-y-hidden snap-x custom-scrollbar bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800 relative transition-colors duration-300">
                {estados.map(estado => {
                    const tareasEnColumna = filteredAndSortedTareas.filter(t => t.estado_id === estado.id);
                    const isDragOver = dragOverColumn === estado.id;

                    return (
                        <div
                            key={estado.id}
                            className={`flex-shrink-0 w-[340px] flex flex-col h-full max-h-full rounded-2xl transition-all duration-300 snap-center shadow-lg shadow-slate-200/40 dark:shadow-slate-900/30
                            ${isDragOver ? 'bg-white/90 dark:bg-slate-800/90 ring-4 ring-indigo-100/50 dark:ring-indigo-500/20 scale-[1.02] shadow-indigo-200/30 dark:shadow-indigo-900/20' : 'bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm'}
                        `}
                            style={{ borderTopColor: estado.color }}
                            onDragOver={(e) => handleDragOver(e, estado.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, estado.id)}
                        >
                            {/* Header Sticky */}
                            <div className="p-4 flex items-center justify-between sticky top-0 z-10 bg-white/95 dark:bg-slate-800/95 backdrop-blur-md rounded-t-2xl border-b border-slate-100/50 dark:border-slate-700/50 transition-colors duration-300">
                                <div className="flex items-center gap-3">
                                    <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: estado.color }} />
                                    <span className="font-bold text-slate-700 dark:text-slate-200 text-sm uppercase tracking-wider">
                                        {estado.nombre}
                                    </span>
                                    <span className="flex items-center justify-center h-5 px-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-xs font-bold text-slate-500 dark:text-slate-300 shadow-inner transition-colors duration-300">
                                        {tareasEnColumna.length}
                                    </span>
                                </div>
                                <button className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-200 p-1.5 rounded-lg">
                                    <MoreHorizontal size={18} />
                                </button>
                            </div>

                            {/* Área de Cards */}
                            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3 hide-scrollbar">
                                {tareasEnColumna.map(tarea => (
                                    <div
                                        key={tarea.id}
                                        draggable={canChangeStatus(tarea)}
                                        onDragStart={(e) => handleDragStart(e, tarea)}
                                        onClick={() => openTaskDetail(tarea)}
                                        className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 transition-all duration-300 border border-slate-100/80 dark:border-slate-600/50 cursor-grab active:cursor-grabbing"
                                    >
                                        {/* Indicador Prioridad */}
                                        <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full shadow-sm" style={{ backgroundColor: tarea.prioridad?.color || '#cbd5e1' }} />

                                        {/* Cabecera Card */}
                                        <div className="flex justify-between items-start mb-2.5 pl-3">
                                            {tarea.prioridad && (
                                                <div className="px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider border shadow-sm"
                                                    style={{ color: tarea.prioridad.color, backgroundColor: `${tarea.prioridad.color}15`, borderColor: `${tarea.prioridad.color}30` }}>
                                                    {tarea.prioridad.nombre}
                                                </div>
                                            )}
                                            {canEditTaskDetails(tarea) && (
                                                <button onClick={(e) => { e.stopPropagation(); setEditingTask(tarea); setIsModalOpen(true); }}
                                                    className="opacity-0 group-hover:opacity-100 transition-all duration-200 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:scale-110">
                                                    <Edit2 size={14} />
                                                </button>
                                            )}
                                        </div>

                                        {/* Título y Desc */}
                                        <div className="pl-3 mb-3">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug mb-1.5 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
                                                {tarea.titulo}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium transition-colors duration-300">
                                                {tarea.descripcion}
                                            </p>
                                        </div>

                                        {/* Separador */}
                                        <div className="h-px bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-600 dark:to-transparent w-full mb-3 ml-3 transition-colors duration-300" />

                                        {/* Footer con Avatar Stack */}
                                        <div className="pl-3 flex items-center justify-between mt-auto pt-1">
                                            <div className="flex items-center gap-2">

                                                {/* --- AVATAR STACK --- */}
                                                <div className="flex items-center -space-x-2">
                                                    {/* 1. Responsable (z-30) */}
                                                    <div className="z-30 ring-3 ring-white dark:ring-slate-700 rounded-full transition-all duration-200 hover:scale-110 hover:z-40 shadow-sm"
                                                        onMouseEnter={(e) => tarea.asignado ? showUserTooltip(e, tarea.asignado.nombre_completo, 'Responsable') : null}
                                                        onMouseLeave={hideTooltip}
                                                    >
                                                        {tarea.asignado ? (
                                                            <UserAvatar url={tarea.asignado.avatar_url} name={tarea.asignado.nombre_completo} size="sm" showTooltip={false} />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-slate-300 dark:text-slate-500"><UserIcon size={14} /></div>
                                                        )}
                                                    </div>

                                                    {/* 2. Colaboradores (z-20) */}
                                                    {tarea.colaboradores?.slice(0, 2).map((colab) => (
                                                        <div key={colab.usuario_id} className="z-20 ring-3 ring-white dark:ring-slate-700 rounded-full transition-all duration-200 hover:scale-110 hover:z-40 shadow-sm"
                                                            onMouseEnter={(e) => showUserTooltip(e, colab.usuario.nombre_completo, 'Colaborador')}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            <UserAvatar url={colab.usuario.avatar_url} name={colab.usuario.nombre_completo} size="sm" showTooltip={false} />
                                                        </div>
                                                    ))}

                                                    {/* 3. Badge +N (z-10) */}
                                                    {tarea.colaboradores && tarea.colaboradores.length > 2 && (
                                                        <div className="z-10 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-600 ring-3 ring-white dark:ring-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-300 cursor-help transition-all duration-200 hover:scale-110 hover:bg-slate-200 dark:hover:bg-slate-500 shadow-sm"
                                                            onMouseEnter={(e) => showListTooltip(e, tarea.colaboradores!.slice(2).map(c => c.usuario.nombre_completo))}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            +{tarea.colaboradores.length - 2}
                                                        </div>
                                                    )}
                                                </div>

                                                {/* Iconos (Paperclip/Comments) */}
                                                <div className="flex gap-1.5 text-slate-400 dark:text-slate-500 ml-1 transition-colors duration-300">
                                                    {(tarea.adjuntos_count || 0) > 0 && <div className="flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md transition-colors duration-300"><Paperclip size={11} /> {tarea.adjuntos_count}</div>}
                                                    {(tarea.comentarios_count || 0) > 0 && <div className="flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md transition-colors duration-300"><MessageSquare size={11} /> {tarea.comentarios_count}</div>}
                                                </div>
                                            </div>

                                            {/* Fecha */}
                                            <div className={`text-[10px] font-bold flex items-center gap-1 px-2 py-1 rounded-lg border shadow-sm transition-colors duration-300 ${new Date(tarea.fecha_fin) < new Date() && tarea.estado?.nombre !== 'Completada' ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800' : 'text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-700 border-slate-200 dark:border-slate-600'}`}>
                                                <Clock size={11} /> {formatShortDate(tarea.fecha_fin)}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {tareasEnColumna.length === 0 && (
                                    <div className="h-32 border-2 border-dashed border-slate-200/70 dark:border-slate-700/50 rounded-xl flex flex-col items-center justify-center text-slate-400/60 dark:text-slate-500/60 text-xs gap-2.5 bg-slate-50/50 dark:bg-slate-800/50 transition-colors duration-300">
                                        <div className="p-2.5 bg-white dark:bg-slate-700 shadow-sm rounded-full transition-colors duration-300"><Plus size={18} /></div>
                                        <span className="font-medium">Soltar tarea aquí</span>
                                    </div>
                                )}
                            </div>
                        </div>
                    );
                })}
                <TooltipComponent />
            </div>
        );
    };

    // --- VISTA LISTA MEJORADA ---
    const ListBoard = () => (

        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden transition-colors duration-300">
            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead className="bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 border-b border-slate-200 dark:border-slate-700 transition-colors duration-300">
                        <tr>
                            <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider w-[40%] transition-colors duration-300">
                                Tarea
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-300">
                                Estado
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-300">
                                Prioridad
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-300">
                                Asignado
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-300">
                                Entrega
                            </th>
                            <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-300">
                                Acciones
                            </th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50 transition-colors duration-300">
                        {filteredAndSortedTareas.map((t) => (
                            <tr
                                key={t.id}
                                className="hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-white dark:hover:from-slate-700/50 dark:hover:to-slate-700 transition-all duration-200 cursor-pointer group"
                                onClick={() => openTaskDetail(t)}
                            >
                                <td className="px-6 py-4">
                                    <div className="flex items-start gap-4">
                                        <div className="w-1.5 h-10 rounded-full shadow-sm" style={{ backgroundColor: t.prioridad?.color || '#e2e8f0' }}></div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-semibold text-slate-800 dark:text-slate-100 block mb-1 truncate transition-colors duration-300">{t.titulo}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 truncate max-w-md block transition-colors duration-300">{t.descripcion}</div>
                                            <div className="flex items-center gap-2.5 mt-2.5">
                                                {(t.adjuntos_count || 0) > 0 && (
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 transition-colors duration-300">
                                                        <Paperclip size={11} /> {t.adjuntos_count}
                                                    </span>
                                                )}
                                                {(t.comentarios_count || 0) > 0 && (
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md border border-slate-200 dark:border-slate-600 transition-colors duration-300">
                                                        <MessageSquare size={11} /> {t.comentarios_count}
                                                    </span>
                                                )}
                                                {t.departamento && (
                                                    <span className="text-[10px] text-indigo-600 dark:text-indigo-400 flex items-center gap-1 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md font-medium border border-indigo-100 dark:border-indigo-800 transition-colors duration-300">
                                                        <Users size={11} /> {t.departamento.nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border shadow-sm transition-all duration-300"
                                        style={{
                                            backgroundColor: `${t.estado?.color}15`,
                                            color: t.estado?.color,
                                            borderColor: `${t.estado?.color}30`
                                        }}
                                    >
                                        <div className="w-2 h-2 rounded-full shadow-sm" style={{ backgroundColor: t.estado?.color }} />
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
                                        <div className="flex items-center gap-2.5">
                                            <UserAvatar
                                                url={t.asignado.avatar_url}
                                                name={t.asignado.nombre_completo}
                                                size="sm"
                                            />
                                            <span className="text-sm text-slate-700 dark:text-slate-300 font-medium truncate max-w-[120px] transition-colors duration-300">{t.asignado.nombre_completo}</span>
                                        </div>
                                    ) : (
                                        <span className="text-slate-400 dark:text-slate-500 text-sm italic flex items-center gap-1.5 transition-colors duration-300">
                                            <UserIcon size={14} /> Sin asignar
                                        </span>
                                    )}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex flex-col">
                                        <span className={`text-sm font-medium transition-colors duration-300 ${new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada' ? 'text-red-600 dark:text-red-400' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {formatFullDate(t.fecha_fin)}
                                        </span>
                                        {new Date(t.fecha_fin) < new Date() && t.estado?.nombre !== 'Completada' && (
                                            <span className="text-[10px] text-red-600 dark:text-red-400 font-bold bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded w-fit mt-1 border border-red-100 dark:border-red-800 transition-colors duration-300">Vencida</span>
                                        )}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-all duration-200">
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                openTaskDetail(t);
                                            }}
                                            className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-all shadow-sm"
                                            title="Ver detalles"
                                        >
                                            <Eye size={16} />
                                        </button>
                                        {canEditTaskDetails(t) && (
                                            <button onClick={(e) => { e.stopPropagation(); setEditingTask(t); setIsModalOpen(true); }} className="opacity-100 p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all shadow-sm">
                                                <Edit2 size={14} />
                                            </button>
                                        )}
                                        {profile?.rol_nombre === 'Admin' && (
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleDeleteTask(t.id);
                                                }}
                                                className="p-2 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all shadow-sm"
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

    // --- VISTA GANTT / TIMELINE REAL ---
    const TimelineBoard = () => {
        const { handleMouseEnter, handleMouseLeave, TooltipComponent } = useTaskTooltip();
        const {
            showUserTooltip,
            showListTooltip,
            hideTooltip,
            TooltipComponent: AvatarTooltipComponent
        } = useAvatarTooltip();
        // 1. Configuración del rango de fechas (Ventana de visualización)
        // Por defecto mostramos 30 días desde la fecha mínima encontrada o hoy
        const timelineStart = useMemo(() => {
            if (filteredAndSortedTareas.length === 0) return new Date();
            const minDate = new Date(Math.min(...filteredAndSortedTareas.map(t => new Date(t.fecha_inicio).getTime())));
            // Restamos 2 días de margen
            minDate.setDate(minDate.getDate() - 2);
            return minDate;
        }, [filteredAndSortedTareas]);

        const timelineEnd = useMemo(() => {
            if (filteredAndSortedTareas.length === 0) return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
            const maxDate = new Date(Math.max(...filteredAndSortedTareas.map(t => new Date(t.fecha_fin).getTime())));
            // Sumamos 5 días de margen
            maxDate.setDate(maxDate.getDate() + 5);
            return maxDate;
        }, [filteredAndSortedTareas]);

        // Duración total en milisegundos para calcular porcentajes
        const totalDuration = timelineEnd.getTime() - timelineStart.getTime();

        // Generar array de días para el encabezado
        const days = useMemo(() => {
            const daysArray = [];
            const currentDate = new Date(timelineStart);
            while (currentDate <= timelineEnd) {
                daysArray.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return daysArray;
        }, [timelineStart, timelineEnd]);

        // Funciones de cálculo de posición
        const getLeftPosition = (startDateString: string) => {
            const start = new Date(startDateString).getTime();
            const offset = start - timelineStart.getTime();
            return Math.max(0, (offset / totalDuration) * 100);
        };

        const getWidth = (startDateString: string, endDateString: string) => {
            const start = new Date(startDateString).getTime();
            const end = new Date(endDateString).getTime();
            const duration = end - start;
            // Mínimo 1% para que siempre se vea algo
            return Math.max(1, (duration / totalDuration) * 100);
        };

        return (
            <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden relative transition-colors duration-300">

                <div className="flex flex-1 overflow-hidden relative">
                    {/* COLUMNA IZQUIERDA: Lista de Tareas (Sticky) */}
                    <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 flex flex-col overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.3)] transition-colors duration-300">
                        {/* Header Columna */}
                        <div className="h-12 border-b border-slate-100 dark:border-slate-700 flex items-center px-5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 transition-colors duration-300">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-300">Tareas</span>
                        </div>

                        {/* Lista Tareas */}
                        <div className="overflow-y-hidden flex-1 bg-white dark:bg-slate-800 transition-colors duration-300">
                            {filteredAndSortedTareas.map((tarea) => (
                                <div key={tarea.id} className="h-16 flex items-center px-5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-white dark:hover:from-slate-700/50 dark:hover:to-slate-700 transition-all duration-200 group cursor-pointer shadow-sm dark:shadow-none" onClick={() => openTaskDetail(tarea)}>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate transition-colors duration-300">{tarea.titulo}</div>
                                        <div className="flex items-center gap-2.5 mt-2">
                                            {tarea.asignado ? (
                                                <div className="flex items-center -space-x-2">
                                                    {/* 1. Responsable (z-30) */}
                                                    <div className="z-30 ring-3 ring-white dark:ring-slate-700 rounded-full transition-all duration-200 hover:scale-110 hover:z-40 shadow-sm"
                                                        onMouseEnter={(e) => tarea.asignado ? showUserTooltip(e, tarea.asignado.nombre_completo, 'Responsable') : null}
                                                        onMouseLeave={hideTooltip}
                                                    >
                                                        {tarea.asignado ? (
                                                            <UserAvatar url={tarea.asignado.avatar_url} name={tarea.asignado.nombre_completo} size="sm" showTooltip={false} />
                                                        ) : (
                                                            <div className="w-8 h-8 rounded-full border-2 border-dashed border-slate-200 dark:border-slate-600 flex items-center justify-center bg-slate-50 dark:bg-slate-700 text-slate-300 dark:text-slate-500"><UserIcon size={14} /></div>
                                                        )}
                                                    </div>

                                                    {/* 2. Colaboradores (z-20) */}
                                                    {tarea.colaboradores?.slice(0, 2).map((colab) => (
                                                        <div key={colab.usuario_id} className="z-20 ring-3 ring-white dark:ring-slate-700 rounded-full transition-all duration-200 hover:scale-110 hover:z-40 shadow-sm"
                                                            onMouseEnter={(e) => showUserTooltip(e, colab.usuario.nombre_completo, 'Colaborador')}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            <UserAvatar url={colab.usuario.avatar_url} name={colab.usuario.nombre_completo} size="sm" showTooltip={false} />
                                                        </div>
                                                    ))}

                                                    {/* 3. Badge +N (z-10) */}
                                                    {tarea.colaboradores && tarea.colaboradores.length > 2 && (
                                                        <div className="z-10 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-600 ring-3 ring-white dark:ring-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-300 cursor-help transition-all duration-200 hover:scale-110 hover:bg-slate-200 dark:hover:bg-slate-500 shadow-sm"
                                                            onMouseEnter={(e) => showListTooltip(e, tarea.colaboradores!.slice(2).map(c => c.usuario.nombre_completo))}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            +{tarea.colaboradores.length - 2}
                                                        </div>
                                                    )}
                                                </div>
                                            ) : <span className="text-[10px] text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-700 px-2 py-0.5 rounded-md transition-colors duration-300">Sin asignar</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* AREA DERECHA: El Gantt Chart */}
                    <div className="flex-1 overflow-auto custom-scrollbar bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 relative transition-colors duration-300">
                        <div className="min-w-[800px] relative">

                            {/* 1. EJE DE TIEMPO (Días) */}
                            <div className="h-12 border-b border-slate-200 dark:border-slate-700 flex bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 sticky top-0 z-10 shadow-sm transition-colors duration-300">
                                {days.map((day, i) => (
                                    <div key={i} className="flex-1 min-w-[40px] flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors duration-300">
                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase transition-colors duration-300">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                        <span className={`text-xs font-bold py-0.5 px-1.5 rounded-lg transition-all duration-300 ${day.toDateString() === new Date().toDateString() ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {day.getDate()}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* 2. GRID Y BARRAS */}
                            <div className="relative">
                                {/* Grid de fondo */}
                                <div className="absolute inset-0 flex pointer-events-none">
                                    {days.map((_, i) => (
                                        <div key={i} className={`flex-1 min-w-[40px] border-r ${i % 7 === 0 || i % 7 === 6 ? 'bg-slate-100/40 dark:bg-slate-800/40' : 'bg-slate-50/30 dark:bg-slate-900/30'} border-slate-100 dark:border-slate-700/50 last:border-0 h-full transition-colors duration-300`} />
                                    ))}
                                    <div
                                        className="absolute top-0 bottom-0 w-px bg-red-500 z-0 opacity-50 border-l border-dashed border-red-500 dark:opacity-40"
                                        style={{ left: `${getLeftPosition(new Date().toISOString())}%` }}
                                    />
                                </div>

                                {/* Filas de Tareas (Barras) */}
                                <div className="relative">
                                    {filteredAndSortedTareas.map((tarea) => {
                                        const left = getLeftPosition(tarea.fecha_inicio);
                                        const width = getWidth(tarea.fecha_inicio, tarea.fecha_fin);
                                        const isOverdue = new Date(tarea.fecha_fin) < new Date() && tarea.estado?.nombre !== 'Completada';

                                        const barColor = isOverdue
                                            ? 'bg-red-500 border-red-600'
                                            : tarea.estado?.nombre === 'Completada'
                                                ? 'bg-emerald-500 border-emerald-600'
                                                : tarea.prioridad?.color ? '' : 'bg-indigo-500 border-indigo-600';

                                        const dynamicStyle = tarea.prioridad?.color && !isOverdue && tarea.estado?.nombre !== 'Completada'
                                            ? { backgroundColor: tarea.prioridad.color, borderColor: tarea.prioridad.color }
                                            : {};

                                        return (
                                            <div key={tarea.id} className="h-14 border-b border-slate-50 dark:border-slate-700/50 flex items-center relative hover:bg-white/60 dark:hover:bg-slate-800/60 transition-colors duration-300">
                                                <div
                                                    className={`absolute h-9 rounded-lg shadow-md border border-opacity-20 cursor-pointer hover:shadow-lg hover:scale-y-105 transition-all group overflow-visible flex items-center px-3
                                                    ${!tarea.prioridad?.color && !isOverdue && tarea.estado?.nombre !== 'Completada' ? barColor : ''}
                                                    ${isOverdue ? 'bg-red-50 dark:bg-red-900/20' : ''}
                                                    ${tarea.estado?.nombre === 'Completada' ? 'bg-emerald-500 opacity-60 grayscale-[0.3] dark:opacity-50' : ''}
                                                `}
                                                    style={{
                                                        left: `${left}%`,
                                                        width: `${width}%`,
                                                        ...dynamicStyle
                                                    }}
                                                    onClick={() => openTaskDetail(tarea)}
                                                    // 2. CONECTAMOS LOS EVENTOS DEL MOUSE AQUÍ
                                                    onMouseEnter={(e) => handleMouseEnter(e, tarea)}
                                                    onMouseLeave={handleMouseLeave}
                                                >
                                                    <span className="text-[10px] font-bold text-white dark:text-slate-100 truncate drop-shadow-md sticky left-3 transition-colors duration-300">
                                                        {width > 5 ? tarea.titulo : ''}
                                                    </span>

                                                    {/* HE ELIMINADO EL DIV DEL TOOLTIP VIEJO DE AQUÍ */}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. FINALMENTE, RENDERIZAMOS EL COMPONENTE TOOLTIP AQUÍ */}
                <TooltipComponent />        {/* tooltip de tareas */}
                <AvatarTooltipComponent />
            </div>
        );
    };

    // --- RENDER PRINCIPAL ---
    return (
        <div className="flex flex-col h-full bg-slate-50 w-full relative overflow-hidden">
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
            <div className="flex flex-col h-full bg-slate-50 w-full relative overflow-hidden">

                {/* 1. HEADER SUPERIOR: Título y Vistas (Estilo Pestañas) */}
                <div className="sticky top-0 z-20 bg-white border-b border-slate-200">
                    <div className="flex flex-col gap-4 px-4 py-3 md:px-6 md:py-4">

                        {/* FILA SUPERIOR */}
                        <div className="flex items-center justify-between gap-4">

                            {/* TABS */}
                            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
                                {[
                                    { id: 'kanban', icon: Layout, label: 'Tablero' },
                                    { id: 'list', icon: List, label: 'Lista' },
                                    { id: 'timeline', icon: BarChart3, label: 'Cronograma' },
                                ].map((view) => (
                                    <button
                                        key={view.id}
                                        onClick={() => setViewMode(view.id as any)}
                                        className={`
            flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md border-b-2 whitespace-nowrap transition
            ${viewMode === view.id
                                                ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50'
                                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50'
                                            }
          `}
                                    >
                                        <view.icon size={16} className={view.id === 'timeline' ? 'rotate-90' : ''} />
                                        {view.label}
                                    </button>
                                ))}
                            </div>

                            {/* BOTÓN DESKTOP */}
                            {['Admin', 'Manager'].includes(profile?.rol_nombre || '') && (
                                <button
                                    onClick={() => {
                                        setEditingTask(null);
                                        setIsModalOpen(true);
                                    }}
                                    className="hidden sm:flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md text-sm font-semibold shadow-sm transition"
                                >
                                    <Plus size={16} />
                                    Nueva Tarea
                                </button>
                            )}
                        </div>


                    </div>

                    {/* 🔵 BOTÓN MOBILE (FAB) */}
                    {['Admin', 'Manager'].includes(profile?.rol_nombre || '') && (
                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setIsModalOpen(true);
                            }}
                            className="
        sm:hidden
        fixed bottom-6 right-6 z-30
        bg-indigo-600 hover:bg-indigo-700
        text-white p-4 rounded-full
        shadow-xl transition
      "
                            aria-label="Nueva tarea"
                        >
                            <Plus size={22} />
                        </button>
                    )}
                </div>

                {/* BARRA DE HERRAMIENTAS: Diseño Profesional Adaptativo */}
                <div className="bg-white border-b border-slate-200 overflow-visible">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 overflow-visible">

                        {/* FILA 1: Buscador y Acciones Principales */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">

                            {/* Buscador Expandido */}
                            <div className="relative flex-1 sm:max-w-xs lg:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar tareas..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 bg-white text-sm 
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
                             transition-all placeholder:text-slate-400 hover:border-slate-300"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            {/* Botones de Acción */}
                            <div className="flex items-center gap-2 sm:ml-auto">
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 
                             hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all
                             border border-slate-200 hover:border-slate-300"
                                    title="Ordenar"
                                >
                                    {sortOrder === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    <span className="hidden sm:inline">Ordenar</span>
                                </button>

                                <button
                                    onClick={async () => {
                                        setRefreshing(true);
                                        await fetchData();
                                        setRefreshing(false);
                                        addToast("Sincronizado", "success");
                                    }}
                                    disabled={refreshing}
                                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 
                             hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all
                             border border-slate-200 hover:border-slate-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Actualizar"
                                >
                                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                    <span className="hidden sm:inline">Actualizar</span>
                                </button>
                            </div>
                        </div>

                        {/* FILA 2: Filtros */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3 overflow-visible">

                            {/* Label de Filtros (Desktop) */}
                            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                <Filter size={14} />
                                <span>Filtros</span>
                            </div>

                            {/* Contenedor de Filtros con Scroll Horizontal en Mobile */}
                            <div className="flex items-center gap-2 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-1 scrollbar-hide">
                                <div className="flex-shrink-0 w-40 sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[180px]">
                                    <CustomSelector
                                        options={estados}
                                        value={filterEstado}
                                        onChange={(val) => setFilterEstado(val as string)}
                                        placeholder="Estado"
                                        icon={Filter}
                                        searchable={false}
                                        className="!py-2 !text-sm !rounded-lg !border-slate-200 hover:border-slate-300! transition-all!"
                                        label=""
                                    />
                                </div>

                                {/* Filtro Prioridad */}
                                <div className="shrink-0 w-40 sm:w-auto sm:min-w-[140px] sm:flex-1 sm:max-w-[180px]">
                                    <CustomSelector
                                        options={prioridades}
                                        value={filterPrioridad}
                                        onChange={(val) => setFilterPrioridad(val as string)}
                                        placeholder="Prioridad"
                                        icon={Star}
                                        searchable={false}
                                        className="!py-2 !text-sm !rounded-lg !border-slate-200 hover:!border-slate-300 !transition-all"
                                        label=""
                                    />
                                </div>

                                {/* Filtro Usuario */}
                                <div className="flex-shrink-0 w-48 sm:w-auto sm:min-w-[160px] sm:flex-1 sm:max-w-[220px]">
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
                                        className="!py-2 !text-sm !rounded-lg !border-slate-200 hover:!border-slate-300 !transition-all"
                                        label=""
                                    />
                                </div>

                                {/* Filtro Fecha */}
                                <div className="flex-shrink-0 w-44 sm:w-auto sm:min-w-[150px] sm:flex-1 sm:max-w-[200px]">
                                    <select
                                        className="w-full rounded-lg border-slate-200 text-sm py-2 pl-3 pr-9 
                                 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
                                 bg-white text-slate-700 hover:border-slate-300 transition-all
                                 appearance-none bg-[url('data:image/svg+xml;charset=utf-8,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20fill%3D%22none%22%20viewBox%3D%220%200%2020%2020%22%3E%3Cpath%20stroke%3D%22%236b7280%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%20stroke-width%3D%221.5%22%20d%3D%22m6%208%204%204%204-4%22%2F%3E%3C%2Fsvg%3E')] bg-[length:1.25rem] bg-[center_right_0.5rem] bg-no-repeat"
                                        value={filterFecha}
                                        onChange={(e) => setFilterFecha(e.target.value)}
                                    >
                                        <option value="all">Cualquier fecha</option>
                                        <option value="today">Hoy</option>
                                        <option value="week">Esta semana</option>
                                        <option value="overdue">Vencidas</option>
                                    </select>
                                </div>

                            </div>

                            {/* Botón Limpiar Filtros (si hay filtros activos) */}
                            {(filterEstado !== 'all' || filterPrioridad !== 'all' || filterUsuario !== 'all' || filterFecha !== 'all') && (
                                <button
                                    onClick={() => {
                                        setFilterEstado('all');
                                        setFilterPrioridad('all');
                                        setFilterUsuario('all');
                                        setFilterFecha('all');
                                    }}
                                    className="flex-shrink-0 px-3 py-2 text-xs font-medium text-slate-600 
                             hover:text-slate-900 hover:bg-slate-50 rounded-lg transition-all
                             border border-slate-200 hover:border-slate-300 whitespace-nowrap"
                                >
                                    Limpiar filtros
                                </button>
                            )}

                        </div>
                    </div>
                </div>

                {/* 3. AREA DE CONTENIDO PRINCIPAL */}
                <div className="flex-1 bg-slate-50 overflow-hidden relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 pt-4">
                            <svg
                                viewBox="0 0 40 4"
                                className="w-24 h-1 overflow-visible"
                                fill="currentColor"
                            >
                                <rect className="loader-line" width="40" height="4" rx="2" />
                            </svg>
                        </div>

                    ) : (
                        <div className="h-full overflow-y-auto p-4 md:p-6 custom-scrollbar">
                            {/* Aquí renderizas tus componentes existentes, se adaptarán al contenedor */}
                            {viewMode === 'kanban' && <KanbanBoard />}
                            {viewMode === 'list' && <ListBoard />}
                            {viewMode === 'timeline' && <TimelineBoard />}
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de Creación/Edición de Tarea */}
            {/* Modal de Creación/Edición de Tarea */}
            {isModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
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
                                onClick={handleCancelAndCleanup}
                                className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTask} className="p-8 space-y-8">
                            {/* Título y descripción */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Título de la Tarea</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-2 border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all px-5 py-4 text-lg font-medium placeholder-slate-400 ${!canEditTaskDetails(editingTask) ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
                                        value={newTask.titulo}
                                        onChange={e => setNewTask({ ...newTask, titulo: e.target.value })}
                                        placeholder="Ej: Revisar reporte mensual de ventas"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Descripción</label>
                                    <textarea
                                        rows={4}
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-2 border-slate-100 focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all px-5 py-4 text-base placeholder-slate-400 ${!canEditTaskDetails(editingTask) ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : 'bg-slate-50'}`}
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
                                    // CORRECCIÓN TS: Añadido tipo explícito (value: string | string[])
                                    onChange={(value: string | string[]) => setNewTask({ ...newTask, prioridad_id: value as string })}
                                    placeholder="Seleccionar..."
                                    label="Prioridad"
                                    icon={Star}
                                    searchable={false}
                                    disabled={!canEditTaskDetails(editingTask)}
                                    getDisplayValue={(p: any) => p.nombre}
                                    getSearchValue={(p: any) => p.nombre}
                                />

                                {/* --- Selector de Responsable --- */}

                                <CustomSelector
                                    options={usuariosParaAsignar}
                                    value={newTask.asignado_a}
                                    // CORRECCIÓN TS: Añadido tipo explícito
                                    onChange={(value: string | string[]) => {
                                        const selectedUser = usuariosParaAsignar.find(u => u.id === value);
                                        setNewTask(prev => ({
                                            ...prev,
                                            asignado_a: value as string,
                                            departamento_id: selectedUser?.departamento_id || ''
                                        }));
                                    }}
                                    placeholder="Seleccionar responsable..."
                                    label="Responsable"
                                    icon={UserIcon}
                                    searchable={true}
                                    disabled={!canEditTaskDetails(editingTask)}
                                    getDisplayValue={(u: any) => u.nombre_completo}
                                    getSearchValue={(u: any) => u.nombre_completo}
                                    getAvatar={(u: any) => u.avatar_url}
                                />

                                {/* --- Selector de Departamento (Solo Lectura) --- */}
                                <CustomSelector
                                    options={departamentos}
                                    value={newTask.departamento_id}
                                    onChange={() => { }}
                                    placeholder="Sin departamento"
                                    label="Departamento"
                                    icon={Users}
                                    searchable={false}
                                    disabled={true}
                                    getDisplayValue={(d: any) => d.nombre}
                                    getSearchValue={(d: any) => d.nombre}
                                />

                                {/* --- Selector de Colaboradores (Nuevo) --- */}
                                <div className="md:col-span-2 lg:col-span-3">
                                    <CustomSelector
                                        options={usuariosParaAsignar.filter(u =>
                                            (!newTask.departamento_id || u.departamento_id === newTask.departamento_id) &&
                                            u.id !== newTask.asignado_a
                                        )}
                                        value={newTask.colaboradores}
                                        // CORRECCIÓN TS: Añadido tipo explícito
                                        onChange={(val: string | string[]) => setNewTask({ ...newTask, colaboradores: val as string[] })}
                                        placeholder="Añadir colaboradores extra..."
                                        label="Colaboradores (Mismo Departamento)"
                                        icon={Users}
                                        multiple={true}
                                        searchable={true}
                                        disabled={!canEditTaskDetails(editingTask)}
                                    />
                                </div>
                            </div>

                            {/* Fechas */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 p-6 rounded-2xl border border-slate-100">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Inicio</label>
                                    <input
                                        type="date"
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all px-4 py-3 ${!canEditTaskDetails(editingTask) ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                        value={newTask.fecha_inicio}
                                        onChange={(e) => setNewTask({ ...newTask, fecha_inicio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-2 uppercase tracking-wide">Vencimiento</label>
                                    <input
                                        type="date"
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all px-4 py-3 ${!canEditTaskDetails(editingTask) ? 'bg-slate-200 text-slate-500 cursor-not-allowed' : 'bg-white'}`}
                                        value={newTask.fecha_fin}
                                        onChange={(e) => setNewTask({ ...newTask, fecha_fin: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Zona de adjuntos - SOLO visible si tiene permisos de edición */}
                            {canEditTaskDetails(editingTask) && (
                                <div className="mt-4">
                                    <FilePondComponent
                                        files={files}
                                        onupdatefiles={setFiles}
                                        allowMultiple={true}
                                        maxFiles={5}
                                        name="files"
                                        credits={false}
                                        labelIdle={`<div class="flex flex-col items-center gap-3 text-slate-400 group-hover:text-indigo-600 transition-colors cursor-pointer"><div class="p-4 bg-slate-100 rounded-full group-hover:bg-indigo-100 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div><div><span class="text-base font-bold block text-slate-600">Subir archivos adjuntos</span><span class="text-sm text-slate-400 block mt-1">Soporta: PDF, DOC, XLS, JPG, PNG (máx. 10MB)</span></div></div>`}
                                        server={{
                                            process: async (fieldName: string, file: File, metadata: any, load: any, error: any, progress: any, abort: any) => {
                                                const fileExt = file.name.split('.').pop();
                                                const fileName = `${Math.random()}.${fileExt}`;
                                                const filePath = `tareas_adjuntos/${fileName}`;
                                                const { data, error: uploadError } = await supabase.storage.from('adjuntos').upload(filePath, file);
                                                if (uploadError) { error('Error al subir'); return; }
                                                setTempAttachments(prev => [...prev, { path: data.path, name: file.name, size: file.size, type: file.type }]);
                                                load(data.path);
                                            },
                                            revert: async (uniqueFileId: string, load: any, error: any) => {
                                                const { error: deleteError } = await supabase.storage.from('adjuntos').remove([uniqueFileId]);
                                                if (deleteError) { error('Error al eliminar'); return; }
                                                setTempAttachments(prev => prev.filter(f => f.path !== uniqueFileId));
                                                load();
                                            }
                                        }}
                                    />
                                </div>
                            )}

                            {/* Botones de acción */}
                            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 sticky bottom-0 bg-white pb-4">
                                <button
                                    type="button"
                                    onClick={handleCancelAndCleanup}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
                                >
                                    {canEditTaskDetails(editingTask) ? 'Cancelar' : 'Cerrar'}
                                </button>

                                {canEditTaskDetails(editingTask) && (
                                    <button
                                        type="submit"
                                        className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/30 transition-all hover:scale-105 active:scale-95"
                                    >
                                        <Save size={18} />
                                        {editingTask ? 'Guardar Cambios' : 'Crear Tarea'}
                                    </button>
                                )}
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
                                        </div>
                                        <div className="flex flex-col h-full max-h-150">
                                            <div className="flex-1 pr-2 space-y-4 pb-4">
                                                {selectedTaskForDetail.comentarios && selectedTaskForDetail.comentarios.length > 0 ? (
                                                    selectedTaskForDetail.comentarios.map(comentario => (
                                                        <div key={comentario.id} className="flex gap-4 animate-fade-in-up">
                                                            <div className="shrink-0">
                                                                <UserAvatar
                                                                    url={comentario.usuario?.avatar_url}
                                                                    name={comentario.usuario?.nombre_completo || 'Usuario'}
                                                                    size="md"
                                                                    showTooltip={false}
                                                                />
                                                            </div>
                                                            <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-none p-4 shadow-sm flex-1 group hover:border-indigo-200 transition-colors">
                                                                {/* Cabecera del Comentario */}
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-800 text-sm">
                                                                            {comentario.usuario?.nombre_completo}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400 font-medium">
                                                                            {new Date(comentario.created_at).toLocaleString('es-ES', {
                                                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </div>

                                                                    {/* --- BOTONES DE ACCIÓN (Editar/Eliminar) --- */}
                                                                    {/* Solo se muestran si cumple la regla de tiempo y autoría */}
                                                                    {canManageComment(comentario) && (
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingCommentId(comentario.id);
                                                                                    setEditingCommentText(comentario.contenido);
                                                                                }}
                                                                                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                                title="Editar comentario"
                                                                                disabled={editingCommentId === comentario.id}
                                                                            >
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteComment(comentario.id)}
                                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                                                                                title="Eliminar comentario"
                                                                                disabled={editingCommentId === comentario.id}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* --- CONTENIDO DEL COMENTARIO (Lectura vs Edición) --- */}
                                                                {editingCommentId === comentario.id ? (
                                                                    <div className="mt-2 animate-fade-in">
                                                                        <textarea
                                                                            className="w-full rounded-lg border-indigo-300 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm p-2 min-h-[80px]"
                                                                            value={editingCommentText}
                                                                            onChange={(e) => setEditingCommentText(e.target.value)}
                                                                            autoFocus
                                                                        />
                                                                        <div className="flex justify-end gap-2 mt-2">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingCommentId(null);
                                                                                    setEditingCommentText('');
                                                                                }}
                                                                                className="px-3 py-1.5 text-xs font-medium text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                                                                            >
                                                                                Cancelar
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleUpdateComment(comentario.id)}
                                                                                className="px-3 py-1.5 text-xs font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm transition-colors"
                                                                            >
                                                                                Guardar cambios
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : (
                                                                    <p className="text-slate-600 text-sm whitespace-pre-wrap leading-relaxed">
                                                                        {comentario.contenido}
                                                                    </p>
                                                                )}

                                                                {/* --- ADJUNTOS DEL COMENTARIO --- */}
                                                                {(selectedTaskForDetail.adjuntos || []).filter(adj => adj.comentario_id === comentario.id).length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap gap-2">
                                                                        {(selectedTaskForDetail.adjuntos || [])
                                                                            .filter(adj => adj.comentario_id === comentario.id)
                                                                            .map(adj => {
                                                                                const { data } = supabase.storage.from('adjuntos').getPublicUrl(adj.url_archivo);
                                                                                return (
                                                                                    <a
                                                                                        key={adj.id}
                                                                                        href={data.publicUrl}
                                                                                        target="_blank"
                                                                                        rel="noopener noreferrer"
                                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs transition-all group/file"
                                                                                        title={adj.nombre_archivo}
                                                                                    >
                                                                                        <FileText size={12} className="text-indigo-500" />
                                                                                        <span className="text-slate-600 font-medium truncate max-w-[120px]">
                                                                                            {adj.nombre_archivo}
                                                                                        </span>
                                                                                        <Eye size={10} className="text-slate-400 opacity-0 group-hover/file:opacity-100 transition-opacity" />
                                                                                    </a>
                                                                                );
                                                                            })
                                                                        }
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ))
                                                ) : (
                                                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                                                        <MessageSquare size={40} className="mx-auto mb-3 text-slate-300" />
                                                        <p className="text-slate-500 font-medium">No hay comentarios aún</p>
                                                        <p className="text-slate-400 text-sm">Sé el primero en comentar sobre esta tarea</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* --- FORMULARIO DE NUEVO COMENTARIO (FIJO EN LA PARTE INFERIOR) --- */}
                                            <div className="border-t border-slate-200 bg-white pt-4 mt-4">
                                                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200">
                                                    <label className="text-xs font-bold text-slate-400 uppercase mb-2 block justify-between">
                                                        <span>Escribe un comentario</span>
                                                        {tempCommentAttachments.length > 0 && (
                                                            <span className="text-indigo-600">{tempCommentAttachments.length} archivos adjuntos</span>
                                                        )}
                                                    </label>

                                                    <textarea
                                                        className="w-full rounded-xl border-slate-200 bg-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent p-3 text-sm min-h-[80px] resize-none"
                                                        placeholder="Escribe tu respuesta o actualización aquí..."
                                                        value={newCommentText}
                                                        onChange={(e) => setNewCommentText(e.target.value)}
                                                    ></textarea>

                                                    {/* FilePond Compacto */}
                                                    <div className="mt-3">
                                                        <FilePondComponent
                                                            files={commentFiles}
                                                            onupdatefiles={setCommentFiles}
                                                            allowMultiple={true}
                                                            maxFiles={3}
                                                            name="files"
                                                            credits={false}
                                                            labelIdle='<span class="text-xs text-slate-400 cursor-pointer hover:text-indigo-600 transition-colors flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Adjuntar archivos</span>'
                                                            server={{
                                                                process: async (fieldName: string, file: File, metadata: any, load: any, error: any, progress: any, abort: any) => {
                                                                    const fileExt = file.name.split('.').pop();
                                                                    const fileName = `${Math.random()}.${fileExt}`;
                                                                    const filePath = `comentarios_adjuntos/${fileName}`;

                                                                    const { data, error: uploadError } = await supabase.storage
                                                                        .from('adjuntos')
                                                                        .upload(filePath, file);

                                                                    if (uploadError) { error('Error'); return; }

                                                                    setTempCommentAttachments(prev => [...prev, {
                                                                        path: data.path,
                                                                        name: file.name,
                                                                        size: file.size,
                                                                        type: file.type
                                                                    }]);
                                                                    load(data.path);
                                                                },
                                                                revert: async (uniqueFileId: string, load: any, error: any) => {
                                                                    const { error: deleteError } = await supabase.storage
                                                                        .from('adjuntos')
                                                                        .remove([uniqueFileId]);

                                                                    if (deleteError) { error('Error'); return; }

                                                                    setTempCommentAttachments(prev => prev.filter(f => f.path !== uniqueFileId));
                                                                    load();
                                                                }
                                                            }}
                                                            className="filepond-compact"
                                                        />
                                                    </div>

                                                    <div className="flex justify-end mt-2">
                                                        <button
                                                            onClick={handlePostComment}
                                                            disabled={isSubmittingComment || (!newCommentText.trim() && tempCommentAttachments.length === 0)}
                                                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {isSubmittingComment ? <RefreshCw size={16} className="animate-spin" /> : <MessageSquare size={16} />}
                                                            Publicar Comentario
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
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
                                            disabled={!canChangeStatus(selectedTaskForDetail)}
                                        >
                                            {getAllowedStatuses(selectedTaskForDetail.estado_id).map(estado => (
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
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Asignado por</h4>
                                        {selectedTaskForDetail.creador &&
                                            selectedTaskForDetail.creador_id !== selectedTaskForDetail.asignado_a && (
                                                <div className="flex items-center gap-4">
                                                    <UserAvatar
                                                        url={selectedTaskForDetail.creador.avatar_url}
                                                        name={selectedTaskForDetail.creador.nombre_completo}
                                                        size="lg"
                                                    />
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-slate-900 truncate">
                                                            {selectedTaskForDetail.creador.nombre_completo}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                    {/* Sección de Colaboradores: Solo se muestra si existen */}
                                    {selectedTaskForDetail.colaboradores && selectedTaskForDetail.colaboradores.length > 0 && (
                                        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">
                                                Colaboradores
                                            </h4>

                                            <div className="flex flex-col gap-4">
                                                {selectedTaskForDetail.colaboradores.map((colab) => (
                                                    <div key={colab.usuario_id} className="flex items-center gap-3 group">
                                                        <UserAvatar
                                                            url={colab.usuario.avatar_url}
                                                            name={colab.usuario.nombre_completo}
                                                            size="md"
                                                        />
                                                        <div className="overflow-hidden">
                                                            <div className="font-bold text-slate-700 text-sm truncate group-hover:text-indigo-600 transition-colors">
                                                                {colab.usuario.nombre_completo}
                                                            </div>
                                                            <div className="text-xs text-slate-400">
                                                                Colaborador
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Cronograma</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                                                <span className="text-slate-500 text-sm font-medium">Inicio</span>
                                                <span className="text-slate-900 font-bold">
                                                    {formatFullDate(selectedTaskForDetail.fecha_inicio)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-50 rounded-xl relative overflow-hidden">
                                                {new Date(selectedTaskForDetail.fecha_fin) < new Date() && selectedTaskForDetail.estado?.nombre !== 'Completada' && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                                )}
                                                <span className="text-slate-500 text-sm font-medium">Vencimiento</span>
                                                <span className={`font-bold ${new Date(selectedTaskForDetail.fecha_fin) < new Date() && selectedTaskForDetail.estado?.nombre !== 'Completada' ? 'text-red-600' : 'text-slate-900'}`}>
                                                    {formatFullDate(selectedTaskForDetail.fecha_fin)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-4">Archivos Adjuntos</h4>

                                        {/* Verificamos si hay archivos en la columna JSON */}
                                        {selectedTaskForDetail.adjuntos && selectedTaskForDetail.adjuntos.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedTaskForDetail.adjuntos.map((adjunto) => {
                                                    // Usamos url_archivo que viene de la tabla
                                                    const { data } = supabase.storage.from('adjuntos').getPublicUrl(adjunto.url_archivo);

                                                    return (
                                                        <a
                                                            key={adjunto.id} // Usamos el ID real de la tabla
                                                            href={data.publicUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 p-3 bg-slate-50..."
                                                        >
                                                            <div className="bg-white p-2 rounded-lg shadow-sm">
                                                                <FileText size={18} className="text-indigo-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                {/* Nombre real del archivo */}
                                                                <p className="text-sm font-medium text-slate-700 truncate">{adjunto.nombre_archivo}</p>
                                                                {/* Tamaño formateado */}
                                                                <p className="text-xs text-slate-400">
                                                                    {(adjunto.tamano_bytes ? (adjunto.tamano_bytes / 1024).toFixed(1) + ' KB' : '')}
                                                                </p>
                                                            </div>
                                                            <Eye size={14} className="text-slate-400..." />
                                                        </a>
                                                    );
                                                })}
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
            )
            }
        </div >
    );
}