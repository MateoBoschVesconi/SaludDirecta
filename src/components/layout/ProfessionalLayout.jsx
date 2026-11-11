import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Calendar, FileText, UserCheck, Package, LogOut, ArrowLeft } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function ProfessionalLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const navItems = [
    { to: '/profesional/dashboard', label: 'Dashboard & Métricas', icon: LayoutDashboard },
    { to: '/profesional/agenda', label: 'Mi Agenda y Franjas', icon: Calendar },
    { to: '/profesional/paquetes', label: 'Paquetes de Sesiones', icon: Package },
    { to: '/profesional/documentacion', label: 'Carga Documental / OCR', icon: FileText },
    { to: '/profesional/matricula', label: 'Matrícula & Honorarios', icon: UserCheck },
  ];

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-canvas">
      {/* Barra lateral / Sidebar */}
      <aside 
        className="w-full md:w-64 bg-white border-r border-borderSubtle flex flex-col justify-between"
        aria-label="Menú del panel profesional"
      >
        <div>
          <div className="p-5 border-b border-borderSubtle flex items-center justify-between">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-dark">Panel Profesional</span>
              <h2 className="font-bold text-text-main text-lg truncate">{user?.nombre || 'Profesional'}</h2>
              <span className="badge-success mt-1 inline-flex text-[11px]">Matrícula Verificada</span>
            </div>
          </div>

          <nav className="p-3 space-y-1" aria-label="Navegación del profesional">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-light text-primary-dark font-semibold'
                        : 'text-text-muted hover:bg-slate-50 hover:text-text-main'
                    }`
                  }
                >
                  <Icon className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  {item.label}
                </NavLink>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-borderSubtle space-y-2">
          <button
            onClick={() => navigate('/')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-text-muted hover:text-text-main rounded-md transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" />
            Volver al Portal Público
          </button>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-medical-error hover:bg-red-50 rounded-md transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" aria-hidden="true" />
            Cerrar Sesión
          </button>
        </div>
      </aside>

      {/* Contenido principal del panel */}
      <main id="professional-main" className="flex-1 p-6 md:p-8 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
