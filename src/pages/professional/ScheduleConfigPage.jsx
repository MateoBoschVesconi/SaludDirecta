import React, { useState } from 'react';
import { 
  Calendar as CalendarIcon, 
  Clock, 
  Plus, 
  Trash2, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Ban, 
  CalendarOff,
  Info
} from 'lucide-react';

const DAYS_OF_WEEK = [
  { id: 'lun', label: 'Lunes', defaultActive: true, morningStart: '08:30', morningEnd: '12:30', afternoonActive: true, afternoonStart: '16:00', afternoonEnd: '20:00' },
  { id: 'mar', label: 'Martes', defaultActive: true, morningStart: '08:30', morningEnd: '12:30', afternoonActive: true, afternoonStart: '16:00', afternoonEnd: '20:00' },
  { id: 'mie', label: 'Miércoles', defaultActive: true, morningStart: '08:30', morningEnd: '12:30', afternoonActive: true, afternoonStart: '16:00', afternoonEnd: '20:00' },
  { id: 'jue', label: 'Jueves', defaultActive: true, morningStart: '08:30', morningEnd: '12:30', afternoonActive: true, afternoonStart: '16:00', afternoonEnd: '20:00' },
  { id: 'vie', label: 'Viernes', defaultActive: true, morningStart: '08:30', morningEnd: '12:30', afternoonActive: false, afternoonStart: '16:00', afternoonEnd: '20:00' },
  { id: 'sab', label: 'Sábado', defaultActive: false, morningStart: '09:00', morningEnd: '13:00', afternoonActive: false, afternoonStart: '16:00', afternoonEnd: '19:00' },
];

const DEFAULT_SCHEDULE = {
  days: DAYS_OF_WEEK,
  sessionDurationMinutes: 45,
  breakBetweenSessionsMinutes: 15,
  minAdvanceNoticeHours: 4,
  absences: [
    {
      id: 'abs-1',
      startDate: '2026-11-20',
      endDate: '2026-11-23',
      reason: 'Congreso Nacional de Kinesiología y Fisiatría',
    }
  ]
};

export default function ScheduleConfigPage() {
  const [schedule, setSchedule] = useState(() => {
    try {
      const saved = localStorage.getItem('salud_directa_pro_schedule');
      return saved ? JSON.parse(saved) : DEFAULT_SCHEDULE;
    } catch {
      return DEFAULT_SCHEDULE;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);

  // Estados para el formulario de nuevo bloqueo / ausencia
  const [absenceStart, setAbsenceStart] = useState('');
  const [absenceEnd, setAbsenceEnd] = useState('');
  const [absenceReason, setAbsenceReason] = useState('');
  const [absenceError, setAbsenceError] = useState('');

  // Modificar días laborables
  const handleToggleDay = (dayId) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) => (d.id === dayId ? { ...d, defaultActive: !d.defaultActive } : d))
    }));
    setSavedSuccess(false);
  };

  const handleDayTimeChange = (dayId, field, value) => {
    setSchedule((prev) => ({
      ...prev,
      days: prev.days.map((d) => (d.id === dayId ? { ...d, [field]: value } : d))
    }));
    setSavedSuccess(false);
  };

  // Agregar ausencia
  const handleAddAbsence = (e) => {
    e.preventDefault();
    if (!absenceStart || !absenceEnd) {
      setAbsenceError('Debes seleccionar las fechas de inicio y fin de la ausencia.');
      return;
    }
    if (absenceStart > absenceEnd) {
      setAbsenceError('La fecha de inicio no puede ser posterior a la fecha de fin.');
      return;
    }
    if (!absenceReason.trim()) {
      setAbsenceError('Ingresá el motivo del bloqueo (ej. Vacaciones, Congreso, Licencia).');
      return;
    }

    const nextId = `abs-${schedule.absences.length + 1}`;
    const newAbsence = {
      id: nextId,
      startDate: absenceStart,
      endDate: absenceEnd,
      reason: absenceReason.trim(),
    };

    setSchedule((prev) => ({
      ...prev,
      absences: [...prev.absences, newAbsence]
    }));

    setAbsenceStart('');
    setAbsenceEnd('');
    setAbsenceReason('');
    setAbsenceError('');
    setSavedSuccess(false);
  };

  const handleRemoveAbsence = (id) => {
    setSchedule((prev) => ({
      ...prev,
      absences: prev.absences.filter((a) => a.id !== id)
    }));
    setSavedSuccess(false);
  };

  const handleSaveAll = () => {
    localStorage.setItem('salud_directa_pro_schedule', JSON.stringify(schedule));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Clock className="w-6 h-6 text-primary-dark" aria-hidden="true" />
            Configuración de Agenda y Franjas Horarias (HU8)
          </h1>
          <p className="text-sm text-text-muted">
            Definí tus días de atención, franjas por turno, duración de prestaciones y bloqueos por ausencias.
          </p>
        </div>

        <button
          onClick={handleSaveAll}
          className="btn-primary py-2.5 px-5 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Save className="w-4 h-4" aria-hidden="true" />
          Guardar Configuración
        </button>
      </div>

      {savedSuccess && (
        <div 
          className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm font-semibold">
            ¡Tu agenda y disponibilidad se actualizaron correctamente! Los nuevos turnos ya están sincronizados.
          </div>
        </div>
      )}

      {/* SECCIÓN 1: Duración de Prestaciones e Intervalos (Criterio 3 - HU8) */}
      <section className="card space-y-4" aria-labelledby="section-duracion">
        <h2 id="section-duracion" className="font-bold text-base text-text-main flex items-center gap-2">
          <Clock className="w-5 h-5 text-primary-dark" aria-hidden="true" />
          1. Duración de la Consulta e Intervalos entre Turnos
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div>
            <label htmlFor="select-duration" className="block font-bold text-text-main uppercase tracking-wider mb-1">
              Duración de Consulta *
            </label>
            <select
              id="select-duration"
              value={schedule.sessionDurationMinutes}
              onChange={(e) => {
                setSchedule((prev) => ({ ...prev, sessionDurationMinutes: Number(e.target.value) }));
                setSavedSuccess(false);
              }}
              className="input-field text-xs font-semibold"
            >
              <option value={30}>30 minutos (Consulta breve)</option>
              <option value={45}>45 minutos (Kinesiología estándar)</option>
              <option value={60}>60 minutos (Evaluación o sesión integral)</option>
              <option value={90}>90 minutos (Sesión extendida)</option>
            </select>
          </div>

          <div>
            <label htmlFor="select-break" className="block font-bold text-text-main uppercase tracking-wider mb-1">
              Descanso / Sanitización
            </label>
            <select
              id="select-break"
              value={schedule.breakBetweenSessionsMinutes}
              onChange={(e) => {
                setSchedule((prev) => ({ ...prev, breakBetweenSessionsMinutes: Number(e.target.value) }));
                setSavedSuccess(false);
              }}
              className="input-field text-xs font-semibold"
            >
              <option value={0}>Sin intervalo (turnos continuos)</option>
              <option value={10}>10 minutos entre pacientes</option>
              <option value={15}>15 minutos entre pacientes</option>
              <option value={20}>20 minutos entre pacientes</option>
            </select>
          </div>

          <div>
            <label htmlFor="select-advance" className="block font-bold text-text-main uppercase tracking-wider mb-1">
              Anticipación Mínima
            </label>
            <select
              id="select-advance"
              value={schedule.minAdvanceNoticeHours}
              onChange={(e) => {
                setSchedule((prev) => ({ ...prev, minAdvanceNoticeHours: Number(e.target.value) }));
                setSavedSuccess(false);
              }}
              className="input-field text-xs font-semibold"
            >
              <option value={2}>2 horas antes del turno</option>
              <option value={4}>4 horas antes del turno</option>
              <option value={12}>12 horas antes</option>
              <option value={24}>24 horas antes (1 día previo)</option>
            </select>
          </div>
        </div>
      </section>

      {/* SECCIÓN 2: Días Laborables y Franjas Horarias (Criterio 1 - HU8) */}
      <section className="card space-y-4" aria-labelledby="section-franjas">
        <div>
          <h2 id="section-franjas" className="font-bold text-base text-text-main flex items-center gap-2">
            <CalendarIcon className="w-5 h-5 text-primary-dark" aria-hidden="true" />
            2. Días de Atención Semanal y Franjas de Disponibilidad
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Los pacientes solo podrán reservar turnos dentro de los días y horarios que configures activos.
          </p>
        </div>

        <div className="space-y-3" role="group" aria-label="Horarios por día de la semana">
          {schedule.days.map((day) => (
            <div 
              key={day.id} 
              className={`p-4 rounded-xl border transition-all ${
                day.defaultActive 
                  ? 'bg-white border-borderSubtle shadow-sm' 
                  : 'bg-slate-50 border-slate-200 opacity-60'
              }`}
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                {/* Checkbox y Nombre del día */}
                <div className="flex items-center gap-3 w-36">
                  <input
                    type="checkbox"
                    id={`check-${day.id}`}
                    checked={day.defaultActive}
                    onChange={() => handleToggleDay(day.id)}
                    className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4 cursor-pointer"
                  />
                  <label htmlFor={`check-${day.id}`} className="font-bold text-sm text-text-main cursor-pointer select-none">
                    {day.label}
                  </label>
                </div>

                {day.defaultActive ? (
                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                    {/* Turno Mañana */}
                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <span className="font-semibold text-text-muted w-14">Mañana:</span>
                      <input
                        type="time"
                        value={day.morningStart}
                        onChange={(e) => handleDayTimeChange(day.id, 'morningStart', e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                      />
                      <span>a</span>
                      <input
                        type="time"
                        value={day.morningEnd}
                        onChange={(e) => handleDayTimeChange(day.id, 'morningEnd', e.target.value)}
                        className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                      />
                    </div>

                    {/* Turno Tarde */}
                    <div className="flex items-center gap-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      <label className="flex items-center gap-1.5 font-semibold text-text-muted w-14 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={day.afternoonActive}
                          onChange={(e) => handleDayTimeChange(day.id, 'afternoonActive', e.target.checked)}
                          className="rounded text-primary-dark w-3.5 h-3.5"
                        />
                        <span>Tarde:</span>
                      </label>
                      {day.afternoonActive ? (
                        <>
                          <input
                            type="time"
                            value={day.afternoonStart}
                            onChange={(e) => handleDayTimeChange(day.id, 'afternoonStart', e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                          />
                          <span>a</span>
                          <input
                            type="time"
                            value={day.afternoonEnd}
                            onChange={(e) => handleDayTimeChange(day.id, 'afternoonEnd', e.target.value)}
                            className="bg-white border border-slate-300 rounded px-2 py-1 text-xs font-mono font-bold"
                          />
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">Sin turno tarde</span>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 text-xs text-slate-400 italic flex items-center gap-1.5">
                    <Ban className="w-4 h-4" aria-hidden="true" />
                    Día no laborable (no se habilitarán turnos)
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* SECCIÓN 3: Períodos de Ausencia y Bloqueos de Agenda (Criterio 2 - HU8) */}
      <section className="card space-y-4" aria-labelledby="section-ausencias">
        <div>
          <h2 id="section-ausencias" className="font-bold text-base text-text-main flex items-center gap-2">
            <CalendarOff className="w-5 h-5 text-amber-600" aria-hidden="true" />
            3. Períodos de Ausencia y Bloqueo de Turnos (Criterio 2)
          </h2>
          <p className="text-xs text-text-muted mt-0.5">
            Configurá vacaciones, licencias o ausencias programadas. La plataforma bloqueará automáticamente la reserva de turnos en esas fechas.
          </p>
        </div>

        {/* Formulario para agregar ausencia */}
        <form onSubmit={handleAddAbsence} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
          <span className="text-xs font-bold uppercase tracking-wider text-text-main block">
            Registrar Nuevo Bloqueo Temporal
          </span>

          {absenceError && (
            <div className="text-xs text-red-700 bg-red-50 border border-red-200 p-2.5 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" aria-hidden="true" />
              <span>{absenceError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div>
              <label htmlFor="abs-start" className="block text-text-muted font-semibold mb-1">
                Fecha Desde *
              </label>
              <input
                id="abs-start"
                type="date"
                required
                value={absenceStart}
                onChange={(e) => setAbsenceStart(e.target.value)}
                className="input-field py-2 text-xs"
              />
            </div>

            <div>
              <label htmlFor="abs-end" className="block text-text-muted font-semibold mb-1">
                Fecha Hasta *
              </label>
              <input
                id="abs-end"
                type="date"
                required
                value={absenceEnd}
                onChange={(e) => setAbsenceEnd(e.target.value)}
                className="input-field py-2 text-xs"
              />
            </div>

            <div>
              <label htmlFor="abs-reason" className="block text-text-muted font-semibold mb-1">
                Motivo del Bloqueo *
              </label>
              <input
                id="abs-reason"
                type="text"
                required
                placeholder="Ej: Vacaciones / Congreso"
                value={absenceReason}
                onChange={(e) => setAbsenceReason(e.target.value)}
                className="input-field py-2 text-xs"
              />
            </div>
          </div>

          <div className="flex justify-end pt-1">
            <button
              type="submit"
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold py-2 px-4 rounded-lg text-xs transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Plus className="w-4 h-4" aria-hidden="true" />
              Agregar Bloqueo de Agenda
            </button>
          </div>
        </form>

        {/* Lista de Ausencias Activas */}
        <div className="space-y-2">
          {schedule.absences.length === 0 ? (
            <div className="text-xs text-slate-400 italic py-2 text-center">
              No tenés bloqueos activos. Tu agenda se rige 100% por los días laborables regulares.
            </div>
          ) : (
            schedule.absences.map((abs) => (
              <div 
                key={abs.id}
                className="flex items-center justify-between p-3 rounded-lg border border-amber-200 bg-amber-50/70 text-xs"
              >
                <div className="flex items-center gap-2.5">
                  <CalendarOff className="w-4 h-4 text-amber-700 flex-shrink-0" aria-hidden="true" />
                  <div>
                    <strong className="text-text-main font-semibold">{abs.reason}</strong>
                    <div className="text-[11px] text-text-muted font-mono mt-0.5">
                      Desde {abs.startDate} hasta {abs.endDate}
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveAbsence(abs.id)}
                  className="text-text-muted hover:text-medical-error p-1 rounded-md transition-colors"
                  aria-label={`Eliminar bloqueo ${abs.reason}`}
                >
                  <Trash2 className="w-4 h-4" aria-hidden="true" />
                </button>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Botón flotante inferior de guardado */}
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-borderSubtle shadow-md sticky bottom-4 z-20">
        <div className="flex items-center gap-2 text-xs text-text-muted">
          <Info className="w-4 h-4 text-primary-dark" aria-hidden="true" />
          <span>Recordá guardar los cambios para que se reflejen en el motor de turnos de los pacientes.</span>
        </div>

        <button
          onClick={handleSaveAll}
          className="btn-primary py-3 px-6 text-xs font-semibold flex items-center gap-2 w-auto shadow-sm"
        >
          <Save className="w-4 h-4" aria-hidden="true" />
          Guardar Configuración de Agenda
        </button>
      </div>
    </div>
  );
}
