import React, { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Clock, FileText, CheckCircle2, Calendar, ArrowRight } from 'lucide-react';

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

  const [appointments] = useState(() => {
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

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmado':
        return <span className="badge-success text-[11px]">Confirmado y Pagado</span>;
      case 'cumplido':
        return <span className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-slate-300">Cumplido</span>;
      case 'cancelado':
        return <span className="bg-red-100 text-red-800 text-[11px] font-semibold px-2.5 py-1 rounded-full border border-red-300">Cancelado</span>;
      default:
        return <span className="bg-sky-100 text-sky-800 text-[11px] font-semibold px-2.5 py-1 rounded-full">{status}</span>;
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
            <div key={appt.id} className="card border-l-4 border-l-primary-dark hover:shadow-md transition-shadow">
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
                      onClick={() => alert(`Descargando comprobante oficial ${appt.paymentId} (PDF)...`)}
                      className="text-primary-dark hover:text-sky-900 font-semibold flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary-dark p-1 rounded"
                    >
                      <FileText className="w-4 h-4" aria-hidden="true" /> Descargar Comprobante Oficial
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                      onClick={() => alert('Para reprogramar tu turno, coordiná con el profesional con al menos 24 hs de anticipación.')}
                      className="text-text-muted hover:text-text-main font-medium focus-visible:ring-2 focus-visible:ring-primary-dark p-1 rounded"
                    >
                      Reprogramar o Cancelar
                    </button>
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
