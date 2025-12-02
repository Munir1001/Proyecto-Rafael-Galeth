import { useState, useEffect } from 'react'
import { supabase } from './supabaseClient'
import './App.css'

function App() {
  const [mensaje, setMensaje] = useState('')

  useEffect(() => {
    const fetchDatos = async () => {
      // Ejemplo: Traer datos de una tabla 'prueba' (asegúrate de que exista)
      const { data, error } = await supabase.from('tu_tabla').select('*').limit(1)
      
      if (error) console.error('Error conectando:', error)
      else console.log('Conexión exitosa:', data)
    }
    fetchDatos()
  }, [])

  return (
    <>
      <h1>Vite + React + Supabase</h1>
      <p>Revisa la consola para ver la conexión.</p>
    </>
  )
}

export default App
