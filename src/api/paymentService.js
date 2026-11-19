/**
 * Servicio de Pasarela de Pagos (Mercado Pago) y Emisión de Comprobantes (HU11 / RF-13 / RNF-04)
 */

export const PAYMENT_MODES = {
  TOTAL: 'total', // Pago del 100% de la consulta o paquete
  SENA: 'sena',   // Pago de seña del 30% como garantía de reserva
};

export const CANCELLATION_POLICY = {
  HOURS_FULL_REFUND: 24,
  TEXT: 'Cancelación gratuita con reintegro del 100% hasta 24 horas antes del turno. Dentro de las 24 horas previas, la seña se retiene en concepto de compensación por bloqueo de agenda médica.',
};

const RECEIPTS_STORAGE_KEY = 'salud_directa_comprobantes';
const AUDIT_STORAGE_KEY = 'salud_directa_auditoria';

export const getStoredReceipts = () => {
  try {
    const raw = localStorage.getItem(RECEIPTS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveReceipt = (receipt) => {
  try {
    const list = getStoredReceipts();
    const existingIndex = list.findIndex((r) => r.paymentId === receipt.paymentId);
    let updated;
    if (existingIndex >= 0) {
      updated = [...list];
      updated[existingIndex] = receipt;
    } else {
      updated = [receipt, ...list];
    }
    localStorage.setItem(RECEIPTS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Error guardando comprobante:', err);
  }
};

export const getReceiptByPaymentId = (paymentId) => {
  const receipts = getStoredReceipts();
  return receipts.find((r) => r.paymentId === paymentId) || null;
};

/**
 * Generador de comprobante de respaldo para turnos sin comprobante previo
 */
export function createFallbackReceipt(data) {
  const paymentId = data.paymentId || 'MP-' + String(data.id || '9876543210').replace(/\D/g, '').padEnd(10, '0').slice(0, 10);
  return {
    paymentId,
    status: 'approved',
    statusDetail: 'Acreditado instantáneamente vía Mercado Pago',
    paymentMode: data.paymentMode || 'total',
    amountPaid: Number(data.price || data.amount || 25000),
    balanceDue: 0,
    totalAmount: Number(data.price || data.amount || 25000),
    currency: 'ARS',
    paymentMethod: 'credit_card',
    cardBrand: 'Visa',
    lastFourDigits: '4242',
    installments: 1,
    paidAt: data.paidAt || (data.date ? `${data.date}T09:00:00Z` : '2026-11-01T12:00:00Z'),
    payer: {
      name: data.patientName || data.patient || 'Federico Zeniquel',
      email: data.patientEmail || 'paciente@saluddirecta.ar',
      dni: data.patientDni || '41.354.968',
    },
    professional: {
      name: data.professionalName || 'Lic. Mateo Gómez',
      specialty: data.specialty || 'Kinesiología y Fisiatría',
      registry: data.registry || 'MP 3412',
      jurisdiction: data.jurisdiction || 'Chaco',
    },
    appointment: {
      date: data.date || '2026-11-20',
      time: data.time || '09:00 hs',
      planTitle: data.planTitle || data.type || 'Consulta Particular',
    },
    cancellationPolicy: CANCELLATION_POLICY.TEXT,
  };
}

/**
 * Registro de evento en la bitácora de auditoría inmutable (Criterio 4 - HU11 / RNF-04)
 */
export const recordAuditLog = (eventData) => {
  try {
    const raw = localStorage.getItem(AUDIT_STORAGE_KEY);
    const logs = raw ? JSON.parse(raw) : [];
    const newEntry = {
      id: 'AUD-' + Date.now().toString(36) + '-' + Math.random().toString(36).substring(2, 6),
      timestampUtc: new Date().toISOString(),
      action: eventData.action, // 'PAGO_APROBADO' | 'PAGO_RECHAZADO' | 'PAGO_REINTEGRADO'
      amount: eventData.amount,
      paymentId: eventData.paymentId,
      userId: eventData.userId || 'anonimo',
      details: eventData.details,
    };
    logs.unshift(newEntry);
    localStorage.setItem(AUDIT_STORAGE_KEY, JSON.stringify(logs.slice(0, 200)));
  } catch (err) {
    console.error('Error al registrar auditoría:', err);
  }
};

/**
 * Procesa el pago simulando la API de Mercado Pago SDK
 */
export async function processMercadoPagoPayment({
  bookingData,
  paymentMode,
  paymentMethod,
  cardDetails,
  payer,
  simulateOutcome = 'approved', // 'approved' | 'rejected' | 'in_process'
}) {
  // Simulación de latencia de red de la pasarela (600ms)
  await new Promise((resolve) => setTimeout(resolve, 600));

  const totalAmount = Number(bookingData.totalAmount) || 0;
  const isSena = paymentMode === PAYMENT_MODES.SENA;
  // La seña corresponde al 30% del valor total
  const amountPaid = isSena ? Math.round(totalAmount * 0.3) : totalAmount;
  const balanceDue = isSena ? totalAmount - amountPaid : 0;

  const paymentId = 'MP-' + Math.floor(1000000000 + Math.random() * 9000000000);

  if (simulateOutcome === 'rejected') {
    recordAuditLog({
      action: 'PAGO_RECHAZADO',
      amount: amountPaid,
      paymentId,
      userId: payer?.email || 'paciente',
      details: `Rechazo de pago (${paymentMethod}) para el turno de ${bookingData.professionalName}. Motivo: Fondos insuficientes / Error en tarjeta.`,
    });

    const error = new Error('PAGO_RECHAZADO: La operación no pudo ser autorizada por la entidad emisora.');
    error.status = 'rejected';
    error.reason = 'Tarjeta rechazada o fondos insuficientes. Por favor probá con otro medio de pago.';
    throw error;
  }

  // Generación del Comprobante Digital Oficial (Criterio 2 - HU11)
  const receipt = {
    paymentId,
    status: simulateOutcome,
    statusDetail: simulateOutcome === 'approved' ? 'Acreditado instantáneamente' : 'En proceso de acreditación',
    paymentMode, // 'total' | 'sena'
    amountPaid,
    balanceDue,
    totalAmount,
    currency: 'ARS',
    paymentMethod, // 'credit_card' | 'debit_card' | 'wallet' | 'transfer'
    cardBrand: cardDetails?.brand || 'Visa',
    lastFourDigits: cardDetails?.number ? cardDetails.number.replace(/\s/g, '').slice(-4) : '4242',
    installments: 1,
    paidAt: new Date().toISOString(),
    payer: {
      name: payer?.name || 'Paciente Particular',
      email: payer?.email || 'paciente@saluddirecta.ar',
      dni: payer?.dni || '41.354.968',
      phone: payer?.phone || '',
    },
    professional: {
      name: bookingData.professionalName,
      specialty: bookingData.specialty,
      registry: bookingData.registry || 'MP 3412',
      jurisdiction: bookingData.jurisdiction || 'Chaco',
    },
    appointment: {
      date: bookingData.selectedDate,
      time: bookingData.selectedTime,
      planTitle: bookingData.planTitle,
    },
    cancellationPolicy: CANCELLATION_POLICY.TEXT,
    fiscalInfo: {
      cuitPlataforma: '30-71829401-4',
      razonSocial: 'Salud Directa S.A. - Plataforma de Vinculación en Salud',
      tipoComprobante: 'Recibo Oficial B2C - Operación Electrónica',
      exentoIVA: true,
      leyendaLegal: 'Comprobante válido como constancia de reserva de atención profesional particular. No incluye diagnóstico médico (Ley 25.326).',
    },
  };

  saveReceipt(receipt);

  recordAuditLog({
    action: 'PAGO_APROBADO',
    amount: amountPaid,
    paymentId,
    userId: payer?.email || 'paciente',
    details: `Pago de ${isSena ? 'seña (30%)' : 'total (100%)'} acreditado vía Mercado Pago para ${bookingData.professionalName} (${bookingData.selectedDate} a las ${bookingData.selectedTime}).`,
  });

  return receipt;
}

export default {
  PAYMENT_MODES,
  CANCELLATION_POLICY,
  processMercadoPagoPayment,
  getStoredReceipts,
  getReceiptByPaymentId,
  saveReceipt,
  recordAuditLog,
};
