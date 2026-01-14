import { useState, useEffect, useMemo, useRef } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import 'filepond-plugin-image-preview/dist/filepond-plugin-image-preview.css';
import FilePondPluginImagePreview from 'filepond-plugin-image-preview';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

registerPlugin(FilePondPluginImagePreview, FilePondPluginFileValidateType);
import { createPortal } from 'react-dom';
import { supabase } from '../supabaseClient';
import { useAuth } from '../context/AuthContext';
import {
    Plus, Search, Paperclip, MessageSquare, MoreHorizontal,
    Layout, List, BarChart3, Filter, ChevronDown, ChevronUp,
    User as UserIcon, X, FileText, Edit2, Trash2, Eye,
    CheckCircle, AlertCircle, XCircle, Users,
    Bell, Target,
    RefreshCw, Save, Clock, Calendar,
    Info
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
    colaboradores?: { usuario_id: string, usuario: { nombre_completo: string, avatar_url: string | null } }[];
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
const Toast = ({ message, type, onClose }: { message: string, type: 'success' | 'error' | 'warning' | 'info', onClose: () => void }) => {
    useEffect(() => {
        const timer = setTimeout(onClose, 5000);
        return () => clearTimeout(timer);
    }, [onClose]);

    const toastConfig = {
        success: { icon: CheckCircle, color: 'text-green-500', style: 'border-green-100 dark:border-green-900/30 bg-white dark:bg-slate-800' },
        error: { icon: XCircle, color: 'text-red-500', style: 'border-red-100 dark:border-red-900/30 bg-white dark:bg-slate-800' },
        warning: { icon: AlertCircle, color: 'text-amber-500', style: 'border-amber-100 dark:border-amber-900/30 bg-white dark:bg-slate-800' },
        info: { icon: Bell, color: 'text-blue-500', style: 'border-blue-100 dark:border-blue-900/30 bg-white dark:bg-slate-800' },
    }[type];

    const Icon = toastConfig.icon;

    return (
        <div className={`flex items-center gap-3 p-4 rounded-xl border bg-white/95 dark:bg-slate-800 backdrop-blur-sm shadow-lg ${toastConfig.style} animate-slide-in-right max-w-sm w-full`}>
            <Icon className={toastConfig.color} size={20} />
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300 flex-1">{message}</span>
            <button
                onClick={onClose}
                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
};

const parseDateString = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return dateStr.substring(0, 10);
};

const getLocalISOString = (daysToAdd = 0) => {
    const date = new Date();
    if (daysToAdd !== 0) {
        date.setDate(date.getDate() + daysToAdd);
    }
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const formatShortDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-EC', {
        timeZone: 'UTC',
        day: 'numeric',
        month: 'short'
    });
};

const formatFullDate = (dateStr?: string | null) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('es-EC', {
        timeZone: 'UTC',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
};

const PriorityBadge = ({ nombre, color, level }: { nombre: string, color: string, level?: number }) => {
    const getIntensity = () => {
        switch (nombre.toLowerCase()) {
            case 'urgente': return 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 ring-1 ring-red-600/20 dark:ring-red-500/30';
            case 'alta': return 'bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 ring-1 ring-orange-600/20 dark:ring-orange-500/30';
            case 'media': return 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-700 dark:text-yellow-400 ring-1 ring-yellow-600/20 dark:ring-yellow-500/30';
            case 'baja': return 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 ring-1 ring-emerald-600/20 dark:ring-emerald-500/30';
            default: return 'bg-slate-50 dark:bg-slate-700 text-slate-700 dark:text-slate-300 ring-1 ring-slate-600/20 dark:ring-slate-600/40';
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
        <div className={`relative group`}>
            {url ? (
                <img
                    src={url}
                    alt={name}
                    className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-white dark:ring-slate-800 shadow-sm transition-all duration-200 group-hover:ring-indigo-400 group-hover:scale-105`}
                />
            ) : (
                <div className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white font-bold ring-2 ring-white dark:ring-slate-800 shadow-sm transition-all duration-200 group-hover:ring-indigo-400 group-hover:scale-105`}>
                    {initials}
                </div>
            )}
            {showTooltip && (
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-slate-800 dark:bg-slate-700 text-white text-xs rounded-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 shadow-lg pointer-events-none">
                    {name}
                    <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-800 dark:border-t-slate-700"></div>
                </div>
            )}
        </div>
    );
};

const CustomSelector = ({
    options,
    value,
    onChange,
    placeholder,
    label,
    icon: Icon,
    searchable = true,
    multiple = false,
    disabled = false,
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
    disabled?: boolean;
    className?: string;
    getDisplayValue?: (option: any) => string;
    getSearchValue?: (option: any) => string;
    getAvatar?: (option: any) => string | null;
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const buttonRef = useRef<HTMLButtonElement>(null);
    const [coords, setCoords] = useState({ left: 0, top: 0, width: 0, maxHeight: 300 });

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
        <div className={`relative ${className} ${disabled ? 'opacity-60 pointer-events-none' : ''}`}>
            {label && (
                <label className="block text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                    {label}
                </label>
            )}

            <button
                ref={buttonRef}
                type="button"
                disabled={disabled}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`w-full flex items-center justify-between px-4 py-2.5 rounded-xl border bg-white dark:bg-slate-800 text-left transition-all duration-200 
                    ${isOpen ? 'border-indigo-500 ring-2 ring-indigo-500/10 shadow-lg dark:ring-indigo-500/20' : 'border-slate-200 dark:border-slate-700'}
                    ${!disabled && 'hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700/50'}
                `}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    {Icon && (
                        <div className={`flex shrink-0 items-center justify-center h-8 w-8 rounded-lg ${selectedOptions.length > 0 ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500'}`}>
                            <Icon size={16} />
                        </div>
                    )}
                    <span className={`text-sm truncate ${selectedOptions.length > 0 ? 'text-slate-700 dark:text-slate-200 font-medium' : 'text-slate-400 dark:text-slate-500'}`}>
                        {getDisplayText()}
                    </span>
                </div>
                {!disabled && (isOpen ? <ChevronUp size={16} className="text-indigo-500 shrink-0 ml-2" /> : <ChevronDown size={16} className="text-slate-400 dark:text-slate-500 shrink-0 ml-2" />)}
            </button>

            {isOpen && !disabled && createPortal(
                <div
                    id={`dropdown-${label || placeholder}`}
                    className="absolute bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-100 dark:border-slate-700 overflow-hidden animation-fade-in-down z-9999 flex flex-col"
                    style={{
                        left: coords.left,
                        top: coords.top,
                        width: coords.width,
                        minWidth: '220px',
                        maxHeight: coords.maxHeight
                    }}
                >
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 shrink-0">
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 dark:text-slate-500" />
                                <input
                                    type="text"
                                    autoFocus
                                    className="w-full pl-9 pr-3 py-1.5 text-sm rounded-lg border-none bg-white dark:bg-slate-700 focus:ring-2 focus:ring-indigo-500 placeholder-slate-400 dark:placeholder-slate-500 text-slate-800 dark:text-slate-200"
                                    placeholder="Buscar..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    <div className="overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-600 scrollbar-track-transparent flex-1">
                        {filteredOptions.length === 0 ? (
                            <div className="p-4 text-center text-slate-400 dark:text-slate-500 text-sm">No se encontraron opciones</div>
                        ) : (
                            filteredOptions.map((option) => {
                                const isSelected = selectedValues.includes(option.id);
                                return (
                                    <div
                                        key={option.id}
                                        onClick={() => handleSelect(option.id)}
                                        className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${isSelected ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300' : 'hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300'}`}
                                    >
                                        {getAvatar(option) ? (
                                            <div className="shrink-0">
                                                <UserAvatar url={getAvatar(option)} name={getDisplayValue(option)} size="sm" showTooltip={false} />
                                            </div>
                                        ) : (
                                            <div className={`h-6 w-6 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold text-white ${isSelected ? 'bg-indigo-500' : 'bg-slate-300 dark:bg-slate-600'}`}>
                                                {getDisplayValue(option).substring(0, 2).toUpperCase()}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm truncate">{getDisplayValue(option)}</div>
                                            {option.email && <div className="text-xs text-slate-400 dark:text-slate-500 truncate">{option.email}</div>}
                                        </div>
                                        {isSelected && <CheckCircle size={16} className="text-indigo-600 dark:text-indigo-400 shrink-0" />}
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

const useTaskTooltip = () => {
    const [tooltipData, setTooltipData] = useState<{ x: number; y: number; days: number; title: string } | null>(null);

    const handleMouseEnter = (e: React.MouseEvent, tarea: Tarea) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const daysLeft = Math.ceil((new Date(tarea.fecha_fin).getTime() - Date.now()) / (1000 * 60 * 60 * 24));

        setTooltipData({
            x: rect.left + (rect.width / 2),
            y: rect.top,
            days: daysLeft,
            title: tarea.titulo
        });
    };

    const handleMouseLeave = () => setTooltipData(null);

    const TooltipComponent = () => (
        tooltipData ? createPortal(
            <div className="fixed z-9999 pointer-events-none flex flex-col items-center animate-fade-in"
                style={{ left: tooltipData.x, top: tooltipData.y - 10, transform: 'translate(-50%, -100%)' }}>
                <div className="bg-slate-800 dark:bg-slate-900 text-white text-xs rounded px-2 py-1 whitespace-nowrap shadow-xl flex flex-col items-center border border-slate-700">
                    <span className="font-bold mb-0.5">{tooltipData.title}</span>
                    <span className={`${tooltipData.days < 0 ? 'text-red-300' : 'text-emerald-300'}`}>
                        {tooltipData.days < 0 ? `Venció hace ${Math.abs(tooltipData.days)} días` : `Vence en: ${tooltipData.days} días`}
                    </span>
                </div>
                <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800 dark:border-t-slate-900"></div>
            </div>, document.body
        ) : null
    );

    return { handleMouseEnter, handleMouseLeave, TooltipComponent };
};


export default function TareasAvanzadas() {
    const { profile } = useAuth();
    const [viewMode, setViewMode] = useState<'kanban' | 'list' | 'timeline'>('kanban');
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [toasts, setToasts] = useState<Array<{ id: string, message: string, type: 'success' | 'error' | 'warning' | 'info' }>>([]);

    const [tareas, setTareas] = useState<Tarea[]>([]);
    const [estados, setEstados] = useState<Catalogo[]>([]);
    const [prioridades, setPrioridades] = useState<Catalogo[]>([]);
    const [usuariosParaAsignar, setUsuariosParaAsignar] = useState<UsuarioSelect[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);
    const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);
    const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
    const [editingCommentText, setEditingCommentText] = useState('');

    const [searchTerm, setSearchTerm] = useState('');
    const [filterEstado, setFilterEstado] = useState('all');
    const [filterPrioridad, setFilterPrioridad] = useState('all');
    const [filterUsuario, setFilterUsuario] = useState('all');
    const [filterDepartamento] = useState('all');
    const [filterFecha, setFilterFecha] = useState('all');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [sortBy, setSortBy] = useState('created_at');
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTask, setEditingTask] = useState<Tarea | null>(null);
    const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
    const [selectedTaskForDetail, setSelectedTaskForDetail] = useState<Tarea | null>(null);
    const [tempAttachments, setTempAttachments] = useState<TempAttachment[]>([]);
    const [files, setFiles] = useState<any[]>([]);
    const FilePondComponent = FilePond as any;
    const MySwal = withReactContent(Swal);

    const [newCommentText, setNewCommentText] = useState('');
    const [commentFiles, setCommentFiles] = useState<any[]>([]);
    const [tempCommentAttachments, setTempCommentAttachments] = useState<TempAttachment[]>([]);
    const [isSubmittingComment, setIsSubmittingComment] = useState(false);
    const [motivoModal, setMotivoModal] = useState<{
        isOpen: boolean;
        taskId: string;
        nuevoEstadoId: string;
        nombreEstado: string;
        tipo: 'rechazo' | 'bloqueo';
    }>({
        isOpen: false,
        taskId: '',
        nuevoEstadoId: '',
        nombreEstado: '',
        tipo: 'rechazo'
    });
    const [motivoTexto, setMotivoTexto] = useState('');

    const [newTask, setNewTask] = useState({
        titulo: '',
        descripcion: '',
        prioridad_id: '',
        asignado_a: '',
        colaboradores: [] as string[],
        fecha_inicio: getLocalISOString(0),
        fecha_fin: getLocalISOString(2),
        departamento_id: '',
    });

    useEffect(() => {
        if (editingTask) {
            const assignedUser = usuariosParaAsignar.find(u => u.id === editingTask.asignado_a);
            const derivedDeptId = assignedUser?.departamento_id || editingTask.departamento_id || '';

            setNewTask({
                titulo: editingTask.titulo,
                descripcion: editingTask.descripcion || '',
                prioridad_id: editingTask.prioridad_id || '',
                asignado_a: editingTask.asignado_a || '',
                fecha_inicio: parseDateString(editingTask.fecha_inicio),
                fecha_fin: parseDateString(editingTask.fecha_fin),
                colaboradores: editingTask.colaboradores?.map(c => c.usuario_id) || [],
                departamento_id: derivedDeptId
            });
        } else {
            // Para usuarios normales, la tarea se asigna a sí mismos por defecto
            const defaultAsignado = profile?.rol_nombre === 'Usuario' ? profile.id : '';

            setNewTask({
                titulo: '',
                descripcion: '',
                prioridad_id: '',
                asignado_a: defaultAsignado,
                fecha_inicio: getLocalISOString(0),
                fecha_fin: getLocalISOString(2),
                departamento_id: profile?.departamento_id || '',
                colaboradores: [],
            });
        }
    }, [editingTask, profile, usuariosParaAsignar]);

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

    useEffect(() => {
        if (profile) fetchData();
    }, [profile]);

    const fetchData = async () => {
        setLoading(true);
        try {
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

            // 1. Agregamos "profile &&" al inicio para asegurar que el usuario existe
            if (profile && ['Admin', 'Manager', 'Usuario'].includes(profile.rol_nombre || '')) {
                let userQuery = supabase
                    .from('usuarios')
                    .select('id, nombre_completo, avatar_url, email, departamento_id, roles(nombre)')
                    .eq('activo', true);

                // 2. Aquí TypeScript ya sabe que 'profile' no es null gracias al if anterior
                if (['Manager', 'Usuario'].includes(profile.rol_nombre || '') && profile.departamento_id) {
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

            let finalTareas = tareasWithCounts;

            if (profile?.rol_nombre === 'Usuario') {
                finalTareas = tareasWithCounts.filter(t =>
                    t.asignado_a === profile.id ||
                    t.creador_id === profile.id ||
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
            let asignadoFinal = newTask.asignado_a || null;
            let departamentoFinal = newTask.departamento_id || profile?.departamento_id || null;

            // Para usuarios normales, la tarea siempre se asigna a sí mismos
            if (profile?.rol_nombre === 'Usuario') {
                asignadoFinal = profile.id;
            }

            const taskData = {
                titulo: newTask.titulo,
                descripcion: newTask.descripcion,
                prioridad_id: newTask.prioridad_id,
                asignado_a: asignadoFinal,
                fecha_inicio: newTask.fecha_inicio,
                fecha_fin: newTask.fecha_fin,
                departamento_id: departamentoFinal,
                creador_id: editingTask ? editingTask.creador_id : profile?.id,
            };

            let tareaId = editingTask?.id;

            if (editingTask) {
                const { error } = await supabase.from('tareas')
                    .update({ ...taskData, updated_at: new Date().toISOString() })
                    .eq('id', editingTask.id);
                if (error) throw error;
            } else {
                const defaultState = estados.find(e => e.nombre === 'Nueva')?.id || estados[0]?.id;
                const { data: newTarea, error } = await supabase.from('tareas')
                    .insert({ ...taskData, estado_id: defaultState })
                    .select()
                    .single();

                if (error) throw error;
                tareaId = newTarea.id;
            }

            if (tareaId) {
                await supabase.from('tarea_colaboradores').delete().eq('tarea_id', tareaId);
                if (newTask.colaboradores.length > 0) {
                    const colaboradoresData = newTask.colaboradores.map(uid => ({
                        tarea_id: tareaId,
                        usuario_id: uid
                    }));
                    await supabase.from('tarea_colaboradores').insert(colaboradoresData);
                }
            }

            if (tempAttachments.length > 0 && tareaId) {
                const attachmentsToInsert = tempAttachments.map(file => ({
                    tarea_id: tareaId,
                    subido_por: profile?.id,
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

            addToast("Guardado exitosamente", "success");
            setIsModalOpen(false);
            setEditingTask(null);
            setTempAttachments([]);
            setFiles([]);
            await fetchTareas();

        } catch (error) {
            console.error("Error:", error);
            addToast("Error al guardar", "error");
        }
    };

    const handleUpdateTaskStatus = async (taskId: string, newStatusId: string, motivo?: string) => {
        try {
            const task = tareas.find(t => t.id === taskId);
            const newStatusObj = estados.find(e => e.id === newStatusId);
            if (!task || !newStatusObj) return;

            // Si es rechazo o bloqueo, verificar que se proporcionó motivo
            if ((newStatusObj.nombre === 'Rechazada' || newStatusObj.nombre === 'Bloqueada') && !motivo) {
                setMotivoModal({
                    isOpen: true,
                    taskId,
                    nuevoEstadoId: newStatusId,
                    nombreEstado: newStatusObj.nombre,
                    tipo: newStatusObj.nombre === 'Rechazada' ? 'rechazo' : 'bloqueo'
                });
                return;
            }

            // Prepare update data
            // IMPORTANTE: Por defecto LIMPIAMOS los motivos anteriores al cambiar de estado
            const updateData: any = {
                estado_id: newStatusId,
                updated_at: new Date().toISOString(),
                motivo_rechazo: null, // Se limpia por defecto
                motivo_bloqueo: null  // Se limpia por defecto
            };

            // Solo si el NUEVO estado es Rechazada o Bloqueada, guardamos el motivo
            if (newStatusObj.nombre === 'Rechazada' && motivo) {
                updateData.motivo_rechazo = motivo;
            }
            if (newStatusObj.nombre === 'Bloqueada' && motivo) {
                updateData.motivo_bloqueo = motivo;
            }

            // Lógica de fechas completadas (se mantiene igual)
            if (newStatusObj.nombre === 'Completada') {
                const now = new Date();
                updateData.fecha_completado = now.toISOString();
                const fechaFin = new Date(task.fecha_fin);
                const completedOnTime = now <= fechaFin;
                updateData.completada_a_tiempo = completedOnTime;
            } else {
                updateData.fecha_completado = null;
                updateData.completada_a_tiempo = null;
            }

            const { error } = await supabase
                .from('tareas')
                .update(updateData)
                .eq('id', taskId);

            if (error) throw error;

            // Historial (se mantiene igual)
            const historialData: any = {
                tarea_id: taskId,
                estado_anterior_id: task.estado_id,
                estado_nuevo_id: newStatusId,
                cambiado_por: profile?.id,
            };

            if (motivo && (newStatusObj.nombre === 'Rechazada' || newStatusObj.nombre === 'Bloqueada')) {
                historialData.comentario = motivo;
            }

            supabase.from('historial_estados').insert(historialData).then();

            if (task.asignado_a && newStatusObj.nombre === 'Completada') {
                supabase.from('notificaciones').insert({
                    usuario_id: task.asignado_a,
                    tipo: 'tarea_completada',
                    titulo: 'Tarea Completada',
                    mensaje: `La tarea "${task.titulo}" ha sido marcada como completada`,
                    tarea_id: taskId
                }).then();
            }

            addToast("Estado de tarea actualizado", "success");
            
            // Actualizamos la tarea seleccionada si está abierto el modal para reflejar cambios inmediatos
            if(selectedTaskForDetail && selectedTaskForDetail.id === taskId) {
                 // Hacemos un fetch rápido o actualizamos el estado local
                 const updatedTaskLocal = { 
                     ...selectedTaskForDetail, 
                     estado_id: newStatusId, 
                     estado: newStatusObj,
                     motivo_rechazo: updateData.motivo_rechazo,
                     motivo_bloqueo: updateData.motivo_bloqueo
                 };
                 setSelectedTaskForDetail(updatedTaskLocal as Tarea);
            }
            
            await fetchTareas();

        } catch (error) {
            console.error("Error actualizando estado:", error);
            addToast("Error al actualizar el estado", "error");
        }
    };

    const handleDeleteTask = async (taskId: string) => {
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
                    const { error } = await supabase.from('tareas').delete().eq('id', taskId);
                    if (error) throw error;

                    MySwal.fire({
                        title: '¡Eliminada!',
                        text: 'La tarea y sus recursos han sido eliminados correctamente.',
                        icon: 'success',
                        timer: 2000,
                        showConfirmButton: false,
                        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                    });

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
        if (!editingTask && tempAttachments.length > 0) {
            try {
                const pathsToDelete = tempAttachments.map(file => file.path);
                const { error } = await supabase.storage
                    .from('adjuntos')
                    .remove(pathsToDelete);
                if (error) console.error("Error limpiando archivos temporales:", error);
            } catch (error) {
                console.error("Error de conexión al limpiar:", error);
            }
        }
        setIsModalOpen(false);
        setEditingTask(null);
        setTempAttachments([]);
        setFiles([]);
    };

    const openTaskDetail = async (task: Tarea) => {
        setSelectedTaskForDetail(task);
        setIsDetailModalOpen(true);

        if (notificaciones.some(n => n.tarea_id === task.id)) {
            await supabase
                .from('notificaciones')
                .update({ leida: true })
                .eq('tarea_id', task.id)
                .eq('usuario_id', profile?.id);

            setNotificaciones(prev => prev.filter(n => n.tarea_id !== task.id));
        }
    };

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
                if (selectedTaskForDetail) openTaskDetail(selectedTaskForDetail);
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

    const canEditTaskDetails = (task: Tarea | null): boolean => {
        if (!task) return true;
        if (!profile) return false;

        // Si el usuario es "Usuario" y la tarea fue asignada por otro (no es creador), no puede editar
        if (profile.rol_nombre === 'Usuario' && task.asignado_a === profile.id && task.creador_id !== profile.id) {
            return false;
        }

        // REGLA ESPECÍFICA PARA MANAGER: Solo puede editar tareas que él ha asignado
        if (profile.rol_nombre === 'Manager') {
            // Solo puede editar si él es el creador (quien asignó la tarea)
            return task.creador_id === profile.id;
        }

        // REGLA PARA TAREAS COMPLETADAS VENCIDAS: Solo Admin puede editar
        if (task.estado?.nombre === 'Completada' &&
            new Date(task.fecha_fin) < new Date()) {
            // Tarea completada pero vencida = solo Admin puede editar
            return profile.rol_nombre === 'Admin';
        }

        // Regla de Tarea Vencida (ESTRICTA)
        if (task.estado?.nombre === 'Vencida') {
            // Solo Admin o el Creador (quien asignó)
            return (
                profile.rol_nombre === 'Admin' ||
                task.creador_id === profile.id
            );
        }

        // Reglas normales (No vencidas)
        if (profile.rol_nombre === 'Admin') return true;
        if (task.creador_id === profile.id) return true;
        if (task.asignado_a === profile.id) return true; // El responsable sí puede editar si NO está vencida

        return false;
    };

    const canChangeStatus = (task: Tarea | null): boolean => {
    if (!task || !profile) return false;

    // --- CAMBIO 1: Se eliminó el bloqueo específico de 'Manager' ---
    // Al quitar ese if, permitimos que el Manager caiga en las reglas de abajo 
    // (asignado_a o colaboradores).

    // REGLA PARA TAREAS COMPLETADAS VENCIDAS: Solo Admin puede modificar
    // (Mantenemos esto para proteger el historial de tareas viejas)
    if (task.estado?.nombre === 'Completada' &&
        new Date(task.fecha_fin) < new Date()) {
        return profile.rol_nombre === 'Admin';
    }

    // Regla de Tarea Vencida (ESTRICTA)
    // (Mantenemos esto: si ya venció, solo el admin o quien la mandó pueden reabrirla)
    if (task.estado?.nombre === 'Vencida') {
        return (
            profile.rol_nombre === 'Admin' ||
            task.creador_id === profile.id
        );
    }

    // Reglas normales (Aplica para Manager, Usuario, etc.)
    if (profile.rol_nombre === 'Admin') return true;
    if (task.creador_id === profile.id) return true;
    
    // AQUÍ es donde se habilita al Manager/Usuario si la tarea se le asignó
    if (task.asignado_a === profile.id) return true; 
    
    // También si es colaborador
    if (task.colaboradores && task.colaboradores.some(c => c.usuario_id === profile.id)) return true;

    return false;
};

const getAllowedStatuses = (currentStatusId: string) => {
    const task = editingTask || selectedTaskForDetail;
    if (!task) return estados;

    // Admin y Creador original tienen acceso a TODOS los estados (incluyendo Vencida, Archivada, etc.)
    if (profile?.rol_nombre === 'Admin') return estados;
    if (task.creador_id === profile?.id) return estados;

    // --- CAMBIO 2: Agregamos 'Nueva' a la lista permitida ---
    // Esto define qué opciones ven en el desplegable si NO son admin/creador
    const allowedNames = ['Nueva', 'En Progreso', 'Completada', 'Pendiente'];
    
    return estados.filter(e => allowedNames.includes(e.nombre) || e.id === currentStatusId);
};

    const canManageComment = (comentario: Comentario) => {
        if (!profile) return false;
        if (profile.rol_nombre === 'Admin') return true;
        if (comentario.usuario_id !== profile.id) return false;
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

            if (tempCommentAttachments.length > 0 && commentData) {
                const attachmentsToInsert = tempCommentAttachments.map(file => ({
                    tarea_id: selectedTaskForDetail.id,
                    comentario_id: commentData.id,
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

            setSelectedTaskForDetail(updatedTask);
            await fetchTareas();
            setNewCommentText('');
            setCommentFiles([]);
            setTempCommentAttachments([]);
            addToast("Comentario agregado", "success");

        } catch (error) {
            console.error("Error publicando comentario:", error);
        } finally {
            setIsSubmittingComment(false);
        }
    };

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
            if (startDate || endDate) {
                const taskDate = new Date(tarea.fecha_fin);

                if (startDate && endDate) {
                    // Filter between start and end dates
                    const start = new Date(startDate);
                    const end = new Date(endDate);
                    matchesFecha = taskDate >= start && taskDate <= end;
                } else if (startDate) {
                    // Filter from start date onwards
                    const start = new Date(startDate);
                    matchesFecha = taskDate >= start;
                } else if (endDate) {
                    // Filter up to end date
                    const end = new Date(endDate);
                    matchesFecha = taskDate <= end;
                }
            }

            return matchesSearch && matchesEstado && matchesPrioridad && matchesUsuario && matchesDepartamento && matchesFecha;
        });

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
    }, [tareas, searchTerm, filterEstado, filterPrioridad, filterUsuario, filterDepartamento, filterFecha, startDate, endDate, sortBy, sortOrder]);

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
                    <div className="bg-slate-800 dark:bg-slate-900 text-white text-xs rounded-md px-3 py-2 shadow-xl whitespace-nowrap flex flex-col items-center border border-slate-700">
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
                    <div className="w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-slate-800 dark:border-t-slate-900" />
                </div>,
                document.body
            ) : null;

        return { showUserTooltip, showListTooltip, hideTooltip, TooltipComponent };
    };

    const KanbanBoard = () => {
        const [draggedTask, setDraggedTask] = useState<Tarea | null>(null);
        const [dragOverColumn, setDragOverColumn] = useState<string | null>(null);
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

            if (!draggedTask) return;
            if (draggedTask.estado_id === newEstadoId) {
                setDraggedTask(null);
                return;
            }

            const targetStatus = estados.find(st => st.id === newEstadoId);
            if (!targetStatus) return;

            const isFullAccess =
                profile?.rol_nombre === 'Admin' ||
                draggedTask.creador_id === profile?.id;

            if (!isFullAccess) {
                const allowedNames = ['En Progreso', 'Completada', 'Pendiente'];
                if (!allowedNames.includes(targetStatus.nombre)) {
                    addToast(`Permiso restringido. No tienes autorización para mover tareas al estado "${targetStatus.nombre}". Estados permitidos: En Progreso, Pendiente y Completada.`, "warning");
                    setDraggedTask(null);
                    return;
                }
            }

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
                            ${isDragOver ? 'bg-white/90 dark:bg-slate-800/90 ring-4 ring-indigo-100/50 dark:ring-indigo-500/20 scale-[1.02] shadow-indigo-200/30 dark:shadow-indigo-900/20' : 'bg-white dark:bg-slate-800'}
                        `}
                            style={{ borderTopColor: estado.color }}
                            onDragOver={(e) => handleDragOver(e, estado.id)}
                            onDragLeave={handleDragLeave}
                            onDrop={(e) => handleDrop(e, estado.id)}
                        >
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

                            <div className="flex-1 overflow-y-auto px-3 pb-4 space-y-3 hide-scrollbar">
                                {tareasEnColumna.map(tarea => (
                                    <div
                                        key={tarea.id}
                                        draggable={canChangeStatus(tarea)}
                                        onDragStart={(e) => handleDragStart(e, tarea)}
                                        onClick={() => openTaskDetail(tarea)}
                                        className="group relative bg-gradient-to-br from-white to-slate-50 dark:from-slate-700 dark:to-slate-800 rounded-xl p-4 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 dark:hover:shadow-slate-900/50 hover:-translate-y-0.5 transition-all duration-300 border border-slate-100/80 dark:border-slate-600/50 cursor-grab active:cursor-grabbing"
                                    >
                                        <div className="absolute left-0 top-3 bottom-3 w-1.5 rounded-r-full shadow-sm" style={{ backgroundColor: tarea.prioridad?.color || '#cbd5e1' }} />

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

                                        <div className="pl-3 mb-3">
                                            <h4 className="font-bold text-slate-800 dark:text-slate-100 text-sm leading-snug mb-1.5 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors line-clamp-2">
                                                {tarea.titulo}
                                            </h4>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-2 font-medium transition-colors duration-300">
                                                {tarea.descripcion}
                                            </p>
                                        </div>

                                        <div className="h-px bg-gradient-to-r from-slate-100 to-transparent dark:from-slate-600 dark:to-transparent w-full mb-3 ml-3 transition-colors duration-300" />

                                        <div className="pl-3 flex items-center justify-between mt-auto pt-1">
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center -space-x-2">
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

                                                    {tarea.colaboradores?.slice(0, 2).map((colab) => (
                                                        <div key={colab.usuario_id} className="z-20 ring-3 ring-white dark:ring-slate-700 rounded-full transition-all duration-200 hover:scale-110 hover:z-40 shadow-sm"
                                                            onMouseEnter={(e) => showUserTooltip(e, colab.usuario.nombre_completo, 'Colaborador')}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            <UserAvatar url={colab.usuario.avatar_url} name={colab.usuario.nombre_completo} size="sm" showTooltip={false} />
                                                        </div>
                                                    ))}

                                                    {tarea.colaboradores && tarea.colaboradores.length > 2 && (
                                                        <div className="z-10 w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-600 ring-3 ring-white dark:ring-slate-700 flex items-center justify-center text-[10px] font-bold text-slate-500 dark:text-slate-300 cursor-help transition-all duration-200 hover:scale-110 hover:bg-slate-200 dark:hover:bg-slate-500 shadow-sm"
                                                            onMouseEnter={(e) => showListTooltip(e, tarea.colaboradores!.slice(2).map(c => c.usuario.nombre_completo))}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            +{tarea.colaboradores.length - 2}
                                                        </div>
                                                    )}
                                                </div>

                                                <div className="flex gap-1.5 text-slate-400 dark:text-slate-500 ml-1 transition-colors duration-300">
                                                    {(tarea.adjuntos_count || 0) > 0 && <div className="flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md transition-colors duration-300"><Paperclip size={11} /> {tarea.adjuntos_count}</div>}
                                                    {(tarea.comentarios_count || 0) > 0 && <div className="flex items-center gap-0.5 text-[10px] bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded-md transition-colors duration-300"><MessageSquare size={11} /> {tarea.comentarios_count}</div>}
                                                </div>
                                            </div>

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

    // 1. Forzar fecha local sin horas (AAAA-MM-DDT00:00:00 local)
    const parseDateToLocal = (dateStr: string | null | undefined): Date => {
        if (!dateStr) return new Date();
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(year, month - 1, day, 0, 0, 0, 0);
    };

    // 2. Calcular diferencia exacta en días enteros (ignorando horas/minutos)
    const getDiffInDays = (dateA: Date, dateB: Date): number => {
        // Usamos UTC internamente para evitar problemas de cambio de horario
        const utc1 = Date.UTC(dateA.getFullYear(), dateA.getMonth(), dateA.getDate());
        const utc2 = Date.UTC(dateB.getFullYear(), dateB.getMonth(), dateB.getDate());
        return Math.floor((utc2 - utc1) / (1000 * 60 * 60 * 24));
    };

    const TimelineBoard = () => {
        const { handleMouseEnter, handleMouseLeave, TooltipComponent } = useTaskTooltip();
        const {
            showUserTooltip,
            showListTooltip,
            hideTooltip,
            TooltipComponent: AvatarTooltipComponent
        } = useAvatarTooltip();

        const getLocalTodayString = () => {
            const d = new Date();
            const year = d.getFullYear();
            const month = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        };

        // 1. Calcular Fecha de Inicio del Gráfico
        const timelineStart = useMemo((): Date => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filteredAndSortedTareas.length === 0) {
                const minDate = new Date(today);
                minDate.setDate(minDate.getDate() - 2);
                return minDate;
            }

            const timestamps = filteredAndSortedTareas.map(t => parseDateToLocal(t.fecha_inicio).getTime());
            timestamps.push(today.getTime());

            const minDate = new Date(Math.min(...timestamps));
            minDate.setDate(minDate.getDate() - 2); // Margen visual
            return minDate;
        }, [filteredAndSortedTareas]);

        // 2. Calcular Fecha de Fin del Gráfico
        const timelineEnd = useMemo((): Date => {
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            if (filteredAndSortedTareas.length === 0) {
                const maxDate = new Date(today);
                maxDate.setDate(maxDate.getDate() + 30);
                return maxDate;
            }

            const timestamps = filteredAndSortedTareas.map(t => parseDateToLocal(t.fecha_fin).getTime());
            timestamps.push(today.getTime());

            const maxDate = new Date(Math.max(...timestamps));
            maxDate.setDate(maxDate.getDate() + 5); // Margen visual
            return maxDate;
        }, [filteredAndSortedTareas]);

        // 3. Generar array de días (Columnas)
        const days = useMemo(() => {
            const daysArray = [];
            const currentDate = new Date(timelineStart);
            // Iteramos añadiendo días hasta llegar al fin
            while (currentDate <= timelineEnd) {
                daysArray.push(new Date(currentDate));
                currentDate.setDate(currentDate.getDate() + 1);
            }
            return daysArray;
        }, [timelineStart, timelineEnd]);

        const totalDays = days.length;

        // 4. Lógica de Posicionamiento por ÍNDICE (Exacta)
        const getLeftPosition = (startDateString: string) => {
            const start = parseDateToLocal(startDateString);
            // ¿Cuántos días hay desde el inicio del gráfico hasta el inicio de la tarea?
            const diffDays = getDiffInDays(timelineStart, start);

            // Si hay 20 días en total y la tarea empieza en el día 5, posición = 5/20 = 25%
            return (diffDays / totalDays) * 100;
        };

        const getWidth = (startDateString: string, endDateString: string) => {
            const start = parseDateToLocal(startDateString);
            const end = parseDateToLocal(endDateString);

            // Duración inclusiva (si empieza el 20 y termina el 20, es 1 día de duración)
            const durationDays = getDiffInDays(start, end) + 1;

            return (durationDays / totalDays) * 100;
        };

        return (
            <div className="h-full flex flex-col bg-white dark:bg-slate-800 rounded-2xl shadow-xl shadow-slate-200/50 dark:shadow-slate-900/50 border border-slate-200/60 dark:border-slate-700/60 overflow-hidden relative transition-colors duration-300">

                <div className="flex flex-1 overflow-hidden relative">
                    {/* ZONA IZQUIERDA (LISTA) */}
                    <div className="w-64 flex-shrink-0 border-r border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 z-10 flex flex-col overflow-hidden shadow-[4px_0_24px_rgba(0,0,0,0.04)] dark:shadow-[4px_0_24px_rgba(0,0,0,0.3)] transition-colors duration-300">
                        <div className="h-12 border-b border-slate-100 dark:border-slate-700 flex items-center px-5 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800 dark:to-slate-800 transition-colors duration-300">
                            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider transition-colors duration-300">Tareas</span>
                        </div>

                        <div className="overflow-y-hidden flex-1 bg-white dark:bg-slate-800 transition-colors duration-300">
                            {filteredAndSortedTareas.map((tarea) => (
                                <div key={tarea.id} className="h-16 flex items-center px-5 border-b border-slate-50 dark:border-slate-700/50 hover:bg-gradient-to-r hover:from-slate-50/80 hover:to-white dark:hover:from-slate-700/50 dark:hover:to-slate-700 transition-all duration-200 group cursor-pointer shadow-sm dark:shadow-none" onClick={() => openTaskDetail(tarea)}>
                                    <div className="min-w-0">
                                        <div className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate transition-colors duration-300">{tarea.titulo}</div>
                                        <div className="flex items-center gap-2.5 mt-2">
                                            {/* Avatares (Sin cambios en lógica) */}
                                            {tarea.asignado ? (
                                                <div className="flex items-center -space-x-2">
                                                    <div className="z-30 ring-3 ring-white dark:ring-slate-700 rounded-full transition-all duration-200 hover:scale-110 hover:z-40 shadow-sm"
                                                        onMouseEnter={(e) => tarea.asignado ? showUserTooltip(e, tarea.asignado.nombre_completo, 'Responsable') : null}
                                                        onMouseLeave={hideTooltip}
                                                    >
                                                        <UserAvatar url={tarea.asignado.avatar_url} name={tarea.asignado.nombre_completo} size="sm" showTooltip={false} />
                                                    </div>
                                                    {tarea.colaboradores?.slice(0, 2).map((colab) => (
                                                        <div key={colab.usuario_id} className="z-20 ring-3 ring-white dark:ring-slate-700 rounded-full transition-all duration-200 hover:scale-110 hover:z-40 shadow-sm"
                                                            onMouseEnter={(e) => showUserTooltip(e, colab.usuario.nombre_completo, 'Colaborador')}
                                                            onMouseLeave={hideTooltip}
                                                        >
                                                            <UserAvatar url={colab.usuario.avatar_url} name={colab.usuario.nombre_completo} size="sm" showTooltip={false} />
                                                        </div>
                                                    ))}
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

                    {/* ZONA DERECHA (CRONOGRAMA) */}
                    <div className="flex-1 overflow-auto custom-scrollbar bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 relative transition-colors duration-300">
                        <div className="min-w-[800px] relative">
                            {/* ENCABEZADOS DE DÍAS */}
                            {/* px-5 al inicio para alinear con el contenido de las filas */}
                            <div className="h-12 border-b border-slate-200 dark:border-slate-700 flex bg-gradient-to-r from-white to-slate-50 dark:from-slate-800 dark:to-slate-900 sticky top-0 z-10 shadow-sm transition-colors duration-300 px-5">
                                {days.map((day, i) => (
                                    <div key={i} className="flex-1 min-w-[40px] flex flex-col items-center justify-center border-r border-slate-100 dark:border-slate-700/50 last:border-0 transition-colors duration-300">
                                        <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase transition-colors duration-300">{day.toLocaleDateString(undefined, { weekday: 'short' })}</span>
                                        <span className={`text-xs font-bold py-0.5 px-1.5 rounded-lg transition-all duration-300 ${day.toDateString() === new Date().toDateString() ? 'text-indigo-600 dark:text-indigo-400 bg-indigo-100 dark:bg-indigo-900/50 shadow-sm' : 'text-slate-600 dark:text-slate-400'}`}>
                                            {day.getDate()}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* CONTENEDOR DE BARRAS Y LÍNEAS */}
                            <div className="relative border-t border-slate-200 dark:border-slate-800">

                                {/* LÍNEAS DE CUADRÍCULA (FONDO MEJORADO) */}
                                <div className="absolute inset-0 flex pointer-events-none px-5 bg-white dark:bg-[#0f172a]">
                                    {days.map((_, i) => {
                                        // Lógica para fines de semana (más sutil)
                                        const isWeekend = i % 7 === 0 || i % 7 === 6;
                                        return (
                                            <div
                                                key={i}
                                                className={`
                        flex-1 min-w-[40px] h-full border-r last:border-0 transition-colors duration-300
                        border-slate-100 dark:border-slate-800/60
                        ${isWeekend
                                                        ? 'bg-slate-50/80 dark:bg-slate-900/40'
                                                        : 'bg-transparent'}
                    `}
                                            />
                                        );
                                    })}

                                    {/* LÍNEA DE HOY (EFECTO LÁSER) */}
                                    <div
                                        className="absolute top-0 bottom-0 w-[2px] z-20 shadow-[0_0_10px_rgba(239,68,68,0.6)] bg-rose-500"
                                        style={{ left: `${getLeftPosition(getLocalTodayString())}%` }}
                                    >
                                        <div className="absolute -top-1 -left-[3px] w-2 h-2 bg-rose-500 rounded-full shadow-sm" />
                                    </div>
                                </div>

                                {/* BARRAS DE TAREAS */}
                                {/* BARRAS DE TAREAS */}
                                <div className="relative py-2">
                                    {filteredAndSortedTareas.map((tarea) => {
                                        const left = getLeftPosition(tarea.fecha_inicio);
                                        const width = getWidth(tarea.fecha_inicio, tarea.fecha_fin);

                                        // Lógica de Estado
                                        const isCompleted = tarea.estado?.nombre === 'Completada';
                                        const isOverdue = new Date(tarea.fecha_fin) < new Date() && !isCompleted;
                                        // Verificamos si existe color usando optional chaining (?.)
                                        const customColor = tarea.prioridad?.color;

                                        // Clases base
                                        const baseBarClasses = "absolute h-10 rounded-md shadow-md cursor-pointer hover:shadow-xl hover:-translate-y-[1px] transition-all duration-300 group overflow-visible flex items-center px-3 border-t border-white/20 dark:border-white/10";

                                        // Determinar estilos visuales
                                        let colorClasses = "";

                                        // CORRECCIÓN 1: Tipamos explícitamente como React.CSSProperties
                                        const inlineStyle: React.CSSProperties = {
                                            left: `${left}%`,
                                            width: `${width}%`
                                        };

                                        if (isCompleted) {
                                            // VERDE SATISFACTORIO
                                            colorClasses = "bg-gradient-to-r from-emerald-500 to-teal-500 dark:from-emerald-600 dark:to-teal-700 shadow-emerald-500/20";
                                        } else if (isOverdue) {
                                            // ROJO ALERTA
                                            colorClasses = "bg-gradient-to-r from-red-500 to-rose-600 dark:from-red-600 dark:to-rose-700 shadow-red-500/20 ring-1 ring-red-500/50 animate-pulse-slow";
                                        } else if (customColor) {
                                            // COLOR PERSONALIZADO (Prioridad)
                                            // CORRECCIÓN 2: Asignamos el color background dinámicamente
                                            inlineStyle.backgroundColor = customColor;
                                            colorClasses = "shadow-lg brightness-100 hover:brightness-110";
                                        } else {
                                            // POR DEFECTO (Índigo)
                                            colorClasses = "bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-700 dark:to-indigo-700 shadow-blue-500/20";
                                        }

                                        return (
                                            <div
                                                key={tarea.id}
                                                className="h-[60px] flex items-center px-5 relative group/row hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors border-b border-transparent hover:border-slate-100 dark:hover:border-slate-700/30"
                                            >
                                                <div className="relative w-full h-full flex items-center">
                                                    <div
                                                        className={`${baseBarClasses} ${colorClasses}`}
                                                        style={inlineStyle}
                                                        onClick={() => openTaskDetail(tarea)}
                                                        onMouseEnter={(e) => handleMouseEnter(e, tarea)}
                                                        onMouseLeave={handleMouseLeave}
                                                    >
                                                        {/* Brillo superior */}
                                                        <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-50" />

                                                        {/* Texto dentro de la barra */}
                                                        <div className="flex items-center gap-2 w-full overflow-hidden">
                                                            {isCompleted && <span className="text-white/80">✓</span>}
                                                            {isOverdue && <span className="text-white/90">!</span>}

                                                            <span className="text-[11px] font-bold text-white tracking-wide truncate drop-shadow-md select-none sticky left-2">
                                                                {width > 3 ? tarea.titulo : ''}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <TooltipComponent />
                <AvatarTooltipComponent />
            </div>
        );
    };

    // Funciones para manejar el modal de motivo
    const handleMotivoSubmit = async () => {
        if (!motivoTexto.trim()) {
            addToast('Por favor, ingresa el motivo', 'warning');
            return;
        }

        try {
            await handleUpdateTaskStatus(motivoModal.taskId, motivoModal.nuevoEstadoId, motivoTexto.trim());
            setMotivoModal({
                isOpen: false,
                taskId: '',
                nuevoEstadoId: '',
                nombreEstado: '',
                tipo: 'rechazo'
            });
            setMotivoTexto('');
        } catch (error) {
            console.error('Error al procesar motivo:', error);
        }
    };

    const handleMotivoCancel = () => {
        setMotivoModal({
            isOpen: false,
            taskId: '',
            nuevoEstadoId: '',
            nombreEstado: '',
            tipo: 'rechazo'
        });
        setMotivoTexto('');
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 w-full relative overflow-hidden">
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

            <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">
                <div className="sticky top-0 z-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 transition-colors duration-300">
                    <div className="flex flex-col gap-4 px-4 py-3 md:px-6 md:py-4">
                        <div className="flex items-center justify-between gap-4">
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
                                                ? 'border-indigo-600 text-indigo-700 dark:text-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/20'
                                                : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                                            }
          `}
                                    >
                                        <view.icon size={16} className={view.id === 'timeline' ? 'rotate-90' : ''} />
                                        {view.label}
                                    </button>
                                ))}
                            </div>

                            {(['Admin', 'Manager', 'Usuario'].includes(profile?.rol_nombre || '')) && (
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

                    {(['Admin', 'Manager', 'Usuario'].includes(profile?.rol_nombre || '')) && (
                        <button
                            onClick={() => {
                                setEditingTask(null);
                                setIsModalOpen(true);
                            }}
                            className="sm:hidden fixed bottom-6 right-6 z-30 bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-full shadow-xl transition"
                            aria-label="Nueva tarea"
                        >
                            <Plus size={22} />
                        </button>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 overflow-visible transition-colors duration-300">
                    <div className="px-4 sm:px-6 py-3 sm:py-4 overflow-visible">
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 mb-3">
                            <div className="relative flex-1 sm:max-w-xs lg:max-w-md">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                                <input
                                    type="text"
                                    placeholder="Buscar tareas..."
                                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-sm 
                             focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 
                             transition-all placeholder:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 text-slate-800 dark:text-slate-200"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                />
                            </div>

                            <div className="flex items-center gap-2 sm:ml-auto">
                                <button
                                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 
                             hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all
                             border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
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
                                    className="flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 
                             hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-all
                             border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                                    title="Actualizar"
                                >
                                    <RefreshCw size={16} className={refreshing ? 'animate-spin' : ''} />
                                    <span className="hidden sm:inline">Actualizar</span>
                                </button>
                            </div>
                        </div>

                        {/* CONTENEDOR PRINCIPAL DE FILTROS */}
                        <div className="w-full">
                            {/* Header "Filtros" (Visible solo en desktop) */}
                            <div className="hidden lg:flex items-center gap-2 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3">
                                <Filter size={14} />
                                <span>Filtros</span>
                            </div>

                            {/* GRUPO DE INPUTS (Flex Wrap activado) */}
                            <div className="flex flex-wrap items-center gap-3 w-full">

                                {/* 1. FILTRO ESTADO */}
                                <div className="w-full sm:w-auto sm:flex-1 min-w-[140px]">
                                    <CustomSelector
                                        options={estados}
                                        value={filterEstado}
                                        onChange={(val) => setFilterEstado(val as string)}
                                        placeholder="Estado"
                                        icon={Filter}
                                        searchable={false}
                                        className="!w-full !py-2 !text-sm !rounded-lg !border-slate-200 dark:!border-slate-700 hover:!border-slate-300! transition-all! !bg-white dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300"
                                        label=""
                                    />
                                </div>

                                {/* 2. FILTRO PRIORIDAD */}
                                <div className="w-full sm:w-auto sm:flex-1 min-w-[140px]">
                                    <CustomSelector
                                        options={prioridades}
                                        value={filterPrioridad}
                                        onChange={(val) => setFilterPrioridad(val as string)}
                                        placeholder="Prioridad"
                                        icon={Target}
                                        searchable={false}
                                        className="!w-full !py-2 !text-sm !rounded-lg !border-slate-200 dark:!border-slate-700 hover:!border-slate-300! transition-all !bg-white dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300"
                                        label=""
                                    />
                                </div>

                                {/* 3. FILTRO ASIGNADO A (Condicional) */}
                                {profile?.rol_nombre !== 'Usuario' && (
                                    <div className="w-full sm:w-auto sm:flex-1 min-w-[160px]">
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
                                            className="!w-full !py-2 !text-sm !rounded-lg !border-slate-200 dark:!border-slate-700 hover:!border-slate-300! transition-all !bg-white dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300"
                                            label=""
                                        />
                                    </div>
                                )}

                                {/* 4. FILTRO FECHAS (Rango) */}
                                <div className="w-full md:w-auto">
                                    <div className="flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 border border-slate-200 dark:border-slate-700 shadow-sm w-full transition-all hover:border-slate-300 dark:hover:border-slate-600">
                                        <Calendar size={16} className="text-slate-400 shrink-0" />

                                        <input
                                            type="date"
                                            value={startDate}
                                            onChange={(e) => setStartDate(e.target.value)}
                                            className="border-none bg-transparent p-0 text-sm w-full sm:w-28 text-slate-600 dark:text-slate-200 focus:ring-0 cursor-pointer placeholder-slate-400"
                                        />

                                        <span className="text-slate-300 dark:text-slate-600 font-medium">—</span>

                                        <input
                                            type="date"
                                            value={endDate}
                                            onChange={(e) => setEndDate(e.target.value)}
                                            className="border-none bg-transparent p-0 text-sm w-full sm:w-28 text-slate-600 dark:text-slate-200 focus:ring-0 cursor-pointer placeholder-slate-400"
                                        />
                                    </div>
                                </div>

                                {/* 5. BOTÓN LIMPIAR FILTROS */}
                                {(filterEstado !== 'all' || filterPrioridad !== 'all' || filterUsuario !== 'all' || filterFecha !== 'all' || startDate || endDate) && (
                                    <button
                                        onClick={() => {
                                            setFilterEstado('all');
                                            setFilterPrioridad('all');
                                            setFilterUsuario('all');
                                            setFilterFecha('all');
                                            setStartDate('');
                                            setEndDate('');
                                        }}
                                        className="w-full sm:w-auto px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 
                hover:text-slate-900 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-all
                border border-dashed border-slate-300 dark:border-slate-600 whitespace-nowrap"
                                    >
                                        Limpiar filtros
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-1 bg-slate-50 dark:bg-slate-950 overflow-hidden relative">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-full text-slate-400 dark:text-slate-500 pt-4">
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
                            {viewMode === 'kanban' && <KanbanBoard />}
                            {viewMode === 'list' && <ListBoard />}
                            {viewMode === 'timeline' && <TimelineBoard />}
                        </div>
                    )}
                </div>
            </div>

            {isModalOpen && (
                <div className="fixed inset-0 z-100 flex items-center justify-center p-4 bg-slate-900/60 dark:bg-black/70 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[90vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
                        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 sticky top-0 z-10">
                            <div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white flex items-center gap-3">
                                    {editingTask ? <Edit2 className="text-indigo-500" /> : <Plus className="text-indigo-500" />}
                                    {editingTask ? 'Editar Tarea' : 'Nueva Tarea'}
                                </h3>
                                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Completa la información necesaria para el proyecto</p>
                            </div>
                            <button
                                onClick={handleCancelAndCleanup}
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSaveTask} className="p-8 space-y-8">
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Título de la Tarea</label>
                                    <input
                                        type="text"
                                        required
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all px-5 py-4 text-lg font-medium placeholder-slate-400 ${!canEditTaskDetails(editingTask) ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100'}`}
                                        value={newTask.titulo}
                                        onChange={e => setNewTask({ ...newTask, titulo: e.target.value })}
                                        placeholder="Ej: Revisar reporte mensual de ventas"
                                    />
                                </div>

                                <div className="lg:col-span-2">
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Descripción</label>
                                    <textarea
                                        rows={4}
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-2 border-slate-100 dark:border-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all px-5 py-4 text-base placeholder-slate-400 ${!canEditTaskDetails(editingTask) ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100'}`}
                                        value={newTask.descripcion}
                                        onChange={e => setNewTask({ ...newTask, descripcion: e.target.value })}
                                        placeholder="Describe detalladamente la tarea, objetivos, requisitos y cualquier información relevante..."
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <CustomSelector
                                    options={prioridades}
                                    value={newTask.prioridad_id}
                                    onChange={(value: string | string[]) => setNewTask({ ...newTask, prioridad_id: value as string })}
                                    placeholder="Seleccionar..."
                                    label="Prioridad"
                                    icon={Target}
                                    searchable={false}
                                    disabled={!canEditTaskDetails(editingTask)}
                                    getDisplayValue={(p: any) => p.nombre}
                                    getSearchValue={(p: any) => p.nombre}
                                    className="!bg-white dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700"
                                />

                                {/* Para usuarios normales, el selector de responsable está deshabilitado y asignado a sí mismo */}
                                <CustomSelector
                                    options={usuariosParaAsignar}
                                    value={profile?.rol_nombre === 'Usuario' ? profile.id : newTask.asignado_a}
                                    onChange={(value: string | string[]) => {
                                        const selectedUser = usuariosParaAsignar.find(u => u.id === value);
                                        setNewTask(prev => ({
                                            ...prev,
                                            asignado_a: value as string,
                                            departamento_id: selectedUser?.departamento_id || ''
                                        }));
                                    }}
                                    placeholder={profile?.rol_nombre === 'Usuario' ? 'Asignado a ti mismo' : 'Seleccionar responsable...'}
                                    label="Responsable"
                                    icon={UserIcon}
                                    searchable={true}
                                    disabled={!canEditTaskDetails(editingTask) || profile?.rol_nombre === 'Usuario'}
                                    getDisplayValue={(u: any) => u.nombre_completo}
                                    getSearchValue={(u: any) => u.nombre_completo}
                                    getAvatar={(u: any) => u.avatar_url}
                                    className="!bg-white dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700"
                                />

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
                                    className="!bg-white dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700"
                                />

                                <div className="md:col-span-2 lg:col-span-3">
                                    <CustomSelector
                                        options={usuariosParaAsignar.filter(u =>
                                            // Solo usuarios del mismo departamento que el creador/usuario actual
                                            u.departamento_id === (profile?.departamento_id || newTask.departamento_id) &&
                                            u.id !== newTask.asignado_a
                                        )}
                                        value={newTask.colaboradores}
                                        onChange={(val: string | string[]) => setNewTask({ ...newTask, colaboradores: val as string[] })}
                                        placeholder="Añadir colaboradores extra..."
                                        label="Colaboradores (Mismo Departamento)"
                                        icon={Users}
                                        multiple={true}
                                        searchable={true}
                                        disabled={!canEditTaskDetails(editingTask)}
                                        getDisplayValue={(u: any) => u.nombre_completo}
                                        getSearchValue={(u: any) => u.nombre_completo}
                                        getAvatar={(u: any) => u.avatar_url}

                                        className="!bg-white dark:!bg-slate-800 !text-slate-700 dark:!text-slate-300 !border-slate-200 dark:!border-slate-700"
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Inicio</label>
                                    <input
                                        type="date"
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all px-4 py-3 ${!canEditTaskDetails(editingTask) ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
                                        value={newTask.fecha_inicio}
                                        onChange={(e) => setNewTask({ ...newTask, fecha_inicio: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wide">Vencimiento</label>
                                    <input
                                        type="date"
                                        disabled={!canEditTaskDetails(editingTask)}
                                        className={`w-full rounded-xl border-none shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all px-4 py-3 ${!canEditTaskDetails(editingTask) ? 'bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed' : 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200'}`}
                                        value={newTask.fecha_fin}
                                        onChange={(e) => setNewTask({ ...newTask, fecha_fin: e.target.value })}
                                    />
                                </div>
                            </div>

                            {canEditTaskDetails(editingTask) && (
                                <div className="mt-4">
                                    <FilePondComponent
                                        files={files}
                                        onupdatefiles={setFiles}
                                        allowMultiple={true}
                                        maxFiles={5}
                                        name="files"
                                        credits={false}
                                        labelIdle={`<div class="flex flex-col items-center gap-3 text-slate-400 group-hover:text-indigo-600 transition-colors cursor-pointer"><div class="p-4 bg-slate-100 dark:bg-slate-800 rounded-full group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/30 transition-colors"><svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-indigo-500 dark:text-indigo-400"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg></div><div><span class="text-base font-bold block text-slate-600 dark:text-slate-300">Subir archivos adjuntos</span><span class="text-sm text-slate-400 dark:text-slate-500 block mt-1">Soporta: PDF, DOC, XLS, JPG, PNG (máx. 10MB)</span></div></div>`}
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

                            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800 sticky bottom-0 bg-white dark:bg-slate-900 pb-4">
                                <button
                                    type="button"
                                    onClick={handleCancelAndCleanup}
                                    className="px-6 py-3 rounded-xl font-bold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
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

            {isDetailModalOpen && selectedTaskForDetail && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/70 dark:bg-black/80 backdrop-blur-md animate-fade-in">
                    <div className="bg-white dark:bg-slate-900 w-full max-w-5xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up max-h-[95vh] overflow-y-auto border border-slate-200 dark:border-slate-800">
                        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-start bg-white dark:bg-slate-900 sticky top-0 z-10">
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center gap-3">
                                    {selectedTaskForDetail.prioridad && (
                                        <PriorityBadge
                                            nombre={selectedTaskForDetail.prioridad.nombre}
                                            color={selectedTaskForDetail.prioridad.color}
                                            level={selectedTaskForDetail.prioridad.nivel}
                                        />
                                    )}
                                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">ID: {selectedTaskForDetail.id.slice(0, 8)}</span>
                                </div>
                                <h3 className="text-2xl font-black text-slate-800 dark:text-white leading-tight">
                                    {selectedTaskForDetail.titulo}
                                </h3>
                            </div>
                            <button
                                onClick={() => {
                                    setIsDetailModalOpen(false);
                                    setSelectedTaskForDetail(null);
                                }}
                                className="text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300 transition-colors p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full"
                            >
                                <X size={28} />
                            </button>
                        </div>

                        <div className="p-8">
                            {(selectedTaskForDetail.estado?.nombre === 'Rechazada' || selectedTaskForDetail.estado?.nombre === 'Bloqueada') && (
                                <div className={`mb-8 p-4 rounded-xl border flex items-start gap-3 animate-fade-in ${
                                    selectedTaskForDetail.estado.nombre === 'Rechazada' 
                                    ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                                    : 'bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
                                }`}>
                                    <AlertCircle size={24} className="shrink-0 mt-0.5" />
                                    <div>
                                        <h4 className="font-bold text-sm uppercase tracking-wide mb-1">
                                            {selectedTaskForDetail.estado.nombre === 'Rechazada' ? 'Motivo del Rechazo' : 'Motivo del Bloqueo'}
                                        </h4>
                                        <p className="text-base leading-relaxed">
                                            {selectedTaskForDetail.estado.nombre === 'Rechazada' 
                                                ? (selectedTaskForDetail.motivo_rechazo || "Sin motivo especificado.")
                                                : (selectedTaskForDetail.motivo_bloqueo || "Sin motivo especificado.")
                                            }
                                        </p>
                                    </div>
                                </div>
                            )}
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                                <div className="lg:col-span-2 space-y-8">
                                    <div className="prose prose-slate dark:prose-invert max-w-none">
                                        <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-3">Descripción</h4>
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-6 border border-slate-100 dark:border-slate-700">
                                            <p className="text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                                {selectedTaskForDetail.descripcion || 'Sin descripción disponible.'}
                                            </p>
                                        </div>
                                    </div>

                                    <div>
                                        <div className="flex items-center justify-between mb-4">
                                            <h4 className="text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide">Comentarios y Actividad</h4>
                                        </div>
                                        <div className="flex flex-col h-full max-h-150">
                                            {/* 1. LISTA DE COMENTARIOS*/}
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
                                                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl rounded-tl-none p-4 shadow-sm flex-1 group hover:border-indigo-200 dark:hover:border-indigo-800 transition-colors">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex flex-col">
                                                                        <span className="font-bold text-slate-800 dark:text-slate-100 text-sm">
                                                                            {comentario.usuario?.nombre_completo}
                                                                        </span>
                                                                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">
                                                                            {new Date(comentario.created_at).toLocaleString('es-ES', {
                                                                                day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                                                                            })}
                                                                        </span>
                                                                    </div>

                                                                    {canManageComment(comentario) && (
                                                                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                            <button
                                                                                onClick={() => {
                                                                                    setEditingCommentId(comentario.id);
                                                                                    setEditingCommentText(comentario.contenido);
                                                                                }}
                                                                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-all"
                                                                                title="Editar comentario"
                                                                                disabled={editingCommentId === comentario.id}
                                                                            >
                                                                                <Edit2 size={14} />
                                                                            </button>
                                                                            <button
                                                                                onClick={() => handleDeleteComment(comentario.id)}
                                                                                className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-all"
                                                                                title="Eliminar comentario"
                                                                                disabled={editingCommentId === comentario.id}
                                                                            >
                                                                                <Trash2 size={14} />
                                                                            </button>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {editingCommentId === comentario.id ? (
                                                                    <div className="mt-2 animate-fade-in">
                                                                        <textarea
                                                                            className="w-full rounded-lg border-indigo-300 dark:border-indigo-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 focus:ring-opacity-50 text-sm p-2 min-h-[80px] bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-200"
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
                                                                                className="px-3 py-1.5 text-xs font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-colors"
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
                                                                    <p className="text-slate-600 dark:text-slate-300 text-sm whitespace-pre-wrap leading-relaxed">
                                                                        {comentario.contenido}
                                                                    </p>
                                                                )}

                                                                {(selectedTaskForDetail.adjuntos || []).filter(adj => adj.comentario_id === comentario.id).length > 0 && (
                                                                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-2">
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
                                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 border border-slate-200 dark:border-slate-600 hover:border-indigo-200 dark:hover:border-indigo-700 rounded-lg text-xs transition-all group/file"
                                                                                        title={adj.nombre_archivo}
                                                                                    >
                                                                                        <FileText size={12} className="text-indigo-500" />
                                                                                        <span className="text-slate-600 dark:text-slate-300 font-medium truncate max-w-[120px]">
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
                                                    <div className="text-center py-12 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-200 dark:border-slate-700">
                                                        <MessageSquare size={40} className="mx-auto mb-3 text-slate-300 dark:text-slate-600" />
                                                        <p className="text-slate-500 dark:text-slate-400 font-medium">No hay comentarios aún</p>
                                                        <p className="text-slate-400 dark:text-slate-500 text-sm">Sé el primero en comentar sobre esta tarea</p>
                                                    </div>
                                                )}
                                            </div>

                                            {/* 2. FORMULARIO DE COMENTARIOS (Solo se renderiza si NO está bloqueado) */}
                                            {!(selectedTaskForDetail.estado?.nombre === 'Vencida' &&
                                                selectedTaskForDetail.creador_id !== profile?.id &&
                                                profile?.rol_nombre !== 'Admin') && (
                                                    <div className="border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 pt-4 mt-4 animate-fade-in">
                                                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
                                                            <label className="text-xs font-bold text-slate-400 dark:text-slate-500 mb-2 block justify-between">
                                                                <span>Escribe un comentario</span>
                                                                {tempCommentAttachments.length > 0 && (
                                                                    <span className="text-indigo-600 dark:text-indigo-400">{tempCommentAttachments.length} archivos adjuntos</span>
                                                                )}
                                                            </label>

                                                            <textarea
                                                                className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent p-3 text-sm min-h-[80px] resize-none text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500"
                                                                placeholder="Escribe tu respuesta o actualización aquí..."
                                                                value={newCommentText}
                                                                onChange={(e) => setNewCommentText(e.target.value)}
                                                            ></textarea>

                                                            <div className="mt-3">
                                                                <FilePondComponent
                                                                    files={commentFiles}
                                                                    onupdatefiles={setCommentFiles}
                                                                    allowMultiple={true}
                                                                    maxFiles={3}
                                                                    name="files"
                                                                    credits={false}
                                                                    labelIdle='<span class="text-xs text-slate-400 dark:text-slate-500 cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors flex items-center justify-center gap-2"><svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg> Adjuntar archivos</span>'
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
                                                )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">Estado Actual</h4>

                                        {/* 1. VISUALIZACIÓN DEL ESTADO (Siempre visible) */}
                                        <div className="flex items-center gap-3 mb-4 p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
                                            <div
                                                className="w-4 h-4 rounded-full shadow-sm ring-2 ring-white dark:ring-slate-800"
                                                style={{ backgroundColor: selectedTaskForDetail.estado?.color }}
                                            />
                                            <span className="font-bold text-slate-800 dark:text-slate-100 text-lg">
                                                {selectedTaskForDetail.estado?.nombre}
                                            </span>
                                        </div>

                                        {/* 2. SELECTOR DE CAMBIO (Solo se renderiza si tiene permiso) */}
                                        {canChangeStatus(selectedTaskForDetail) && (
                                            <div className="animate-fade-in">
                                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 mb-2 block">Cambiar estado:</label>
                                                <select
                                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-700 shadow-sm focus:ring-2 focus:ring-indigo-500 px-3 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200"
                                                    value={selectedTaskForDetail.estado_id}
                                                    onChange={(e) => handleUpdateTaskStatus(selectedTaskForDetail.id, e.target.value)}
                                                >
                                                    {getAllowedStatuses(selectedTaskForDetail.estado_id).map(estado => (
                                                        <option key={estado.id} value={estado.id}>{estado.nombre}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">Responsable</h4>
                                        {selectedTaskForDetail.estado?.nombre === 'Vencida' &&
                                            selectedTaskForDetail.creador_id !== profile?.id &&
                                            profile?.rol_nombre !== 'Admin' ? (
                                            <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-xl border border-red-100 dark:border-red-800 flex items-start gap-3">
                                                <AlertCircle size={20} className="shrink-0 mt-0.5" />
                                                <div className="flex flex-col">
                                                    <span className="font-bold">Tarea Vencida y Bloqueada</span>
                                                    <span className="opacity-90">Solo quien te asignó esta tarea ({selectedTaskForDetail.creador?.nombre_completo}) puede reactivarla o comentar.</span>
                                                </div>
                                            </div>
                                        ) : (
                                            selectedTaskForDetail.asignado ? (
                                                <div className="flex items-center gap-4">
                                                    <UserAvatar
                                                        url={selectedTaskForDetail.asignado.avatar_url}
                                                        name={selectedTaskForDetail.asignado.nombre_completo}
                                                        size="lg"
                                                    />
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                                            {selectedTaskForDetail.asignado.nombre_completo}
                                                        </div>
                                                        <div className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                            {selectedTaskForDetail.asignado.email}
                                                        </div>
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="text-slate-500 dark:text-slate-400 italic text-sm flex items-center gap-2">
                                                    <UserIcon size={16} /> Sin asignar
                                                </div>
                                            )
                                        )
                                        }
                                    </div>
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">Asignado por</h4>
                                        {selectedTaskForDetail.creador &&
                                            selectedTaskForDetail.creador_id !== selectedTaskForDetail.asignado_a && (
                                                <div className="flex items-center gap-4">
                                                    <UserAvatar
                                                        url={selectedTaskForDetail.creador.avatar_url}
                                                        name={selectedTaskForDetail.creador.nombre_completo}
                                                        size="lg"
                                                    />
                                                    <div className="overflow-hidden">
                                                        <div className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                                            {selectedTaskForDetail.creador.nombre_completo}
                                                        </div>
                                                    </div>
                                                </div>
                                            )}
                                    </div>
                                    {selectedTaskForDetail.colaboradores && selectedTaskForDetail.colaboradores.length > 0 && (
                                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                            <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">
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
                                                            <div className="font-bold text-slate-700 dark:text-slate-300 text-sm truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                                {colab.usuario.nombre_completo}
                                                            </div>
                                                            <div className="text-xs text-slate-400 dark:text-slate-500">
                                                                Colaborador
                                                            </div>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">Cronograma</h4>
                                        <div className="space-y-4">
                                            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Inicio</span>
                                                <span className="text-slate-900 dark:text-slate-100 font-bold">
                                                    {formatFullDate(selectedTaskForDetail.fecha_inicio)}
                                                </span>
                                            </div>
                                            <div className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl relative overflow-hidden">
                                                {new Date(selectedTaskForDetail.fecha_fin) < new Date() && selectedTaskForDetail.estado?.nombre !== 'Completada' && (
                                                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-red-500"></div>
                                                )}
                                                <span className="text-slate-500 dark:text-slate-400 text-sm font-medium">Vencimiento</span>
                                                <span className={`font-bold ${new Date(selectedTaskForDetail.fecha_fin) < new Date() && selectedTaskForDetail.estado?.nombre !== 'Completada' ? 'text-red-600 dark:text-red-400' : 'text-slate-900 dark:text-slate-100'}`}>
                                                    {formatFullDate(selectedTaskForDetail.fecha_fin)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                                        <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wide mb-4">Archivos Adjuntos</h4>

                                        {selectedTaskForDetail.adjuntos && selectedTaskForDetail.adjuntos.length > 0 ? (
                                            <div className="space-y-2">
                                                {selectedTaskForDetail.adjuntos.map((adjunto) => {
                                                    const { data } = supabase.storage.from('adjuntos').getPublicUrl(adjunto.url_archivo);

                                                    return (
                                                        <a
                                                            key={adjunto.id}
                                                            href={data.publicUrl}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-700/50 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 border border-slate-200 dark:border-slate-600 rounded-xl transition-all group"
                                                        >
                                                            <div className="bg-white dark:bg-slate-800 p-2 rounded-lg shadow-sm border border-slate-100 dark:border-slate-600">
                                                                <FileText size={18} className="text-indigo-500" />
                                                            </div>
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-sm font-medium text-slate-700 dark:text-slate-200 truncate">{adjunto.nombre_archivo}</p>
                                                                <p className="text-xs text-slate-400 dark:text-slate-500">
                                                                    {(adjunto.tamano_bytes ? (adjunto.tamano_bytes / 1024).toFixed(1) + ' KB' : '')}
                                                                </p>
                                                            </div>
                                                            <Eye size={14} className="text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors" />
                                                        </a>
                                                    );
                                                })}
                                            </div>
                                        ) : (
                                            <p className="text-slate-400 dark:text-slate-500 text-sm text-center py-4 italic">No hay archivos adjuntos</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        {/* Modal para solicitar motivo de rechazo/bloqueo */}
        {motivoModal.isOpen && (
            // CAMBIO AQUÍ: z-50 a z-[200] para que aparezca encima del modal de detalles (que es z-[100])
            <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-[200] p-4 animate-fade-in">
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md mx-auto border border-slate-200 dark:border-slate-700 animate-scale-up">
                    <div className="p-6">
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                    <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                                </div>
                                <div>
                                    <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                                        Motivo de {motivoModal.tipo === 'rechazo' ? 'Rechazo' : 'Bloqueo'}
                                    </h3>
                                    <p className="text-sm text-slate-500 dark:text-slate-400">
                                        Explica por qué la tarea está siendo {motivoModal.tipo === 'rechazo' ? 'rechazada' : 'bloqueada'}.
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleMotivoCancel}
                                className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                                    Motivo detallado:
                                </label>
                                <textarea
                                    value={motivoTexto}
                                    onChange={(e) => setMotivoTexto(e.target.value)}
                                    placeholder="Describe el motivo..."
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 resize-none transition-all"
                                    rows={4}
                                    autoFocus
                                />
                            </div>

                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/30 rounded-lg p-3">
                                <p className="text-xs text-amber-700 dark:text-amber-400 flex items-start gap-2">
                                    <Info size={14} className="shrink-0 mt-0.5" />
                                    <span>Este motivo se guardará en el historial y será visible para el creador de la tarea.</span>
                                </p>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <button
                                onClick={handleMotivoCancel}
                                className="px-4 py-2.5 text-sm font-medium text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-700 rounded-xl transition-all"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleMotivoSubmit}
                                disabled={!motivoTexto.trim()}
                                className="px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed rounded-xl transition-all shadow-sm shadow-red-500/20"
                            >
                                {motivoModal.tipo === 'rechazo' ? 'Confirmar Rechazo' : 'Confirmar Bloqueo'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        )}
        </div>
        
    );

}
