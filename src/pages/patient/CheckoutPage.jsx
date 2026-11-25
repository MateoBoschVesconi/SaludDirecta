import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  Calendar, 
  CreditCard, 
  CheckCircle2, 
  Lock, 
  AlertTriangle, 
  ArrowLeft, 
  ShieldCheck, 
  Wallet, 
  Building2, 
  Info, 
  AlertCircle
} from 'lucide-react';
import { bookAppointment } from '../../api/appointmentService';
import { 
  processMercadoPagoPayment, 
  PAYMENT_MODES, 
  CANCELLATION_POLICY 
} from '../../api/paymentService';
import { contractPackage, bookSessionForPackage } from '../../api/packageTrackingService';
import PaymentReceiptModal from '../../components/common/PaymentReceiptModal';
import { useAuth } from '../../context/AuthContext';

export default function CheckoutPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const bookingData = location.state;

  // Estados de configuración de pago
  const [paymentMode, setPaymentMode] = useState(PAYMENT_MODES.TOTAL); // 'total' | 'sena'
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // 'credit_card' | 'debit_card' | 'wallet' | 'transfer'
  
  // Datos del pagador y tarjeta
  const [cardHolder, setCardHolder] = useState(user?.nombre || '');
  const [cardNumber, setCardNumber] = useState('4509 8812 3456 7890');
  const [cardExpiry, setCardExpiry] = useState('11/29');
  const [cardCvv, setCardCvv] = useState('834');
  const [cardDni, setCardDni] = useState('41354968');
  
  // Política y aceptación
  const [acceptPolicy, setAcceptPolicy] = useState(true);
  
  // Simulación de estados para evaluación de la cátedra
  const [simulateOutcome, setSimulateOutcome] = useState('approved'); // 'approved' | 'rejected' | 'collision'

  // Procesamiento y modales
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState(null);
  const [showReceiptModal, setShowReceiptModal] = useState(false);

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

  const totalAmount = Number(bookingData.totalAmount) || 0;
  const isSena = paymentMode === PAYMENT_MODES.SENA;
  const amountToPayNow = isSena ? Math.round(totalAmount * 0.3) : totalAmount;
  const balanceDue = isSena ? totalAmount - amountToPayNow : 0;

  // Formateador de tarjeta
  const handleCardNumberChange = (e) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 16);
    const formatted = raw.replace(/(\d{4})(?=\d)/g, '$1 ');
    setCardNumber(formatted);
  };

  const handlePayAndConfirm = async (e) => {
    e.preventDefault();
    if (!acceptPolicy) {
      setErrorMessage('Debes aceptar las políticas de cancelación y reintegro para continuar.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      // 1. Simulación de colisión forzada si el evaluador la selecciona
      if (simulateOutcome === 'collision') {
        throw new Error('CONCURRENCY_COLLISION: El horario seleccionado acaba de ser tomado por otro paciente.');
      }

      // 2. Procesar el pago con la pasarela Mercado Pago (HU11)
      const receipt = await processMercadoPagoPayment({
        bookingData,
        paymentMode,
        paymentMethod,
        cardDetails: {
          number: cardNumber,
          holder: cardHolder,
          brand: cardNumber.startsWith('4') ? 'Visa' : 'Mastercard',
        },
        payer: {
          name: cardHolder || user?.nombre || 'Paciente Particular',
          email: user?.email || 'paciente@saluddirecta.ar',
          dni: cardDni,
          phone: user?.telefono || '',
        },
        simulateOutcome,
      });

      // 3. Confirmar la reserva del turno e inyectar el comprobante generado
      const bookedAppt = await bookAppointment({
        professionalId: bookingData.professionalId,
        professionalName: bookingData.professionalName,
        specialty: bookingData.specialty,
        planTitle: bookingData.planTitle,
        date: bookingData.selectedDate,
        time: bookingData.selectedTime,
        totalAmount,
        amountPaid: amountToPayNow,
        balanceDue,
        paymentMode,
        paymentId: receipt.paymentId,
        status: 'confirmado',
      });

      // 4. Actualizar seguimiento del paquete de tratamiento (HU12)
      try {
        if (bookingData.packageContractId) {
          // Sesión subsecuente de un paquete previamente contratado
          bookSessionForPackage(bookingData.packageContractId, {
            id: bookedAppt.id,
            date: bookingData.selectedDate,
            time: bookingData.selectedTime,
          });
        } else if (bookingData.totalSessions > 1 || bookingData.packageId) {
          // Alta de un nuevo paquete de sesiones contratado
          contractPackage({
            packageId: bookingData.packageId,
            title: bookingData.planTitle,
            totalSessions: bookingData.totalSessions || 4,
            professionalId: bookingData.professionalId,
            professionalName: bookingData.professionalName,
            specialty: bookingData.specialty,
            patientName: cardHolder || user?.nombre || 'Paciente Particular',
            patientEmail: user?.email || 'paciente@saluddirecta.ar',
            totalPrice: totalAmount,
            paymentId: receipt.paymentId,
            firstAppointment: {
              id: bookedAppt.id,
              date: bookingData.selectedDate,
              time: bookingData.selectedTime,
            },
          });
        }
      } catch (pkgErr) {
        console.warn('Aviso sincronización paquete:', pkgErr.message);
      }

      setCompletedReceipt(receipt);
      setIsProcessing(false);
      setShowReceiptModal(true);
    } catch (err) {
      setIsProcessing(false);
      setErrorMessage(
        err.message?.includes('CONCURRENCY_COLLISION')
          ? 'El horario seleccionado acaba de ser tomado por otro paciente (Conflicto de concurrencia). Por favor elegí una franja horaria alternativa.'
          : err.reason || err.message || 'Error al procesar el pago con Mercado Pago.'
      );
    }
  };

  return (
    <div className="max-w-3xl mx-auto mt-6 px-4 pb-20 animate-in fade-in duration-300">
      <button
        onClick={() => navigate(-1)}
        className="text-text-muted hover:text-text-main flex items-center text-sm font-semibold mb-6 transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-primary-dark"
      >
        <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Volver a selección de horario
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">Checkout y Pago Seguro</h1>
          <p className="text-xs text-text-muted mt-0.5">
            Asegurá tu turno particular mediante la pasarela de pagos oficial
          </p>
        </div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 border border-sky-200 text-primary-dark rounded-full text-xs font-semibold self-start sm:self-auto">
          <ShieldCheck className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          Mercado Pago Certificado
        </div>
      </div>

      {errorMessage && (
        <div className="bg-red-50 border border-red-300 p-4 rounded-xl text-xs text-red-900 mb-6 flex items-start gap-3 shadow-sm animate-in fade-in" role="alert">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
          <div className="space-y-2 flex-1">
            <strong className="block font-bold">Aviso de la Pasarela de Pago:</strong>
            <p className="leading-relaxed">{errorMessage}</p>
            {errorMessage.includes('concurrencia') && (
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="bg-red-700 hover:bg-red-800 text-white font-semibold py-1.5 px-3 rounded-md text-xs transition-colors inline-flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Volver a seleccionar otro horario
              </button>
            )}
          </div>
        </div>
      )}

      <form onSubmit={handlePayAndConfirm} className="space-y-6">
        {/* Resumen del Turno */}
        <div className="card space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-borderSubtle pb-3">
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-primary-dark">
                Detalle del Turno
              </span>
              <h2 className="font-bold text-lg text-text-main mt-0.5">{bookingData.planTitle}</h2>
              <p className="text-sm text-text-muted font-medium">
                Profesional: {bookingData.professionalName} · {bookingData.specialty}
              </p>
            </div>
            <div className="inline-flex items-center gap-1.5 text-xs text-primary-dark bg-sky-50 border border-sky-200 px-3 py-1.5 rounded-lg font-semibold self-start sm:self-auto">
              <Calendar className="w-4 h-4" aria-hidden="true" />
              {bookingData.selectedDate} a las {bookingData.selectedTime}
            </div>
          </div>

          {/* Selector de Modalidad: Seña (RF-13) o Pago Total */}
          <div>
            <label className="block text-xs font-bold text-text-main uppercase tracking-wider mb-2">
              Seleccioná la Modalidad de Pago
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMode === PAYMENT_MODES.TOTAL
                    ? 'border-primary-dark bg-sky-50/60 shadow-sm'
                    : 'border-borderSubtle hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value={PAYMENT_MODES.TOTAL}
                  checked={paymentMode === PAYMENT_MODES.TOTAL}
                  onChange={() => setPaymentMode(PAYMENT_MODES.TOTAL)}
                  className="mt-1 text-primary-dark focus:ring-primary-dark"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-text-main text-sm font-bold">Pago Total (100%)</strong>
                    <span className="text-sm font-extrabold text-primary-dark">
                      $ {totalAmount.toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-text-muted mt-1 leading-snug">
                    Abonás el total de la prestación médica ahora. Queda cancelado y confirmado.
                  </p>
                </div>
              </label>

              <label 
                className={`flex items-start gap-3 p-3.5 rounded-xl border-2 cursor-pointer transition-all ${
                  paymentMode === PAYMENT_MODES.SENA
                    ? 'border-primary-dark bg-sky-50/60 shadow-sm'
                    : 'border-borderSubtle hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="paymentMode"
                  value={PAYMENT_MODES.SENA}
                  checked={paymentMode === PAYMENT_MODES.SENA}
                  onChange={() => setPaymentMode(PAYMENT_MODES.SENA)}
                  className="mt-1 text-primary-dark focus:ring-primary-dark"
                />
                <div className="flex-1 text-xs">
                  <div className="flex items-center justify-between">
                    <strong className="text-text-main text-sm font-bold">Seña de Reserva (30%)</strong>
                    <span className="text-sm font-extrabold text-primary-dark">
                      $ {Math.round(totalAmount * 0.3).toLocaleString('es-AR')}
                    </span>
                  </div>
                  <p className="text-text-muted mt-1 leading-snug">
                    Garantizá el turno con una seña inicial. El saldo de $ {(totalAmount - Math.round(totalAmount * 0.3)).toLocaleString('es-AR')} se abona el día de la cita en consultorio.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Desglose de Importes */}
          <div className="border-t border-borderSubtle pt-4 space-y-2 text-xs">
            <div className="flex justify-between text-text-muted">
              <span>Valor nominal de la consulta:</span>
              <span className="font-mono font-medium">$ {totalAmount.toLocaleString('es-AR')}</span>
            </div>
            {isSena && (
              <div className="flex justify-between text-text-muted">
                <span>Saldo a abonar en el consultorio:</span>
                <span className="font-mono font-medium text-amber-800">$ {balanceDue.toLocaleString('es-AR')}</span>
              </div>
            )}
            <div className="flex justify-between text-text-muted">
              <span>Cargos de gestión de la plataforma:</span>
              <span className="text-emerald-700 font-bold">$ 0 (Sin costo adicional)</span>
            </div>
            <div className="flex justify-between items-center text-sm font-bold text-text-main pt-2 border-t border-dashed border-borderSubtle">
              <span className="text-text-main">Monto a abonar en este acto:</span>
              <span className="text-2xl text-emerald-800 font-extrabold font-mono">
                $ {amountToPayNow.toLocaleString('es-AR')}
              </span>
            </div>
          </div>
        </div>

        {/* Pasarela y Selección de Medio de Pago */}
        <div className="card space-y-4">
          <div className="flex items-center justify-between border-b border-borderSubtle pb-3">
            <div className="flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-sky-600" aria-hidden="true" />
              <h2 className="text-sm font-bold text-text-main">
                Medio de Pago · Mercado Pago
              </h2>
            </div>
            <span className="text-[11px] text-text-muted flex items-center gap-1 font-medium">
              <Lock className="w-3.5 h-3.5 text-emerald-600" aria-hidden="true" />
              Cifrado SSL 256 bits
            </span>
          </div>

          {/* Pestañas de Métodos de Pago */}
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPaymentMethod('credit_card')}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                paymentMethod === 'credit_card'
                  ? 'border-primary-dark bg-sky-50 text-primary-dark shadow-sm'
                  : 'border-borderSubtle text-text-muted hover:bg-slate-50'
              }`}
            >
              <CreditCard className="w-4 h-4" aria-hidden="true" />
              <span>Tarjeta Débito/Crédito</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('wallet')}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                paymentMethod === 'wallet'
                  ? 'border-primary-dark bg-sky-50 text-primary-dark shadow-sm'
                  : 'border-borderSubtle text-text-muted hover:bg-slate-50'
              }`}
            >
              <Wallet className="w-4 h-4" aria-hidden="true" />
              <span>Mercado Pago</span>
            </button>

            <button
              type="button"
              onClick={() => setPaymentMethod('transfer')}
              className={`p-2.5 rounded-lg border text-xs font-semibold flex flex-col items-center gap-1 transition-all ${
                paymentMethod === 'transfer'
                  ? 'border-primary-dark bg-sky-50 text-primary-dark shadow-sm'
                  : 'border-borderSubtle text-text-muted hover:bg-slate-50'
              }`}
            >
              <Building2 className="w-4 h-4" aria-hidden="true" />
              <span>Transferencia / DEBIN</span>
            </button>
          </div>

          {/* Formulario de Tarjeta */}
          {paymentMethod === 'credit_card' && (
            <div className="bg-slate-50/70 p-4 rounded-xl border border-borderSubtle space-y-3">
              <div>
                <label htmlFor="card-number" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Número de Tarjeta
                </label>
                <div className="relative">
                  <input
                    id="card-number"
                    type="text"
                    required
                    value={cardNumber}
                    onChange={handleCardNumberChange}
                    placeholder="1234 5678 9012 3456"
                    className="input-field font-mono text-sm tracking-widest pl-10"
                  />
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" aria-hidden="true" />
                  <span className="absolute right-3 top-2.5 text-xs font-bold text-slate-400 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                    {cardNumber.startsWith('4') ? 'VISA' : 'MC'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="card-holder" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                    Titular de la Tarjeta
                  </label>
                  <input
                    id="card-holder"
                    type="text"
                    required
                    value={cardHolder}
                    onChange={(e) => setCardHolder(e.target.value)}
                    placeholder="Como figura en la tarjeta"
                    className="input-field text-xs uppercase"
                  />
                </div>

                <div>
                  <label htmlFor="card-dni" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                    DNI del Titular
                  </label>
                  <input
                    id="card-dni"
                    type="text"
                    required
                    value={cardDni}
                    onChange={(e) => setCardDni(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ej: 41354968"
                    className="input-field text-xs font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="card-expiry" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                    Vencimiento (MM/AA)
                  </label>
                  <input
                    id="card-expiry"
                    type="text"
                    required
                    maxLength={5}
                    value={cardExpiry}
                    onChange={(e) => setCardExpiry(e.target.value)}
                    placeholder="MM/AA"
                    className="input-field font-mono text-xs text-center"
                  />
                </div>

                <div>
                  <label htmlFor="card-cvv" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                    Código de Seguridad (CVV)
                  </label>
                  <input
                    id="card-cvv"
                    type="password"
                    required
                    maxLength={4}
                    value={cardCvv}
                    onChange={(e) => setCardCvv(e.target.value)}
                    placeholder="123"
                    className="input-field font-mono text-xs text-center"
                  />
                </div>
              </div>
            </div>
          )}

          {paymentMethod === 'wallet' && (
            <div className="bg-sky-50/70 p-4 rounded-xl border border-sky-200 text-xs text-sky-950 space-y-2">
              <div className="font-bold text-sm flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-sky-700" aria-hidden="true" />
                Dinero en Cuenta de Mercado Pago
              </div>
              <p className="text-text-muted leading-relaxed">
                Al confirmar, se debitarán <strong>$ {amountToPayNow.toLocaleString('es-AR')}</strong> de tu saldo disponible en tu cuenta registrada de Mercado Pago con acreditación inmediata.
              </p>
            </div>
          )}

          {paymentMethod === 'transfer' && (
            <div className="bg-slate-50 p-4 rounded-xl border border-borderSubtle text-xs text-text-muted space-y-2">
              <div className="font-bold text-text-main text-sm flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-primary-dark" aria-hidden="true" />
                Transferencia Bancaria Inmediata / DEBIN
              </div>
              <p className="leading-relaxed">
                Recibirás un alias o código QR de recaudación bancaria con acreditación automática sin costo para validar el turno.
              </p>
            </div>
          )}
        </div>

        {/* Política de Cancelación y Reintegro (Criterio 3 - HU11) */}
        <div className="card space-y-3">
          <div className="flex items-start gap-2.5">
            <Info className="w-5 h-5 text-sky-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider">
                Políticas de Cancelación y Reintegro (HU11)
              </h3>
              <p className="text-xs text-text-muted mt-1 leading-relaxed">
                {CANCELLATION_POLICY.TEXT}
              </p>
            </div>
          </div>

          <label className="flex items-start gap-2.5 pt-2 border-t border-borderSubtle cursor-pointer text-xs">
            <input
              type="checkbox"
              required
              checked={acceptPolicy}
              onChange={(e) => setAcceptPolicy(e.target.checked)}
              className="mt-0.5 rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
            />
            <span className="text-text-main font-medium leading-snug">
              He leído y acepto los términos de contratación, la política de cancelación anticipada (24 hs) y el consentimiento de tratamiento de datos personales (Ley 25.326).
            </span>
          </label>
        </div>

        {/* Selector de Simulación de la Pasarela (Para pruebas y defensa de TFI) */}
        <div className="bg-amber-50/70 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950">
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <span className="font-bold flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-amber-700" aria-hidden="true" />
              Simulador de Escenarios de la Pasarela (Evaluación UTN):
            </span>
            <span className="text-[10px] font-mono bg-amber-200 text-amber-900 px-2 py-0.5 rounded">
              Sandbox MP
            </span>
          </div>
          <div className="flex flex-wrap gap-3 items-center pt-1">
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="radio"
                name="simOutcome"
                value="approved"
                checked={simulateOutcome === 'approved'}
                onChange={() => setSimulateOutcome('approved')}
                className="text-amber-700 focus:ring-amber-700"
              />
              Aprobado (Éxito 200)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="radio"
                name="simOutcome"
                value="rejected"
                checked={simulateOutcome === 'rejected'}
                onChange={() => setSimulateOutcome('rejected')}
                className="text-amber-700 focus:ring-amber-700"
              />
              Rechazado (Tarjeta/Fondos)
            </label>
            <label className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="radio"
                name="simOutcome"
                value="collision"
                checked={simulateOutcome === 'collision'}
                onChange={() => setSimulateOutcome('collision')}
                className="text-amber-700 focus:ring-amber-700"
              />
              Colisión de Concurrencia (409)
            </label>
          </div>
        </div>

        {/* Botón de Confirmación y Pago */}
        <button
          type="submit"
          disabled={isProcessing}
          className="w-full bg-emerald-700 text-white py-4 rounded-xl font-bold text-lg hover:bg-emerald-800 transition-colors shadow-lg flex items-center justify-center gap-2 disabled:bg-slate-300 disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-emerald-700"
        >
          {isProcessing ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" aria-hidden="true"></div>
              <span>Conectando con pasarela Mercado Pago...</span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-5 h-5" aria-hidden="true" />
              <span>Abonar $ {amountToPayNow.toLocaleString('es-AR')} y Confirmar Turno</span>
            </>
          )}
        </button>
      </form>

      {/* Modal de Comprobante Oficial (Criterio 2 - HU11) */}
      {completedReceipt && (
        <PaymentReceiptModal
          receipt={completedReceipt}
          isOpen={showReceiptModal}
          onClose={() => {
            setShowReceiptModal(false);
            navigate('/mis-turnos?exito=true');
          }}
        />
      )}
    </div>
  );
}
