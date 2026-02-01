import { useState, useEffect } from 'react';
import { supabase } from '../../supabaseClient';
import {
    Search,
    Edit2,
    CheckCircle,
    XCircle,
    User,
    Shield,
    Briefcase,
    Mail,
    Phone,
    Calendar,
    DollarSign,
    Users,
    UserCheck,
    X,
    AlertTriangle,
    Filter, // IMPORTANTE: Agregamos el icono de filtro
    ChevronDown,
    Trash2
} from 'lucide-react';
import { Spinner, Button, TextInput, Select, Label } from 'flowbite-react';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

// --- INTERFACES ---
interface Rol {
    id: string;
    nombre: string;
}

interface Departamento {
    id: string;
    nombre: string;
}

interface Usuario {
    id: string;
    nombre_completo: string;
    email: string;
    telefono: string | null;
    avatar_url: string | null;
    rol_id: string;
    departamento_id: string | null;
    es_manager: boolean;
    salario_base: number;
    activo: boolean;
    fecha_ingreso: string;
    roles?: { nombre: string };
    departamentos?: { nombre: string };
}

interface Notification {
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'warning';
}

export default function Usuarios() {
    // --- ESTADOS ---
    const [usuarios, setUsuarios] = useState<Usuario[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [departamentos, setDepartamentos] = useState<Departamento[]>([]);

    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    // 1. NUEVO ESTADO PARA EL FILTRO
    const [selectedDept, setSelectedDept] = useState('');

    // Estados para paginación
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(10);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<Usuario | null>(null);
    const [notification, setNotification] = useState<Notification>({ show: false, message: "", type: 'success' });

    const managerRole = roles.find(r => r.nombre.toLowerCase().includes('manager'));

    const handleDeleteUser = async (user: Usuario) => {
        MySwal.fire({
            title: <p className="text-2xl font-bold text-slate-800 dark:text-white">¿Eliminar usuario?</p>,
            html: (
                <div className="text-left space-y-2 text-slate-600 dark:text-slate-400">
                    <p>Estás a punto de eliminar a <b>{user.nombre_completo}</b>.</p>
                    <p className="text-red-500 font-semibold">⚠️ Esta acción eliminará permanentemente:</p>
                    <ul className="list-disc ml-6 text-sm">
                        <li>Tareas asignadas y creadas</li>
                        <li>Comentarios y adjuntos</li>
                        <li>Registros de rendimiento y salarios</li>
                        <li>Notificaciones</li>
                    </ul>
                    <p className="mt-4 italic">El usuario deberá ser invitado y registrarse nuevamente para acceder.</p>
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
                    setLoading(true);

                    // Eliminación en la tabla pública
                    const { error } = await supabase
                        .from('usuarios')
                        .delete()
                        .eq('id', user.id);

                    if (error) throw error;

                    setUsuarios(prev => prev.filter(u => u.id !== user.id));

                    MySwal.fire({
                        title: '¡Eliminado!',
                        text: 'El registro ha sido borrado. El usuario debe registrarse nuevamente para volver a ingresar.',
                        icon: 'success',
                        timer: 4000,
                        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                    });

                } catch (error: any) {
                    console.error('Error:', error);
                    MySwal.fire({
                        title: 'Error',
                        text: 'No se pudo eliminar al usuario. Asegúrate de que no sea manager activo de un departamento.',
                        icon: 'error',
                        background: document.documentElement.classList.contains('dark') ? '#1e293b' : '#ffffff',
                    });
                } finally {
                    setLoading(false);
                }
            }
        });
    };

    const initialFormState = {
        email: '',
        nombre_completo: '',
        telefono: '',
        rol_id: '',
        departamento_id: '',
        salario_base: 0,
        es_manager: false,
        activo: true,
        fecha_ingreso: new Date().toISOString().split('T')[0]
    };

    const [formData, setFormData] = useState(initialFormState);

    useEffect(() => {
        fetchData();
    }, []);

    const showToast = (message: string, type: 'success' | 'error' | 'warning') => {
        setNotification({ show: true, message, type });
        setTimeout(() => {
            setNotification(prev => ({ ...prev, show: false }));
        }, 3500);
    };

    const fetchData = async () => {
        try {
            setLoading(true);
            const { data: usersData, error: usersError } = await supabase
                .from('usuarios')
                .select(`
                    *,
                    roles:rol_id ( id, nombre ),
                    departamentos:departamento_id ( id, nombre )
                `)
                .order('created_at', { ascending: false });

            if (usersError) throw usersError;

            const { data: rolesData } = await supabase.from('roles').select('*');
            const { data: deptsData } = await supabase.from('departamentos').select('*');

            setUsuarios(usersData || []);
            setRoles(rolesData || []);
            setDepartamentos(deptsData || []);

        } catch (error) {
            console.error('Error cargando datos:', error);
            showToast("Error al cargar la lista de usuarios", "error");
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (user?: Usuario) => {
        if (user) {
            setEditingUser(user);
            setFormData({
                email: user.email,
                nombre_completo: user.nombre_completo,
                telefono: user.telefono || '',
                rol_id: user.rol_id,
                departamento_id: user.departamento_id || '',
                salario_base: user.salario_base || 0,
                es_manager: user.es_manager || false,
                activo: user.activo || true,
                fecha_ingreso: user.fecha_ingreso
            });
        } else {
            setEditingUser(null);
            setFormData(initialFormState);
        }
        setIsModalOpen(true);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.es_manager && !formData.departamento_id) {
            showToast("Un Manager debe tener un departamento asignado", "error");
            return;
        }

        try {
            const usuarioPayload = {
                nombre_completo: formData.nombre_completo,
                telefono: formData.telefono || null,
                rol_id: formData.rol_id,
                departamento_id: formData.departamento_id || null,
                salario_base: formData.salario_base,
                es_manager: formData.es_manager,
                activo: formData.activo,
                fecha_ingreso: formData.fecha_ingreso
            };

            if (editingUser) {
                const { error } = await supabase
                    .from('usuarios')
                    .update(usuarioPayload)
                    .eq('id', editingUser.id);

                if (error) throw error;
                showToast("Usuario actualizado correctamente", "success");
            } else {
                showToast("Para crear usuarios, usa el módulo de Invitaciones.", "warning");
                return;
            }

            await fetchData();
            setIsModalOpen(false);
        } catch (error: any) {
            console.error('Error al guardar:', error);
            showToast(`Error: ${error.message || "Error al guardar los cambios"}`, "error");
        }
    };

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('usuarios')
                .update({ activo: !currentStatus })
                .eq('id', id);

            if (error) throw error;

            setUsuarios(prev => prev.map(u => u.id === id ? { ...u, activo: !currentStatus } : u));
            showToast(
                !currentStatus ? "Usuario activado exitosamente" : "Usuario desactivado",
                !currentStatus ? "success" : "warning"
            );
        } catch (error) {
            console.error('Error cambiando estado:', error);
            showToast("Error al cambiar el estado del usuario", "error");
        }
    };

    // 2. LÓGICA DE FILTRADO ACTUALIZADA
    const filteredUsers = usuarios.filter(user => {
        // Filtro de texto (nombre o email)
        const matchesSearch = user.nombre_completo.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        // Filtro de departamento
        const matchesDept = selectedDept === '' || user.departamento_id === selectedDept;

        return matchesSearch && matchesDept;
    });

    // Paginación
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentUsers = filteredUsers.slice(indexOfFirstItem, indexOfLastItem);
    const totalPages = Math.ceil(filteredUsers.length / itemsPerPage);

    // Resetear página actual cuando cambia el filtro
    useEffect(() => {
        setCurrentPage(1);
    }, [searchTerm, selectedDept]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-indigo-950">
                <Spinner size="xl" className="mb-4" />
                <p className="text-slate-600 dark:text-slate-400">Cargando usuarios...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-linear-to-br from-slate-50 via-blue-50 to-indigo-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 p-6 relative overflow-hidden">

            <style>{`
                @keyframes slideDown {
                    0% { transform: translateY(-50px) scale(0.95); opacity: 0; }
                    100% { transform: translateY(0) scale(1); opacity: 1; }
                }
                .modal-animate-enter {
                    animation: slideDown 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards;
                }
                @keyframes slideInRight {
                    0% { transform: translateX(100%); opacity: 0; }
                    100% { transform: translateX(0); opacity: 1; }
                }
                .toast-enter {
                    animation: slideInRight 0.3s ease-out forwards;
                }
            `}</style>

            {notification.show && (
                <div className="fixed top-5 right-5 z-100 toast-enter">
                    <div className={`flex items-center gap-3 px-6 py-4 rounded-lg shadow-2xl border-l-4 backdrop-blur-md
                        ${notification.type === 'error'
                            ? 'bg-orange-500/90 text-white border-orange-700'
                            : notification.type === 'warning'
                                ? 'bg-yellow-400/90 text-slate-900 border-yellow-600'
                                : 'bg-green-500/90 text-white border-green-700'
                        }
                    `}>
                        {notification.type === 'error' || notification.type === 'warning' ? (
                            <AlertTriangle className="h-6 w-6" />
                        ) : (
                            <CheckCircle className="h-6 w-6" />
                        )}
                        <div>
                            <h4 className="font-bold text-sm uppercase tracking-wider">
                                {notification.type === 'error' ? 'Error' : notification.type === 'warning' ? 'Atención' : 'Éxito'}
                            </h4>
                            <p className="text-sm font-medium opacity-95">{notification.message}</p>
                        </div>
                        <button onClick={() => setNotification({ ...notification, show: false })} className="ml-4 hover:opacity-70">
                            <X size={18} />
                        </button>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto">
                <div className="mb-8 backdrop-blur-xl bg-white/70 dark:bg-slate-800/70 rounded-2xl shadow-xl border border-white/20 dark:border-slate-700/50 p-8">
                    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-linear-to-br from-indigo-400 to-blue-800 rounded-2xl shadow-lg">
                                <Users className="h-8 w-8 text-white" />
                            </div>
                            <div>
            <h1 className="
  text-2xl sm:text-3xl lg:text-4xl font-bold
  bg-gradient-to-r from-indigo-600 to-blue-800
  bg-clip-text text-transparent
  dark:bg-gradient-to-r dark:from-indigo-300 dark:via-blue-200 dark:to-purple-300
  dark:text-transparent
">                                    Gestión de Usuarios
                                </h1>
                                <p className="text-slate-600 dark:text-slate-400 mt-1 flex items-center gap-2">
                                    Administra el acceso, roles y departamentos del personal
                                </p>
                            </div>
                        </div>


                    </div>

                    {/* ESTADÍSTICAS (Mismo código que antes...) */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Total Usuarios */}
                        <div className="backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 rounded-2xl p-5 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Total Usuarios</p>
                                    <p className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">{usuarios.length}</p>
                                </div>
                                <div className="p-4 bg-linear-to-br from-indigo-500 to-blue-500 rounded-xl shadow-lg">
                                    <Users className="text-white" size={28} />
                                </div>
                            </div>
                        </div>
                        {/* Usuarios Activos */}
                        <div className="backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 rounded-2xl p-5 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Usuarios Activos</p>
                                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                                        {usuarios.filter(u => u.activo).length}
                                    </p>
                                </div>
                                <div className="p-4 bg-linear-to-br from-green-500 to-emerald-500 rounded-xl shadow-lg">
                                    <CheckCircle className="text-white" size={28} />
                                </div>
                            </div>
                        </div>
                        {/* Managers */}
                        <div className="backdrop-blur-xl bg-white/60 dark:bg-slate-800/60 rounded-2xl p-5 shadow-lg border border-white/20 dark:border-slate-700/50 hover:shadow-xl transition-all duration-300 hover:scale-[1.02]">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">Managers</p>
                                    <p className="text-3xl font-bold text-purple-600 dark:text-purple-400">
                                        {usuarios.filter(u => u.es_manager).length}
                                    </p>
                                </div>
                                <div className="p-4 bg-linear-to-br from-purple-500 to-pink-500 rounded-xl shadow-lg">
                                    <Shield className="text-white" size={28} />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* 3. BARRA DE BÚSQUEDA Y FILTRO */}
                <div className="mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">

                    {/* Buscador: Usa flex-1 para ocupar el espacio disponible */}
                    <div className="relative w-full md:flex-1 group">
                        <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                            <Search className="h-5 w-5 text-indigo-400 group-focus-within:text-indigo-600 transition" />
                        </div>
                        <input
                            type="text"
                            className="pl-12 w-full h-12 rounded-xl
    border border-slate-200 dark:border-slate-700
    bg-white dark:bg-slate-800
    text-sm leading-none
    focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 dark:focus:ring-indigo-900/50
    transition-all shadow-sm hover:shadow-md
    dark:text-white placeholder:text-slate-400"
                            placeholder="Buscar por nombre o email..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />

                    </div>


                    {/* Filtro por Departamento */}
                    <div className="relative w-full md:w-72 group">
  <Select
    value={selectedDept}
    onChange={(e) => setSelectedDept(e.target.value)}
    className="rounded-xl"
  >
    <option value="">Todos los Departamentos</option>
    {departamentos.map(dept => (
      <option key={dept.id} value={dept.id}>
        {dept.nombre}
      </option>
    ))}
  </Select>
</div>

                </div>

                {/* TABLA CON CARDS RESPONSIVAS */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                    {/* Vista Desktop */}
                    <div className="hidden lg:block overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-linear-to-r from-indigo-50 to-blue-50 dark:from-slate-900 dark:to-indigo-950 border-b-2 border-indigo-100 dark:border-indigo-900">
                                <tr>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Usuario
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Rol
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Departamento
                                    </th>
                                    <th className="px-6 py-4 text-left text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Estado
                                    </th>
                                    <th className="px-6 py-4 text-right text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                        Acciones
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                                {currentUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-linear-to-r hover:from-indigo-50/50 hover:to-blue-50/50 dark:hover:from-slate-700/50 dark:hover:to-indigo-900/30 transition-all duration-200">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center space-x-4">
                                                {user.avatar_url ? (
                                                    <img className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-100 dark:ring-indigo-900" src={user.avatar_url} alt="" />
                                                ) : (
                                                    <div className="h-12 w-12 rounded-full bg-linear-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
                                                        <User size={20} className="text-white" />
                                                    </div>
                                                )}
                                                <div>
                                                    <div className="font-semibold text-slate-900 dark:text-white">{user.nombre_completo}</div>
                                                    <div className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                                                        <Mail size={12} />
                                                        {user.email}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                                                    <Shield size={16} className="text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <span className="font-medium text-slate-700 dark:text-slate-300">
                                                    {user.roles?.nombre || 'Sin Rol'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="p-2 bg-slate-100 dark:bg-slate-700 rounded-lg">
                                                    <Briefcase size={16} className="text-slate-600 dark:text-slate-400" />
                                                </div>
                                                <span className="text-slate-700 dark:text-slate-300">
                                                    {user.departamentos?.nombre || 'General'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <button
                                                onClick={() => toggleStatus(user.id, user.activo)}
                                                className={`flex items-center gap-2 px-4 py-2 rounded-xl font-medium transition-all duration-300 shadow-sm hover:shadow-md transform hover:scale-105 ${user.activo
                                                    ? 'bg-linear-to-r from-green-500 to-emerald-500 text-white hover:from-green-600 hover:to-emerald-600'
                                                    : 'bg-linear-to-r from-red-500 to-rose-500 text-white hover:from-red-600 hover:to-rose-600'
                                                    }`}
                                            >
                                                {user.activo ? <CheckCircle size={14} /> : <XCircle size={14} />}
                                                {user.activo ? 'Activo' : 'Inactivo'}
                                            </button>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex justify-end gap-2">
                                                <button
                                                    onClick={() => handleOpenModal(user)}
                                                    className="p-3 text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:hover:bg-indigo-900/50 rounded-xl transition-all"
                                                    title="Editar"
                                                >
                                                    <Edit2 size={18} />
                                                </button>

                                                <button
                                                    onClick={() => handleDeleteUser(user)}
                                                    className="p-3 text-red-600 hover:text-white bg-red-50 hover:bg-red-600 dark:bg-red-900/30 dark:hover:bg-red-700 rounded-xl transition-all"
                                                    title="Eliminar permanentemente"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {/* Vista Mobile - Cards */}
                    <div className="lg:hidden divide-y divide-slate-200 dark:divide-slate-700">
                        {currentUsers.map((user) => (
                            <div key={user.id} className="p-4 hover:bg-indigo-50/50 dark:hover:bg-slate-700/50 transition-all duration-200">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center space-x-3">
                                        {user.avatar_url ? (
                                            <img className="h-12 w-12 rounded-full object-cover ring-2 ring-indigo-100" src={user.avatar_url} alt="" />
                                        ) : (
                                            <div className="h-12 w-12 rounded-full bg-linear-to-br from-indigo-500 to-blue-500 flex items-center justify-center shadow-lg">
                                                <User size={20} className="text-white" />
                                            </div>
                                        )}
                                        <div>
                                            <div className="font-semibold text-slate-900 dark:text-white">{user.nombre_completo}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400">{user.email}</div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleOpenModal(user)}
                                            className="p-2 text-indigo-600 bg-indigo-50 rounded-lg"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteUser(user)}
                                            className="p-2 text-red-600 bg-red-50 rounded-lg"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2 text-sm">
                                    <div className="flex items-center gap-2">
                                        <Shield size={14} className="text-indigo-500" />
                                        <span className="text-slate-600 dark:text-slate-400">Rol:</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{user.roles?.nombre || 'Sin Rol'}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Briefcase size={14} className="text-slate-500" />
                                        <span className="text-slate-600 dark:text-slate-400">Depto:</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{user.departamentos?.nombre || 'General'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 pt-2">
                                        <button
                                            onClick={() => toggleStatus(user.id, user.activo)}
                                            className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-medium text-xs ${user.activo
                                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                                : 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400'
                                                }`}
                                        >
                                            {user.activo ? <CheckCircle size={12} /> : <XCircle size={12} />}
                                            {user.activo ? 'Activo' : 'Inactivo'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Paginación */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-200 dark:border-slate-700">
                            <div className="text-sm text-slate-600 dark:text-slate-400">
                                Mostrando {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredUsers.length)} de {filteredUsers.length} usuarios
                            </div>
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Anterior
                                </button>
                                <span className="px-4 py-1 text-sm font-medium text-slate-900 dark:text-white bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-700 rounded-md">
                                    {currentPage} de {totalPages}
                                </span>
                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="px-3 py-1 text-sm font-medium text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-md hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    Siguiente
                                </button>
                            </div>
                        </div>
                    )}

                    {filteredUsers.length === 0 && !loading && (
                        <div className="p-12 text-center">
                            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-700 mb-4">
                                <Search className="h-8 w-8 text-slate-400" />
                            </div>
                            <p className="text-slate-500 dark:text-slate-400 font-medium">
                                No se encontraron usuarios
                            </p>
                            <p className="text-slate-400 dark:text-slate-500 text-sm mt-1">
                                Intenta con otros términos de búsqueda o cambia el filtro
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* --- MODAL (CÓDIGO IDÉNTICO AL ANTERIOR) --- */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm">
                    <div className="relative w-full max-w-[95vw] md:max-w-4xl 
                bg-white dark:bg-slate-900 rounded-2xl shadow-2xl 
                max-h-[95vh] overflow-y-auto scrollbar-hide modal-animate-enter">

                        <div className="relative bg-linear-to-r from-indigo-100 to-blue-800 px-6 py-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-white/20 rounded-lg backdrop-blur-sm">
                                        <UserCheck className="h-6 w-6 text-black" />
                                    </div>
                                    {editingUser && (
                                        <h2 className="text-2xl font-bold text-black">
                                            Editar Usuario
                                        </h2>
                                    )}
                                </div>

                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="bg-white/20 hover:bg-white/30 text-white p-1 rounded-full transition"
                                >
                                    <X size={20} />
                                </button>
                            </div>
                        </div>

                        <div className="p-8">
                            <form onSubmit={handleSave} className="space-y-10">
                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold pb-2 border-b border-slate-300/40 dark:border-slate-700">
                                        <User size={18} className="text-indigo-600" />
                                        <span>Información Personal</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="nombre" className="flex items-center gap-2 mb-2">
                                                <User size={14} /> Nombre Completo
                                            </Label>
                                            <TextInput
                                                id="nombre"
                                                value={formData.nombre_completo}
                                                onChange={(e) => setFormData({ ...formData, nombre_completo: e.target.value })}
                                                required
                                                className="rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="email" className="flex items-center gap-2 mb-2">
                                                <Mail size={14} /> Email
                                            </Label>
                                            <TextInput
                                                id="email"
                                                type="email"
                                                disabled={!!editingUser}
                                                value={formData.email}
                                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                                required
                                                className="rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="telefono" className="flex items-center gap-2 mb-2">
                                                <Phone size={14} /> Teléfono
                                            </Label>
                                            <TextInput
                                                id="telefono"
                                                value={formData.telefono}
                                                onChange={(e) => setFormData({ ...formData, telefono: e.target.value })}
                                                className="rounded-xl"
                                            />
                                        </div>

                                        <div>
                                            <Label htmlFor="ingreso" className="flex items-center gap-2 mb-2">
                                                <Calendar size={14} /> Fecha Ingreso
                                            </Label>
                                            <TextInput
                                                type="date"
                                                id="ingreso"
                                                value={formData.fecha_ingreso}
                                                onChange={(e) => setFormData({ ...formData, fecha_ingreso: e.target.value })}
                                                required
                                                className="rounded-xl"
                                            />
                                        </div>
                                    </div>
                                </section>

                                <section className="space-y-4">
                                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-semibold pb-2 border-b border-slate-300/40 dark:border-slate-700">
                                        <Briefcase size={18} className="text-indigo-600" />
                                        <span>Configuración de Empleado</span>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <Label htmlFor="rol" className="flex items-center gap-2 mb-2">
                                                <Shield size={14} /> Rol del Sistema
                                            </Label>
                                            <Select
                                                id="rol"
                                                value={formData.rol_id}
                                                disabled={formData.es_manager && managerRole && formData.rol_id === managerRole.id}
                                                onChange={(e) => {
                                                    const selectedRoleId = e.target.value;
                                                    const isManagerSelected = managerRole && selectedRoleId === managerRole.id;

                                                    setFormData(prev => ({
                                                        ...prev,
                                                        rol_id: selectedRoleId,
                                                        es_manager: !!isManagerSelected
                                                    }));
                                                }}
                                                required
                                                className="rounded-xl disabled:opacity-70 disabled:bg-slate-100 dark:disabled:bg-slate-800"
                                            >
                                                <option value="" disabled>Seleccionar Rol</option>
                                                {roles.map((rol) => (
                                                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                                                ))}
                                            </Select>
                                            {formData.es_manager && (
                                                <span className="text-xs text-indigo-600 mt-1 block">
                                                    * Para cambiar el rol, primero desactiva la opción "Es Manager" abajo.
                                                </span>
                                            )}
                                        </div>

                                        <div>
                                            <Label htmlFor="depto" className="flex items-center gap-2 mb-2">
                                                <Briefcase size={14} /> Departamento - Ejerce
                                            </Label>
                                            <Select
                                                id="depto"
                                                value={formData.departamento_id}
                                                onChange={(e) => {
                                                    const newDeptId = e.target.value;
                                                    setFormData(prev => ({
                                                        ...prev,
                                                        departamento_id: newDeptId,
                                                        es_manager: newDeptId === "" ? false : prev.es_manager
                                                    }));
                                                }}
                                                className="rounded-xl"
                                            >
                                                <option value="">Sin Departamento</option>
                                                {departamentos.map((d) => (
                                                    <option key={d.id} value={d.id}>{d.nombre}</option>
                                                ))}
                                            </Select>
                                        </div>

                                        <div>
                                            <Label htmlFor="salario" className="flex items-center gap-2 mb-2">
                                                <DollarSign size={14} /> Salario Base ($)
                                            </Label>
                                            <TextInput
                                                type="number"
                                                id="salario"
                                                value={formData.salario_base}
                                                onChange={(e) =>
                                                    setFormData({ ...formData, salario_base: parseFloat(e.target.value) })
                                                }
                                                className="rounded-xl"
                                            />
                                        </div>

                                        <div className="flex flex-col gap-4">
                                            <div className={`p-4 rounded-xl border transition-colors duration-200 
                                                ${!formData.departamento_id
                                                    ? 'bg-slate-100 border-slate-200 opacity-60 cursor-not-allowed'
                                                    : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-700'
                                                }`}>
                                                <label className={`flex items-center gap-3 ${!formData.departamento_id ? 'cursor-not-allowed' : 'cursor-pointer'}`}>
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 disabled:text-gray-400"
                                                        disabled={!formData.departamento_id}
                                                        checked={formData.es_manager}
                                                        onChange={(e) => {
                                                            const isChecked = e.target.checked;
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                es_manager: isChecked,
                                                                rol_id: isChecked && managerRole ? managerRole.id : prev.rol_id
                                                            }));
                                                        }}
                                                    />
                                                    <div>
                                                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                            Es Manager de algun Departamento
                                                        </span>
                                                        <span className="block text-xs text-slate-500">
                                                            {!formData.departamento_id
                                                                ? "Selecciona un departamento primero para habilitar."
                                                                : "Asigna automáticamente el Rol de Manager y permisos de gestión."}
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>

                                            <div className="p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-700">
                                                <label className="flex items-center gap-3 cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        className="w-5 h-5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                                                        checked={formData.activo}
                                                        onChange={(e) =>
                                                            setFormData(prev => ({
                                                                ...prev,
                                                                activo: e.target.checked
                                                            }))
                                                        }
                                                    />
                                                    <div>
                                                        <span className="block text-sm font-semibold text-slate-700 dark:text-slate-200">
                                                            Usuario Activo
                                                        </span>
                                                        <span className="block text-xs text-slate-500">
                                                            Permite que el usuario pueda acceder al sistema.
                                                        </span>
                                                    </div>
                                                </label>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                <div className="flex justify-end gap-4 pt-6 border-t border-slate-300/40 dark:border-slate-700">
                                    <Button
                                        color="gray"
                                        onClick={() => setIsModalOpen(false)}
                                        className="rounded-xl"
                                    >
                                        Cancelar
                                    </Button>

                                    <Button
                                        type="submit"
                                        className="rounded-xl bg-linear-to-r from-indigo-400 to-blue-800 hover:from-indigo-700 hover:to-blue-800 shadow-lg"
                                    >
                                        {editingUser ? "Guardar Cambios" : "Crear Usuario"}
                                    </Button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}