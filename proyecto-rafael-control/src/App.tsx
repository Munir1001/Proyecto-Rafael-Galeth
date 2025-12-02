// src/App.tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'

// Páginas temporales (Placeholders)
const Dashboard = () => <h1 className="text-2xl font-bold mb-4">Dashboard Principal 📊</h1>
const Proyectos = () => <h1 className="text-2xl font-bold mb-4">Mis Proyectos 📁</h1>
const Reportes = () => <h1 className="text-2xl font-bold mb-4">Reportes de Rendimiento 📈</h1>
const Perfil = () => <h1 className="text-2xl font-bold mb-4">Mi Perfil 👤</h1>

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Rutas Públicas (como Login) irían aquí fuera del Layout */}
        
        {/* Rutas Privadas (dentro del Layout con Sidebar) */}
        <Route element={<Layout />}>
          <Route path="/" element={<Dashboard />} />
          <Route path="/proyectos" element={<Proyectos />} />
          <Route path="/reportes" element={<Reportes />} />
          <Route path="/perfil" element={<Perfil />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App