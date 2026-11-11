import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft, Calendar, CreditCard, CheckCircle2, Lock, AlertTriangle, ArrowLeft } from 'lucide-react';
import { bookAppointment } from '../../api/appointmentService';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const bookingData = location.state;

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  if (!bookingData) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-4 text-center">
        <p className="text-text-muted mb-4">No hay información de reserva activa.</p>
        <button onClick={() => navigate('/')} className="btn-primary max-w-xs mx-auto">
          Ir al Inicio
        </button>
      </div>
    );
  }

  const handlePayAndConfirm = async () => {
    setIsProcessing(true);
    setErrorMessage('');

    try {
      await bookAppointment({
        professionalName: bookingData.professionalName,
        specialty: bookingData.specialty,
        planTitle: bookingData.planTitle,
        date: bookingData.selectedDate,
        time: bookingData.selectedTime,
        totalAmount: bookingData.totalAmount,
        status: 'confirmado',
      });

      setIsProcessing(false);
      navigate('/mis-turnos?exito=true');
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(
        err.message?.includes('CONCURRENCY_COLLISION')
          ? 'El horario seleccionado acaba de ser tomado por otro paciente (Conflicto de concurrencia). Por favor elegí una franja horaria alternativa.'
          : err.message || 'Error al procesar la reserva.'
      );
    }
  };

  return (
    <div className="max-w-2xl mx-auto mt-6 px-4 pb-16 animate-in fade-in duration-300">
      <button
        onClick={() => navigate(-1)}
        className="text-text-muted hover:text-text-main flex items-center text-sm font-semibold mb-6 transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-primary-dark"
      >
        <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Volver a selección de horario
      </button>

      <h1 className="text-2xl font-bold text-text-main mb-6">Resumen y Pago de la Consulta</h1>

      {errorMessage && (
        <div className="bg-red-50 border border-red-300 p-4 rounded-xl text-xs text-red-900 mb-6 flex items-start gap-3 shadow-sm animate-in fade-in" role="alert">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2">
            <strong className="block">Conflicto de Disponibilidad (Concurrencia):</strong>
            <p className="leading-relaxed">{errorMessage}</p>
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="bg-red-700 hover:bg-red-800 text-white font-semibold py-1.5 px-3 rounded-md text-xs transition-colors inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Volver a seleccionar otro horario
            </button>
          </div>
        </div>
      )}

      <div className="card mb-6 space-y-5">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-primary-dark">Detalle del turno</span>
          <h2 className="font-bold text-lg text-text-main mt-0.5">{bookingData.planTitle}</h2>
          <p className="text-sm text-text-muted font-medium">Profesional: {bookingData.professionalName} ({bookingData.specialty})</p>
          <div className="mt-2 inline-flex items-center gap-1.5 text-xs text-primary-dark bg-sky-50 border border-sky-200 px-3 py-1 rounded-md font-semibold">
            <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
            {bookingData.selectedDate} a las {bookingData.selectedTime}
          </div>
        </div>

        {/* Desglose de importes */}
        <div className="border-t border-borderSubtle pt-4 space-y-2 text-sm">
          <div className="flex justify-between text-text-muted">
            <span>Prestación médica particular:</span>
            <span>$ {bookingData.totalAmount.toLocaleString('es-AR')}</span>
          </div>
          <div className="flex justify-between text-text-muted">
            <span>Cargos de gestión de plataforma:</span>
            <span className="text-emerald-700 font-semibold">$ 0 (Sin costo)</span>
          </div>
          <div className="flex justify-between items-center text-base font-bold text-text-main pt-2 border-t border-dashed border-borderSubtle">
            <span>Total final a pagar:</span>
            <span className="text-2xl text-primary-dark font-extrabold">$ {bookingData.totalAmount.toLocaleString('es-AR')}</span>
          </div>
        </div>

        {/* Pasarela Mercado Pago */}
        <div className="bg-slate-50 rounded-xl p-4 border border-borderSubtle">
          <div className="flex items-center gap-2.5 text-sm font-semibold text-text-main mb-2">
            <CreditCard className="w-5 h-5 text-sky-600" aria-hidden="true" />
            <span>Pasarela de Pago Segura — Mercado Pago</span>
          </div>
          <p className="text-xs text-text-muted leading-relaxed">
            Podrás abonar con Débito, Crédito o dinero en cuenta de Mercado Pago con acreditación instantánea y emisión de comprobante oficial.
          </p>
          <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-3 font-medium">
            <Lock className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
            Transacción encriptada de 256 bits · No almacenamos datos de tus tarjetas
          </div>
        </div>
      </div>

      <button
        onClick={handlePayAndConfirm}
        disabled={isProcessing}
        className="w-full bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-800 transition-colors shadow-md flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed"
      >
        {isProcessing ? (
          <>
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true"></div>
            <span>Procesando pago seguro...</span>
          </>
        ) : (
          <>
            <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
            <span>Pagar $ {bookingData.totalAmount.toLocaleString('es-AR')} y Confirmar</span>
          </>
        )}
      </button>
    </div>
  );
}
