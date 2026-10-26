import React from 'react';
import { Plus } from 'lucide-react';

export default function Header() {
  return (
    <header className="bg-white border-b border-borderSubtle sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="text-primary font-bold text-2xl flex items-center">
            <Plus className="w-6 h-6 mr-1" strokeWidth={3} />
            SALUD<span className="font-medium text-text-main">DIRECTA</span>
          </div>
          <span className="hidden md:inline-block ml-4 text-sm text-gray-500 border-l border-borderSubtle pl-4">
            Sistema de Telemedicina y Turnos Particulares
          </span>
        </div>
        <div className="flex gap-4 text-sm font-medium">
          <button className="text-primary hover:text-sky-700 transition-colors">Soy Profesional</button>
          <button className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-sky-700 transition-colors shadow-sm">
            Iniciar Sesión
          </button>
        </div>
      </div>
    </header>
  );
}
