import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus, User, LogOut, Calendar, Stethoscope } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function Navbar() {
  const { user, isAuthenticated, logout, isProfessional } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="bg-white border-b border-borderSubtle sticky top-0 z-30" role="banner">
      <div className="max-w-6xl mx-auto px-4 py-3.5 flex items-center justify-between">
        {/* Logo accesible */}
        <Link 
          to="/" 
          className="flex items-center gap-2 group rounded-md p-1 focus-visible:ring-2 focus-visible:ring-primary-dark"
          aria-label="Salud Directa - Ir a la página de inicio"
        >
          <div className="text-primary-dark font-extrabold text-2xl flex items-center tracking-tight">
            <span className="bg-primary-dark text-white p-1 rounded-md mr-1.5 flex items-center justify-center">
              <Plus className="w-5 h-5" strokeWidth={3} aria-hidden="true" />
            </span>
            SALUD<span className="font-semibold text-text-main ml-0.5">DIRECTA</span>
          </div>
          <span className="hidden lg:inline-block ml-3 text-xs text-text-muted border-l border-borderSubtle pl-3 font-medium">
            Atención Particular & Matrículas Verificadas
          </span>
        </Link>

        {/* Navegación y Acciones */}
        <nav aria-label="Navegación principal" className="flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3">
              {isProfessional ? (
                <Link
                  to="/profesional/dashboard"
                  className={`text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                    location.pathname.startsWith('/profesional') 
                      ? 'bg-primary-light text-primary-dark font-semibold' 
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  <Stethoscope className="w-4 h-4" aria-hidden="true" />
                  Panel Profesional
                </Link>
              ) : (
                <Link
                  to="/mis-turnos"
                  className={`text-sm font-medium px-3 py-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                    location.pathname === '/mis-turnos' 
                      ? 'bg-primary-light text-primary-dark font-semibold' 
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  <Calendar className="w-4 h-4" aria-hidden="true" />
                  Mis Turnos
                </Link>
              )}

              <span className="hidden sm:inline-flex items-center text-xs font-medium text-text-muted bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
                <User className="w-3.5 h-3.5 mr-1" aria-hidden="true" />
                {user?.nombre || user?.email}
              </span>

              <button
                onClick={handleLogout}
                className="text-text-muted hover:text-medical-error text-sm font-medium px-2.5 py-2 rounded-lg transition-colors flex items-center gap-1"
                aria-label="Cerrar sesión"
              >
                <LogOut className="w-4 h-4" aria-hidden="true" />
                <span className="hidden md:inline">Salir</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/registro?rol=profesional"
                className="text-primary-dark hover:text-sky-900 text-sm font-semibold px-3 py-2 rounded-lg transition-colors"
              >
                Soy Profesional
              </Link>
              <Link
                to="/login"
                className="bg-primary-dark text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-sky-800 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-dark"
              >
                Iniciar Sesión
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  );
}

