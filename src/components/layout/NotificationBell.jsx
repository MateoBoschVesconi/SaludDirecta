import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, Check, Clock, Calendar, AlertCircle } from 'lucide-react';
import { notificacionService } from '../../api/notificacionService';
import { useAuth } from '../../context/AuthContext';

export default function NotificationBell() {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const data = await notificacionService.getMisNotificaciones();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      // Ignorar si falla
    }
  }, [isAuthenticated]);

  useEffect(() => {
    let isMounted = true;
    if (isAuthenticated) {
      notificacionService.getMisNotificaciones().then((data) => {
        if (isMounted) {
          setNotifications(Array.isArray(data) ? data : []);
        }
      });
    }

    // Sondeo periódico cada 45 segundos para nuevos recordatorios automáticos (HU10)
    const interval = setInterval(() => {
      fetchNotifications();
    }, 45000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [isAuthenticated, fetchNotifications]);

  // Cerrar dropdown al hacer click afuera
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const unreadCount = notifications.filter((n) => !n.leida).length;

  const handleMarkAsRead = async (id, e) => {
    e.stopPropagation();
    try {
      await notificacionService.marcarLeida(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, leida: true } : n))
      );
    } catch {
      // Ignorar
    }
  };

  if (!isAuthenticated) return null;

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-slate-100 transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark"
        aria-label={`Notificaciones ${unreadCount > 0 ? `(${unreadCount} no leídas)` : ''}`}
        aria-expanded={isOpen}
      >
        <Bell className="w-5 h-5" aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div 
          className="absolute right-0 mt-2 w-80 sm:w-96 rounded-xl bg-white shadow-xl border border-borderSubtle py-2 z-50 animate-in fade-in slide-in-from-top-2"
          role="region"
          aria-label="Panel de Notificaciones"
        >
          <div className="flex items-center justify-between px-4 py-2 border-b border-borderSubtle">
            <h3 className="text-sm font-bold text-text-main flex items-center gap-1.5">
              <Bell className="w-4 h-4 text-primary-dark" aria-hidden="true" />
              Notificaciones y Recordatorios
            </h3>
            {unreadCount > 0 && (
              <span className="text-[11px] font-semibold text-primary-dark bg-sky-50 px-2 py-0.5 rounded-full border border-sky-200">
                {unreadCount} nuevas
              </span>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto divide-y divide-borderSubtle">
            {notifications.length === 0 ? (
              <div className="p-6 text-center text-xs text-text-muted">
                <Calendar className="w-8 h-8 text-slate-300 mx-auto mb-2" aria-hidden="true" />
                No tenés notificaciones pendientes
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-3 transition-colors ${
                    item.leida ? 'bg-white opacity-75' : 'bg-sky-50/50'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <div className="mt-0.5 flex-shrink-0">
                        {item.tipo?.includes('recordatorio') ? (
                          <Clock className="w-4 h-4 text-amber-600" aria-hidden="true" />
                        ) : item.tipo?.includes('cancelado') ? (
                          <AlertCircle className="w-4 h-4 text-medical-error" aria-hidden="true" />
                        ) : (
                          <Calendar className="w-4 h-4 text-primary-dark" aria-hidden="true" />
                        )}
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-text-main">
                          {item.asunto || 'Aviso de Turno'}
                        </h4>
                        <p className="text-xs text-text-muted mt-0.5 leading-snug">
                          {item.mensaje}
                        </p>
                        <span className="text-[10px] text-slate-400 mt-1 block">
                          {item.creadoEn ? new Date(item.creadoEn).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' }) : 'Reciente'}
                        </span>
                      </div>
                    </div>

                    {!item.leida && (
                      <button
                        type="button"
                        onClick={(e) => handleMarkAsRead(item.id, e)}
                        className="text-[11px] text-primary-dark hover:text-sky-900 font-semibold p-1 rounded hover:bg-white flex items-center gap-0.5 flex-shrink-0"
                        title="Marcar como leída"
                      >
                        <Check className="w-3.5 h-3.5" aria-hidden="true" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
