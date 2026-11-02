import React, { useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { ChevronLeft, Calendar, Clock, ChevronRight, Check } from 'lucide-react';
import { PROFESSIONALS } from '../../data/mockData';

export default function BookingPage() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const pro = PROFESSIONALS.find((p) => p.id === Number(id));
  const planId = searchParams.get('plan') || 'individual';

  const [selectedDate, setSelectedDate] = useState(pro?.availableSlots?.[0]?.date || '');
  const [selectedTime, setSelectedTime] = useState('');

  if (!pro) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-4 text-center">
        <p className="text-text-muted">Profesional no encontrado.</p>
      </div>
    );
  }

  // Calcular precio según el plan seleccionado
  const selectedPackage = pro.packages?.find((p) => p.id === planId);
  const planTitle = selectedPackage ? selectedPackage.title : 'Consulta Individual';
  const totalAmount = selectedPackage
    ? Math.round(pro.price * selectedPackage.sessions * (1 - selectedPackage.discountPercent / 100))
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

        {/* Selector de Horarios */}
        <h2 className="font-semibold text-text-main text-sm mb-3 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-primary-dark" aria-hidden="true" /> 2. Franjas horarias disponibles
        </h2>
        {currentSlotGroup && currentSlotGroup.times.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3" role="radiogroup" aria-label="Horarios disponibles">
            {currentSlotGroup.times.map((time) => {
              const isSelected = selectedTime === time;
              return (
                <button
                  key={time}
                  type="button"
                  onClick={() => setSelectedTime(time)}
                  className={`py-3 px-4 rounded-xl border text-center font-medium transition-all flex items-center justify-center gap-1.5 ${
                    isSelected
                      ? 'bg-sky-50 border-primary-dark text-primary-dark font-bold ring-2 ring-primary-dark shadow-sm'
                      : 'border-borderSubtle text-text-main hover:border-slate-400 bg-white'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isSelected && <Check className="w-4 h-4 text-primary-dark" aria-hidden="true" />}
                  {time}
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
          disabled={!selectedDate || !selectedTime}
          className={`${
            !selectedDate || !selectedTime
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

