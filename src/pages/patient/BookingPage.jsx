import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, ChevronRight, Check, CalendarOff } from 'lucide-react';
import { PROFESSIONALS } from '../../data/mockData';
import { getBookedSlots } from '../../api/appointmentService';

export default function BookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pro = PROFESSIONALS.find((p) => p.id === Number(id));
  const planId = searchParams.get('plan') || 'individual';

  // Calcular precio según el plan seleccionado (soporte dinámico para paquetes creados por el profesional)
  const availablePackages = useMemo(() => {
    if (!pro) return [];
    if (pro.id === 1) {
      try {
        const saved = localStorage.getItem('salud_directa_pro_packages');
        if (saved) return JSON.parse(saved);
      } catch {
        // Fallback
      }
    }
    return pro.packages || [];
  }, [pro]);

  const [selectedDate, setSelectedDate] = useState(pro?.availableSlots?.[0]?.date || '');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);

  // Consultar franjas ya ocupadas en tiempo real para control de concurrencia (Criterio 1 - HU9)
  useEffect(() => {
    if (!pro || !selectedDate) return;
    let isMounted = true;

    getBookedSlots(pro.name, selectedDate).then((slots) => {
      if (isMounted) {
        setBookedSlots(slots);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [pro, selectedDate]);

  // Verificar si la fecha seleccionada está bloqueada por ausencia del profesional (Criterio 2 - HU8)
  const activeAbsence = useMemo(() => {
    if (pro?.id !== 1 || !selectedDate) return null;
    try {
      const savedSchedule = localStorage.getItem('salud_directa_pro_schedule');
      if (savedSchedule) {
        const parsed = JSON.parse(savedSchedule);
        return parsed.absences?.find(
          (a) => selectedDate >= a.startDate && selectedDate <= a.endDate
        );
      }
    } catch {
      // Fallback
    }
    return null;
  }, [pro, selectedDate]);

  if (!pro) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-4 text-center">
        <p className="text-text-muted">Profesional no encontrado.</p>
      </div>
    );
  }

  const selectedPackage = availablePackages?.find((p) => p.id === planId);
  const planTitle = selectedPackage ? selectedPackage.title : 'Consulta Individual';
  const totalAmount = selectedPackage
    ? (selectedPackage.totalPrice || Math.round(pro.price * selectedPackage.sessions * (1 - selectedPackage.discountPercent / 100)))
    : pro.price;

  const currentSlotGroup = pro.availableSlots?.find((s) => s.date === selectedDate);

  const handleProceed = () => {
    if (!selectedDate || !selectedTime) return;
    const checkoutState = {
      professionalId: pro.id,
      professionalName: pro.name,
      specialty: pro.specialty,
      planTitle,
      selectedDate,
      selectedTime,
      totalAmount,
    };
    navigate('/checkout', { state: checkoutState });
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4 pb-16 animate-in fade-in duration-300">
      <button
        onClick={() => navigate(-1)}
        className="text-text-muted hover:text-text-main flex items-center text-sm font-semibold mb-6 transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-primary-dark"
      >
        <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Volver al perfil
      </button>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-main mb-1 flex items-center gap-2">
          <Calendar className="text-primary-dark w-6 h-6" aria-hidden="true" /> Seleccioná fecha y horario
        </h1>
        <p className="text-sm text-text-muted">
          Turno con <strong>{pro.name}</strong> · {planTitle}
        </p>
      </div>

      <div className="card mb-6">
        {/* Selector de Fecha */}
        <h2 className="font-semibold text-text-main text-sm mb-3">1. Elegí el día de atención</h2>
        <div className="flex gap-2.5 mb-6 overflow-x-auto pb-2 scrollbar-none" role="tablist" aria-label="Fechas disponibles">
          {pro.availableSlots?.map((slot) => {
            const isSelected = selectedDate === slot.date;
            return (
              <button
                key={slot.date}
                type="button"
                onClick={() => {
                  setSelectedDate(slot.date);
                  setSelectedTime(''); // Reiniciar franja al cambiar día
                }}
                className={`flex-shrink-0 w-20 py-3 px-2 rounded-xl border text-center font-medium transition-all ${
                  isSelected
                    ? 'bg-primary-dark border-primary-dark text-white shadow-sm ring-2 ring-primary-dark ring-offset-1'
                    : 'border-borderSubtle text-text-main hover:border-slate-400 bg-white'
                }`}
                aria-pressed={isSelected}
              >
                <div className={`text-xs ${isSelected ? 'text-sky-100' : 'text-text-muted'}`}>{slot.dayLabel.split(' ')[0]}</div>
                <div className="text-lg font-bold">{slot.dayLabel.split(' ')[1]}</div>
              </button>
            );
          })}
        </div>

        {/* Selector de Horarios o Bloqueo por Ausencia (HU8) */}
        <h2 className="font-semibold text-text-main text-sm mb-3 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-primary-dark" aria-hidden="true" /> 2. Franjas horarias disponibles
        </h2>

        {activeAbsence ? (
          <div className="bg-amber-50 border border-amber-300 p-4 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 animate-in fade-in">
            <CalendarOff className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="font-bold text-amber-900">Fecha no disponible por ausencia programada:</strong> {activeAbsence.reason}.
              <div className="text-[11px] text-amber-800 mt-1">
                El profesional bloqueó su agenda para este período. Por favor seleccioná otro día de atención en el calendario superior.
              </div>
            </div>
          </div>
        ) : loadingSlots ? (
          <div className="py-6 text-center text-xs text-text-muted">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-dark mx-auto mb-2" aria-hidden="true"></div>
            Consultando disponibilidad en tiempo real...
          </div>
        ) : currentSlotGroup && currentSlotGroup.times.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Horarios disponibles">
            {currentSlotGroup.times.map((time) => {
              const isSelected = selectedTime === time;
              const isBooked = bookedSlots.includes(time);

              return (
                <button
                  key={time}
                  type="button"
                  disabled={isBooked}
                  onClick={() => !isBooked && setSelectedTime(time)}
                  className={`py-3 px-4 rounded-xl border text-center font-medium transition-all flex items-center justify-center gap-1.5 ${
                    isBooked
                      ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed line-through'
                      : isSelected
                      ? 'bg-sky-50 border-primary-dark text-primary-dark font-bold ring-2 ring-primary-dark shadow-sm'
                      : 'border-borderSubtle text-text-main hover:border-slate-400 bg-white'
                  }`}
                  aria-pressed={isSelected}
                  title={isBooked ? 'Horario reservado por otro paciente' : 'Disponible'}
                >
                  {isSelected && <Check className="w-4 h-4 text-primary-dark" aria-hidden="true" />}
                  <span>{time}</span>
                  {isBooked && <span className="text-[10px] no-underline font-normal text-slate-400 block">(Ocupado)</span>}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="text-xs text-text-muted italic py-2">No hay horarios disponibles para la fecha seleccionada.</p>
        )}
      </div>

      {/* Resumen flotante inferior */}
      <div className="bg-white p-4 rounded-xl border border-borderSubtle shadow-md flex items-center justify-between sticky bottom-4 z-20">
        <div>
          <div className="text-xs text-text-muted">Total a abonar:</div>
          <div className="font-extrabold text-2xl text-text-main">$ {totalAmount.toLocaleString('es-AR')}</div>
          {selectedTime && (
            <div className="text-xs font-semibold text-primary-dark">
              {currentSlotGroup?.dayLabel} a las {selectedTime}
            </div>
          )}
        </div>

        <button
          onClick={handleProceed}
          disabled={!selectedDate || !selectedTime || Boolean(activeAbsence)}
          className={`${
            !selectedDate || !selectedTime || Boolean(activeAbsence)
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
              : 'bg-primary-dark text-white hover:bg-sky-800 shadow-sm'
          } px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2`}
        >
          Continuar <ChevronRight className="w-4 h-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
