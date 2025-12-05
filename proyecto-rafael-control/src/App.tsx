// src/App.tsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import React from 'react';
import { AuthProvider, useAuth } from './context/AuthContext' // Importamos el contexto
import { Spinner } from 'flowbite-react'

// Layout y Páginas
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Login from './pages/Login'
import Register from './pages/Register'

// Placeholders
const Proyectos = () => <h1 className="text-2xl font-bold">Mis Proyectos 📁</h1>
const Reportes = () => <h1 className="text-2xl font-bold">Reportes 📈</h1>
const Perfil = () => <h1 className="text-2xl font-bold">Mi Perfil 👤</h1>

// Componente para proteger rutas privadas
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) return <div className="h-screen flex items-center justify-center"><Spinner size="xl" /></div>;
  
  if (!session) return <Navigate to="/login" />;

  return <>{children}</>; // Envuelve children en fragmento por si acaso
};

function AppRoutes() {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

      {/* Rutas Privadas (Protegidas) */}
      <Route path="/" element={
        <PrivateRoute>
          <Layout />
        </PrivateRoute>
      }>
        <Route index element={<Dashboard />} />
        <Route path="proyectos" element={<Proyectos />} />
        <Route path="reportes" element={<Reportes />} />
        <Route path="perfil" element={<Perfil />} />
      </Route>
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}