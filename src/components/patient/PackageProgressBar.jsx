import React, { useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Calendar,
  ChevronRight,
  Sparkles,
  AlertCircle,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  ArrowRight
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PackageProgressBar({ packageData, onSessionAction }) {
  const navigate = useNavigate();
  const [showHistory, setShowHistory] = useState(false);

  if (!packageData) return null;

  const total = Number(packageData.totalSessions) || 1;
  const completed = Number(packageData.completedSessions) || 0;
  const booked = Number(packageData.bookedSessions) || 0;
  const pendingToBook = Math.max(0, total - booked);
  const pendingSessions = Math.max(0, total - completed);

  const percentage = Math.min(100, Math.round((completed / total) * 100));
  const isCompleted = completed >= total;
  const allBooked = booked >= total;

  const handleBookNextSession = () => {
    if (onSessionAction) {
      onSessionAction(packageData);
      return;
    }
    // Redirigir al flujo de reserva con el paquete asociado
    navigate(`/reservar/${packageData.professionalId || 1}?plan=${packageData.packageId || 'pkg-2'}&packageContractId=${packageData.id}`);
  };

  return (
    <div className="card border-2 border-primary-light shadow-sm bg-white overflow-hidden space-y-4 animate-in fade-in">
      {/* Cabecera del Paquete */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider bg-sky-100 text-sky-900 px-2 py-0.5 rounded border border-sky-200">
              {packageData.id}
            </span>
            {isCompleted ? (
              <span className="badge-success text-[11px] flex items-center gap-1 font-bold">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" /> Plan Completado
              </span>
            ) : (
              <span className="bg-primary-light text-primary-dark text-[11px] font-bold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" /> Tratamiento en Curso
              </span>
            )}
          </div>

          <h3 className="text-lg font-bold text-text-main">
            {packageData.title}
          </h3>

          <p className="text-xs text-text-muted mt-0.5 flex items-center gap-1 font-medium">
            <Stethoscope className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
            {packageData.professionalName} · {packageData.specialty}
          </p>
        </div>

        {/* Porcentaje destacado */}
        <div className="text-left sm:text-right flex-shrink-0">
          <span className="text-2xl font-black text-primary-dark">
            {percentage}%
          </span>
          <span className="text-[11px] font-semibold text-text-muted block">
            {completed} de {total} sesiones cumplidas
          </span>
        </div>
      </div>

      {/* Barra de Progreso Visual Accesible (Criterio 2 - HU12) */}
      <div className="space-y-1.5">
        <div
          className="w-full bg-slate-100 rounded-full h-3.5 p-0.5 overflow-hidden border border-slate-200"
          role="progressbar"
          aria-valuenow={percentage}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Progreso del tratamiento: ${completed} de ${total} sesiones cumplidas (${percentage}%)`}
        >
          <div
            className="bg-gradient-to-r from-primary-dark to-emerald-600 h-full rounded-full transition-all duration-500 shadow-inner"
            style={{ width: `${percentage}%` }}
          />
        </div>

        {/* Chips de Resumen Numérico */}
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs pt-1">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              <CheckCircle2 className="w-3 h-3 text-emerald-600" aria-hidden="true" />
              <strong>{completed}</strong> cumplidas
            </span>

            {booked > completed && (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                <Clock className="w-3 h-3 text-sky-600" aria-hidden="true" />
                <strong>{booked - completed}</strong> agendada(s)
              </span>
            )}

            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              <strong>{pendingToBook}</strong> por agendar
            </span>
          </div>

          <span className="text-[11px] text-text-muted font-medium">
            Total contratado: <strong>{total} sesiones</strong>
          </span>
        </div>
      </div>

      {/* Grid de Píldoras / Pasos de Sesiones (1 a N) */}
      <div className="bg-slate-50/70 p-3.5 rounded-xl border border-borderSubtle">
        <span className="text-[11px] font-bold uppercase text-text-muted tracking-wider block mb-2.5">
          Mapa de Sesiones del Plan:
        </span>
        <div className="grid grid-cols-4 sm:grid-cols-8 gap-2">
          {Array.from({ length: total }, (_, i) => {
            const sessionNum = i + 1;
            const sessionData = packageData.sessions?.find((s) => s.sessionNumber === sessionNum);
            const isSessionCompleted = sessionData?.status === 'cumplido';
            const isSessionBooked = sessionData?.status === 'confirmado';

            return (
              <div
                key={sessionNum}
                className={`p-2 rounded-lg text-center flex flex-col items-center justify-center border transition-all ${isSessionCompleted
                  ? 'bg-emerald-100/70 border-emerald-300 text-emerald-950 font-bold'
                  : isSessionBooked
                    ? 'bg-sky-100/70 border-sky-300 text-sky-950 font-bold'
                    : 'bg-white border-dashed border-slate-300 text-slate-400'
                  }`}
                title={`Sesión ${sessionNum}: ${isSessionCompleted ? 'Cumplida' : isSessionBooked ? 'Agendada' : 'Pendiente'}`}
              >
                <div className="mb-0.5">
                  {isSessionCompleted ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-700" aria-hidden="true" />
                  ) : isSessionBooked ? (
                    <Clock className="w-4 h-4 text-sky-700" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-mono font-medium">{sessionNum}</span>
                  )}
                </div>
                <span className="text-[10px] leading-none">
                  {isSessionCompleted ? 'Realizada' : isSessionBooked ? 'Agendada' : `Sesión ${sessionNum}`}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Botón de Acción o Estado de Límite (Criterio 3 - HU12) */}
      <div className="pt-2 border-t border-borderSubtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowHistory((prev) => !prev)}
          className="text-xs text-primary-dark hover:text-sky-900 font-semibold flex items-center gap-1 self-start sm:self-auto p-1 rounded"
        >
          {showHistory ? (
            <>
              Ocultar historial de sesiones <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
            </>
          ) : (
            <>
              Ver detalle y fechas de cada sesión <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
            </>
          )}
        </button>

        {isCompleted ? (
          <div className="text-xs font-bold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            ¡Todas las sesiones fueron completadas!
          </div>
        ) : allBooked ? (
          <div className="text-xs font-semibold text-sky-900 bg-sky-50 px-3 py-1.5 rounded-lg border border-sky-200 flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-sky-600" aria-hidden="true" />
            Todas las {total} sesiones ya fueron reservadas
          </div>
        ) : (
          <button
            type="button"
            onClick={handleBookNextSession}
            className="btn-primary text-xs py-2 px-4 shadow-sm flex items-center justify-center gap-1.5"
          >
            <span>Agendar Sesión {booked + 1} de {total}</span>
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </button>
        )}
      </div>

      {/* Despliegue de Historial Detallado de Sesiones */}
      {showHistory && (
        <div className="bg-slate-50 p-4 rounded-xl border border-borderSubtle space-y-2.5 animate-in fade-in">
          <h4 className="text-xs font-bold text-text-main uppercase tracking-wider mb-2">
            Registro de Sesiones de Tratamiento
          </h4>
          <div className="divide-y divide-borderSubtle">
            {packageData.sessions?.map((s) => (
              <div key={s.sessionNumber} className="py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5">
                  {s.status === 'cumplido' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" aria-hidden="true" />
                  ) : s.status === 'confirmado' ? (
                    <Clock className="w-4 h-4 text-sky-600 flex-shrink-0" aria-hidden="true" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
                  )}
                  <div>
                    <strong className="text-text-main font-semibold">
                      Sesión #{s.sessionNumber}
                    </strong>
                    <span className="text-text-muted ml-1.5">
                      {s.date} a las {s.time}
                    </span>
                    {s.notes && (
                      <p className="text-[11px] text-text-muted italic mt-0.5">{s.notes}</p>
                    )}
                  </div>
                </div>

                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${s.status === 'cumplido'
                  ? 'bg-emerald-100 text-emerald-800'
                  : s.status === 'confirmado'
                    ? 'bg-sky-100 text-sky-800'
                    : 'bg-slate-100 text-slate-700'
                  }`}>
                  {s.status === 'cumplido' ? 'Cumplida' : s.status === 'confirmado' ? 'Programada' : s.status}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

