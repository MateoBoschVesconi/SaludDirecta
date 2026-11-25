import React, { useState, useEffect } from 'react';
import { 
  X, 
  Printer, 
  Copy, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar, 
  User, 
  Stethoscope, 
  CreditCard, 
  Info,
  Check
} from 'lucide-react';

export default function PaymentReceiptModal({ receipt, isOpen, onClose }) {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !receipt) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, receipt, onClose]);

  if (!isOpen || !receipt) return null;

  const handleCopy = () => {
    const textSummary = `
SALUD DIRECTA - COMPROBANTE OFICIAL DE PAGO
Transacción Mercado Pago: ${receipt.paymentId}
Fecha y Hora: ${new Date(receipt.paidAt).toLocaleString('es-AR')}
Estado: Acreditado (${receipt.statusDetail})

PROFESIONAL:
${receipt.professional?.name}
Especialidad: ${receipt.professional?.specialty}
Matrícula: ${receipt.professional?.registry} (${receipt.professional?.jurisdiction})

PACIENTE:
${receipt.payer?.name} - DNI: ${receipt.payer?.dni}

TURNO:
Fecha: ${receipt.appointment?.date} a las ${receipt.appointment?.time}
Prestación: ${receipt.appointment?.planTitle}

DETALLE DEL PAGO:
Total Prestación: $ ${Number(receipt.totalAmount || 0).toLocaleString('es-AR')}
Monto Abonado (${receipt.paymentMode === 'sena' ? 'Seña 30%' : 'Total 100%'}): $ ${Number(receipt.amountPaid || 0).toLocaleString('es-AR')}
${receipt.balanceDue > 0 ? `Saldo a abonar en consultorio: $ ${Number(receipt.balanceDue).toLocaleString('es-AR')}` : 'Saldo pendiente: $ 0'}
Medio de Pago: ${receipt.paymentMethod || 'Tarjeta'} (${receipt.cardBrand || 'Visa'} terminada en ${receipt.lastFourDigits || '4242'})

Política de Cancelación:
${receipt.cancellationPolicy}
    `.trim();

    navigator.clipboard.writeText(textSummary);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div 
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="receipt-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xl w-full max-h-[92vh] flex flex-col overflow-hidden border border-borderSubtle">
        {/* Cabecera del Modal */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-borderSubtle bg-slate-50/80">
          <div className="flex items-center gap-2">
            <div className="bg-primary-dark text-white p-1 rounded-md flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="receipt-title" className="text-sm font-bold text-text-main">
                Comprobante Oficial de Operación
              </h2>
              <span className="text-[11px] text-text-muted">Salud Directa · Mercado Pago</span>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="text-text-muted hover:text-text-main p-1.5 rounded-lg hover:bg-slate-200/60 transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark"
            aria-label="Cerrar comprobante"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Contenido imprimible */}
        <div id="printable-receipt" className="p-6 overflow-y-auto space-y-5 text-sm">
          {/* Banner de Aprobación */}
          <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-4 flex items-start gap-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="flex-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                <span className="font-bold text-sm text-emerald-950">
                  Pago Acreditado Exitosamente
                </span>
                <span className="font-mono text-xs font-extrabold text-emerald-900 bg-emerald-200/70 px-2 py-0.5 rounded">
                  {receipt.paymentId}
                </span>
              </div>
              <p className="text-xs text-emerald-800 mt-1">
                Transacción procesada y validada por la pasarela oficial de Mercado Pago.
              </p>
            </div>
          </div>

          {/* Información del Turno y Prestación */}
          <div className="bg-slate-50 rounded-xl p-4 border border-borderSubtle space-y-3">
            <div className="flex items-start justify-between gap-2 border-b border-borderSubtle pb-2.5">
              <div>
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                  Prestación Médica
                </span>
                <h3 className="font-bold text-base text-text-main">
                  {receipt.appointment?.planTitle || 'Consulta Particular'}
                </h3>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-text-muted tracking-wider block">
                  Fecha y Hora Emisión
                </span>
                <span className="text-xs font-medium text-text-main">
                  {new Date(receipt.paidAt).toLocaleString('es-AR', { dateStyle: 'short', timeStyle: 'short' })} hs
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
              <div className="flex items-start gap-2">
                <Stethoscope className="w-4 h-4 text-primary-dark flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="block text-text-main font-semibold">Profesional Actuante:</strong>
                  <span className="text-text-muted">{receipt.professional?.name}</span>
                  <span className="text-text-muted block">{receipt.professional?.specialty}</span>
                  <span className="text-text-muted block font-mono">
                    Matrícula: {receipt.professional?.registry} ({receipt.professional?.jurisdiction})
                  </span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Calendar className="w-4 h-4 text-primary-dark flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="block text-text-main font-semibold">Cita Programada:</strong>
                  <span className="text-text-main font-bold">
                    {receipt.appointment?.date} · {receipt.appointment?.time}
                  </span>
                  <span className="text-text-muted block">Atención presencial en consultorio</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <User className="w-4 h-4 text-primary-dark flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="block text-text-main font-semibold">Paciente Titular:</strong>
                  <span className="text-text-muted">{receipt.payer?.name}</span>
                  <span className="text-text-muted block font-mono">DNI: {receipt.payer?.dni}</span>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <CreditCard className="w-4 h-4 text-primary-dark flex-shrink-0 mt-0.5" aria-hidden="true" />
                <div>
                  <strong className="block text-text-main font-semibold">Medio de Pago:</strong>
                  <span className="text-text-muted">
                    {receipt.cardBrand || 'Tarjeta'} **** {receipt.lastFourDigits}
                  </span>
                  <span className="text-text-muted block">1 cuota · Operación Segura</span>
                </div>
              </div>
            </div>
          </div>

          {/* Desglose Financiero */}
          <div className="border border-borderSubtle rounded-xl p-4 space-y-2">
            <h4 className="text-xs font-bold text-text-main uppercase tracking-wider mb-2">
              Liquidación de la Operación
            </h4>
            
            <div className="flex justify-between text-xs text-text-muted">
              <span>Valor total de la prestación:</span>
              <span className="font-mono">$ {Number(receipt.totalAmount || 0).toLocaleString('es-AR')}</span>
            </div>

            <div className="flex justify-between text-xs text-text-muted">
              <span>Modalidad contratada:</span>
              <span className="font-semibold text-text-main">
                {receipt.paymentMode === 'sena' ? 'Seña de reserva (30%)' : 'Pago Total (100%)'}
              </span>
            </div>

            <div className="flex justify-between text-xs text-text-muted">
              <span>Cargos por servicio de plataforma:</span>
              <span className="text-emerald-700 font-semibold">$ 0,00 (Bonificado)</span>
            </div>

            <div className="pt-2 border-t border-borderSubtle flex justify-between items-center text-sm font-bold text-text-main">
              <span>Total abonado en línea:</span>
              <span className="text-lg font-extrabold text-emerald-800 font-mono">
                $ {Number(receipt.amountPaid || 0).toLocaleString('es-AR')}
              </span>
            </div>

            {receipt.balanceDue > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mt-2 flex justify-between items-center text-xs text-amber-900">
                <span className="font-medium">Saldo restante a abonar en el consultorio:</span>
                <span className="font-bold font-mono text-sm">
                  $ {Number(receipt.balanceDue).toLocaleString('es-AR')}
                </span>
              </div>
            )}
          </div>

          {/* Política de Cancelación y Reintegro (Criterio 3 - HU11) */}
          <div className="bg-slate-50 rounded-xl p-3 border border-borderSubtle text-[11px] text-text-muted space-y-1">
            <div className="font-semibold text-text-main flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-sky-700" aria-hidden="true" />
              Política de Cancelación y Reintegro (HU11)
            </div>
            <p className="leading-relaxed">
              {receipt.cancellationPolicy}
            </p>
          </div>

          {/* Leyenda Legal y Protección de Datos (Ley 25.326 / RNF-02) */}
          <div className="pt-2 border-t border-dashed border-borderSubtle text-[10px] text-text-muted leading-tight text-center space-y-0.5">
            <p>Salud Directa S.A. · CUIT 30-71829401-4 · Comprobante emitido electrónicamente</p>
            <p>Este documento no contiene diagnóstico médico ni historia clínica (Ley 25.326).</p>
          </div>
        </div>

        {/* Barra de Acciones */}
        <div className="p-4 border-t border-borderSubtle bg-slate-50 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary-dark"
            >
              <Printer className="w-4 h-4 text-slate-600" aria-hidden="true" />
              Imprimir / Guardar PDF
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="btn-secondary text-xs py-2 px-3 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary-dark"
            >
              {copied ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" aria-hidden="true" />
                  <span className="text-emerald-800 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 text-slate-600" aria-hidden="true" />
                  Copiar Datos
                </>
              )}
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="btn-primary text-xs py-2 px-4 shadow-sm"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
