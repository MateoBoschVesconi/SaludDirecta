import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Clock, FileText, CheckCircle2, Calendar, ArrowRight, XCircle, AlertTriangle } from 'lucide-react';
import { updateAppointmentStatus } from '../../api/appointmentService';

const DEFAULT_APPOINTMENTS = [
  {
    id: 'TUR-839210',
    professionalName: 'Lic. Mateo Gómez',
    specialty: 'Kinesiología y Fisiatría',
    planTitle: 'Consulta Individual',
    date: '2026-11-05',
    time: '09:00 hs',
    price: 25000,
    status: 'confirmado',
    paidAt: '2026-11-01T14:30:00Z',
    paymentId: 'MP-849120',
  }
];

export default function MyAppointmentsPage() {
  const [searchParams] = useSearchParams();
  const justBooked = searchParams.get('exito') === 'true';

  const [appointments, setAppointments] = useState(() => {
    try {
      const saved = localStorage.getItem('salud_directa_turnos');
      if (saved) {
        return JSON.parse(saved);
      }
      localStorage.setItem('salud_directa_turnos', JSON.stringify(DEFAULT_APPOINTMENTS));
      return DEFAULT_APPOINTMENTS;
    } catch {
      return DEFAULT_APPOINTMENTS;
    }
  });

  const [notification, setNotification] = useState('');

  // Máquina de estados visual (Criterio 2 - HU9)
  const getStatusBadge = (status) => {
    switch (status) {
      case 'solicitado':
        return (
          <span className="bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold px-2.5 py-1 rounded-full flex items-center gap-1">
            <Clock className="w-3 h-3" aria-hidden="true" /> Solicitado / Pendiente
          </span>
        );
      case 'confirmado':
        return (
          <span className="badge-success text-[11px]">
            <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> Confirmado y Pagado
          </span>
        );
      case 'cumplido':
        return (
          <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-300 flex items-center gap-1">
            <CheckCircle2 className="w-3 h-3 text-slate-500" aria-hidden="true" /> Consulta Cumplida
          </span>
        );
      case 'cancelado':
        return (
          <span className="bg-red-100 text-red-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-red-300 flex items-center gap-1">
            <XCircle className="w-3 h-3" aria-hidden="true" /> Cancelado
          </span>
        );
      case 'ausente':
        return (
          <span className="bg-rose-100 text-rose-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-rose-300 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Ausente sin aviso
          </span>
        );
      default:
        return <span className="bg-sky-100 text-sky-800 text-[11px] font-semibold px-2.5 py-1 rounded-full">{status}</span>;
    }
  };

  const handleCancelAppointment = async (appt) => {
    if (appt.status !== 'confirmado' && appt.status !== 'solicitado') {
      alert('Este turno no puede ser cancelado en su estado actual.');
      return;
    }

    if (confirm(`¿Estás seguro de que deseás cancelar el turno del ${appt.date} a las ${appt.time}? Se liberará el horario inmediatamente.`)) {
      try {
        await updateAppointmentStatus(appt.id, 'cancelado');
        setAppointments((prev) =>
          prev.map((item) => (item.id === appt.id ? { ...item, status: 'cancelado' } : item))
        );
        setNotification('El turno fue cancelado y el horario quedó disponible para otros pacientes.');
        setTimeout(() => setNotification(''), 4500);
      } catch (err) {
        alert(err.message || 'Error al cancelar el turno.');
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto mt-6 px-4 pb-16 animate-in fade-in duration-300">
      {justBooked && (
        <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 mb-6 flex items-start gap-3 text-emerald-900 shadow-sm animate-in slide-in-from-top-3">
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div>
            <h2 className="font-bold text-sm">¡Turno reservado y pago acreditado con éxito!</h2>
            <p className="text-xs text-emerald-800 mt-0.5">
              Te enviamos una notificación a tu casilla de correo y celular registrado con los detalles del turno y acceso al consultorio.
            </p>
          </div>
        </div>
      )}

      {notification && (
        <div className="bg-sky-50 border border-sky-300 rounded-xl p-4 mb-6 text-xs text-sky-900 font-semibold flex items-center gap-2 animate-in fade-in" role="status">
          <CheckCircle2 className="w-4 h-4 text-primary-dark" aria-hidden="true" />
          <span>{notification}</span>
        </div>
      )}

      <div className="flex items-center justify-between mb-6 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Mis Turnos</h1>
          <p className="text-sm text-text-muted">Historial y próximas consultas programadas</p>
        </div>
        <Link
          to="/"
          className="text-xs font-semibold text-primary-dark hover:text-sky-900 flex items-center gap-1 border border-primary-light bg-sky-50 px-3 py-2 rounded-lg transition-colors"
        >
          Nuevo Turno <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
        </Link>
      </div>

      {appointments.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="w-10 h-10 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-bold text-text-main mb-1">No tenés turnos activos</h2>
          <p className="text-sm text-text-muted mb-4">Buscá un profesional de tu interés y reservá en minutos.</p>
          <Link to="/" className="btn-primary max-w-xs mx-auto">
            Buscar Profesionales
          </Link>
        </div>
      ) : (
        <div className="space-y-4" role="feed" aria-label="Historial de turnos">
          {appointments.map((appt) => (
            <div 
              key={appt.id} 
              className={`card border-l-4 transition-all ${
                appt.status === 'cancelado' 
                  ? 'border-l-slate-300 bg-slate-50/60 opacity-80' 
                  : 'border-l-primary-dark hover:shadow-md'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                    {appt.id}
                  </span>
                  {getStatusBadge(appt.status)}
                </div>
                <div className="text-xs text-text-muted">
                  Comprobante: <strong className="text-text-main">{appt.paymentId}</strong>
                </div>
              </div>

              <div className="flex gap-4 items-start">
                <div className="bg-sky-50 text-primary-dark p-3 rounded-xl border border-sky-100 flex-shrink-0">
                  <Clock className="w-6 h-6" aria-hidden="true" />
                </div>
                <div className="flex-1">
                  <h2 className="font-bold text-lg text-text-main">
                    {appt.date} · {appt.time}
                  </h2>
                  <p className="text-sm text-text-main font-semibold mt-0.5">
                    {appt.professionalName} <span className="font-normal text-text-muted">· {appt.specialty}</span>
                  </p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Modalidad: {appt.planTitle} · Monto abonado: <strong className="text-text-main font-semibold">$ {appt.price.toLocaleString('es-AR')}</strong>
                  </p>

                  <div className="mt-4 pt-3 border-t border-borderSubtle flex flex-wrap items-center gap-4 text-xs">
                    <button
                      type="button"
                      onClick={() => alert(`Descargando comprobante oficial ${appt.paymentId} (PDF)...`)}
                      className="text-primary-dark hover:text-sky-900 font-semibold flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary-dark p-1 rounded"
                    >
                      <FileText className="w-4 h-4" aria-hidden="true" /> Descargar Comprobante Oficial
                    </button>

                    {(appt.status === 'confirmado' || appt.status === 'solicitado') && (
                      <>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => handleCancelAppointment(appt)}
                          className="text-medical-error hover:text-red-700 font-semibold focus-visible:ring-2 focus-visible:ring-medical-error p-1 rounded transition-colors"
                        >
                          Cancelar Turno
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
