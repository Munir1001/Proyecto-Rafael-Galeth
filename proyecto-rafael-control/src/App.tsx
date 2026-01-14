import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Spinner } from 'flowbite-react';
import { ThemeProvider } from "next-themes";

// --- LAYOUTS Y PÁGINAS ---
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from "./pages/Dashboard";
import Reportes from "./pages/Reportes";
import Perfil from './pages/Perfil';

// --- PÁGINAS DE ADMIN ---
import Usuarios from "./pages/Admin/Usuarios";
import Departamentos from "./pages/Admin/Departamentos";
import Roles from "./pages/Admin/Roles";
import Estadostareas from "./pages/Admin/EstadosTarea";
import Prioridades from "./pages/Admin/Prioridades";
import Tarea from "./pages/Tareas";

// --- PÁGINAS DE MANAGER ---
import DepartamentosM from "./pages/Manager/DepartamentosM";

// --- PÁGINAS DE ESTADO (Nuevas y Profesionales) ---
import Unauthorized from './pages/Unauthorized';
import NotFound from './pages/NotFound';
import InactiveAccount from './pages/InactiveAccount'; // <--- IMPORTANTE
import { useTheme } from "next-themes";

// --- CONSTANTES ---
const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  USUARIO: 'Usuario',
};



// --- COMPONENTE DE PROTECCIÓN DE RUTAS ---
interface ProtectedRouteProps {
  allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: ProtectedRouteProps) => {
  const { session, profile, loading } = useAuth();

  // 1. Cargando
  if (loading) {
    return (
      
      <div className="h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-slate-900">
        <Spinner size="xl" aria-label="Cargando sistema..." />
      </div>
    );
  }

  // 2. No hay sesión -> Login
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 3. 🔒 VALIDACIÓN DE CUENTA ACTIVA
  // Si el perfil cargó y la columna 'activo' es false, bloqueamos todo.
  if (profile && profile.activo === false) {
    return <InactiveAccount />;
  }

  // 4. Validación de Roles
  if (allowedRoles && profile) {
    if (!allowedRoles.includes(profile.rol_nombre || '')) {
      return <Unauthorized />;
    }
  }

  // 5. Todo OK -> Mostrar contenido
  return <Outlet />;
};

// --- RUTAS ---
function AppRoutes() {
  return (
    <Routes>
      {/* PÚBLICAS */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* PROTEGIDAS */}
      <Route element={<Layout />}>

        {/* NIVEL 1: Todos (Activos) */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER, ROLES.USUARIO]} />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/tareas" element={<Tarea />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>

        <Route element={<ProtectedRoute allowedRoles={[ROLES.MANAGER]} />}>
          <Route path="/departamentos-manager" element={<DepartamentosM />} />
        </Route>
        
        {/* NIVEL 2: Managers y Admins (Reportes suele ser para ambos) */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN, ROLES.MANAGER]} />}>
          <Route path="/reportes" element={<Reportes />} />
        </Route>

        {/* NIVEL 3: Solo Admins (Configuraciones del sistema) */}
        <Route element={<ProtectedRoute allowedRoles={[ROLES.ADMIN]} />}>
          <Route path="/usuarios" element={<Usuarios />} />
          <Route path="/roles" element={<Roles />} />
          <Route path="/estados-tarea" element={<Estadostareas />} />
          <Route path="/prioridades" element={<Prioridades />} />
          <Route path="/departamentos" element={<Departamentos />} />
        </Route>

        {/* Ruta auxiliar para redirecciones manuales */}
        <Route path="/unauthorized" element={<Unauthorized />} />
      </Route>

      {/* 404 */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

export default function App() {

  return (
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
      <AuthProvider>
        <BrowserRouter>
          <AppRoutes />
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  )
}