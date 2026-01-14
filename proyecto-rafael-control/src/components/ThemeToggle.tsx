import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Sun, Moon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // Solo renderizamos el ícono animado cuando resolvedTheme ya está definido
  const isReady = resolvedTheme !== undefined && resolvedTheme !== null;

  console.log('ThemeToggle render - isReady:', isReady, 'resolvedTheme:', resolvedTheme);

  useEffect(() => {
    if (isReady) {
      console.log('Tema listo:', resolvedTheme);
    }
  }, [isReady, resolvedTheme]);

  const isDark = resolvedTheme === "dark";

  if (!isReady) {
    return (
      <div className="relative p-2.5 rounded-full bg-gray-100 dark:bg-slate-800">
        <Sun size={20} className="text-amber-400 opacity-40" />
      </div>
    );
  }

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="relative p-2.5 rounded-full bg-gray-100 dark:bg-slate-800 hover:scale-105 transition"
      aria-label="Toggle Theme"
      title="Cambiar modo de color"
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: 90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Moon size={20} className="text-indigo-400" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, scale: 0, opacity: 0 }}
            animate={{ rotate: 0, scale: 1, opacity: 1 }}
            exit={{ rotate: -90, scale: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            <Sun size={20} className="text-amber-400" />
          </motion.div>
        )}
      </AnimatePresence>
    </button>
  );
}