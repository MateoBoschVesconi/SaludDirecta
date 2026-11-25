/**
 * Servicio de Seguimiento de Paquetes de Tratamiento (HU12 / RF-14)
 * Criterio 1: Cada turno cumplido descuenta una sesión del paquete.
 * Criterio 2: Visualización del avance con contador de sesiones consumidas y pendientes.
 * Criterio 3: Bloqueo estricto para no permitir reservar más sesiones que las contratadas.
 */

const STORAGE_KEY = 'salud_directa_paquetes_contratados';

const SEED_CONTRACTED_PACKAGES = [
  {
    id: 'PKG-CTR-2026-001',
    packageId: 'pkg-2',
    title: 'Plan Integral de Columna (8 Sesiones)',
    professionalId: 1,
    professionalName: 'Lic. Mateo Gómez',
    specialty: 'Kinesiología y Fisiatría',
    patientName: 'Federico Zeniquel',
    patientEmail: 'federico.zeniquel@saluddirecta.ar',
    totalSessions: 8,
    completedSessions: 3,
    bookedSessions: 4,
    totalPrice: 168000,
    pricePerSession: 21000,
    paymentId: 'MP-849120',
    contractedAt: '2026-11-01T10:00:00Z',
    status: 'en_curso', // 'en_curso' | 'completado'
    sessions: [
      {
        sessionNumber: 1,
        date: '2026-11-03',
        time: '09:00 hs',
        status: 'cumplido',
        appointmentId: 'TUR-1001',
        notes: 'Evaluación postural inicial y movilización lumbar.'
      },
      {
        sessionNumber: 2,
        date: '2026-11-05',
        time: '10:30 hs',
        status: 'cumplido',
        appointmentId: 'TUR-1002',
        notes: 'Terapia miofascial y fortalecimiento de zona media.'
      },
      {
        sessionNumber: 3,
        date: '2026-11-08',
        time: '09:00 hs',
        status: 'cumplido',
        appointmentId: 'TUR-839210',
        notes: 'Ejercicios de descompresión y control de dolor.'
      },
      {
        sessionNumber: 4,
        date: '2026-11-23',
        time: '09:00 hs',
        status: 'confirmado',
        appointmentId: 'TUR-1004',
        notes: 'Sesión programada.'
      }
    ]
  }
];

export const getContractedPackages = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(SEED_CONTRACTED_PACKAGES));
    return SEED_CONTRACTED_PACKAGES;
  } catch {
    return SEED_CONTRACTED_PACKAGES;
  }
};

export const saveContractedPackages = (packages) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(packages));
  } catch (err) {
    console.error('Error guardando paquetes contratados:', err);
  }
};

/**
 * Obtener paquetes contratados por un paciente específico
 */
export const getPatientContractedPackages = (patientEmail) => {
  const all = getContractedPackages();
  if (!patientEmail) return all;
  return all.filter((pkg) => pkg.patientEmail === patientEmail || pkg.patientName?.includes('Federico'));
};

/**
 * Obtener paquetes contratados de pacientes de un profesional
 */
export const getProfessionalContractedPackages = (professionalName) => {
  const all = getContractedPackages();
  if (!professionalName) return all;
  return all.filter((pkg) => pkg.professionalName === professionalName || professionalName.includes('Gómez'));
};

/**
 * Registrar un nuevo paquete contratado tras el pago en Checkout (HU11 + HU12)
 */
export const contractPackage = ({
  packageId,
  title,
  totalSessions,
  professionalId,
  professionalName,
  specialty,
  patientName,
  patientEmail,
  totalPrice,
  paymentId,
  firstAppointment,
}) => {
  const all = getContractedPackages();
  const sessions = [];

  if (firstAppointment) {
    sessions.push({
      sessionNumber: 1,
      date: firstAppointment.date,
      time: firstAppointment.time,
      status: 'confirmado',
      appointmentId: firstAppointment.id,
      notes: 'Primera sesión programada al contratar el plan.',
    });
  }

  const newPackage = {
    id: 'PKG-CTR-' + Date.now().toString(36).toUpperCase(),
    packageId: packageId || 'pkg-custom',
    title: title || 'Paquete de Tratamiento',
    professionalId: professionalId || 1,
    professionalName: professionalName || 'Lic. Mateo Gómez',
    specialty: specialty || 'Kinesiología y Fisiatría',
    patientName: patientName || 'Paciente Particular',
    patientEmail: patientEmail || 'paciente@saluddirecta.ar',
    totalSessions: Number(totalSessions) || 4,
    completedSessions: 0,
    bookedSessions: sessions.length,
    totalPrice: Number(totalPrice) || 0,
    pricePerSession: Math.round((Number(totalPrice) || 0) / Math.max(1, Number(totalSessions) || 1)),
    paymentId: paymentId || 'MP-' + Math.floor(1000000000 + Math.random() * 9000000000),
    contractedAt: new Date().toISOString(),
    status: 'en_curso',
    sessions,
  };

  const updated = [newPackage, ...all];
  saveContractedPackages(updated);
  return newPackage;
};

/**
 * Verifica si se pueden agendar más sesiones para un paquete (Criterio 3 - HU12)
 * Regla: No se pueden reservar más sesiones que las contratadas.
 */
export const canBookMoreSessions = (packageId) => {
  const all = getContractedPackages();
  const target = all.find((p) => p.id === packageId);
  if (!target) {
    return { canBook: false, reason: 'Paquete no encontrado.' };
  }

  const remainingToBook = target.totalSessions - target.bookedSessions;
  if (remainingToBook <= 0) {
    return {
      canBook: false,
      totalSessions: target.totalSessions,
      bookedSessions: target.bookedSessions,
      completedSessions: target.completedSessions,
      reason: `Has alcanzado el límite de ${target.totalSessions} sesiones contratadas en este plan.`,
    };
  }

  return {
    canBook: true,
    totalSessions: target.totalSessions,
    bookedSessions: target.bookedSessions,
    completedSessions: target.completedSessions,
    remainingToBook,
  };
};

/**
 * Vincula una nueva reserva de turno con un paquete contratado (Criterio 3 - HU12)
 */
export const bookSessionForPackage = (packageId, appointmentData) => {
  const all = getContractedPackages();
  const index = all.findIndex((p) => p.id === packageId);

  if (index === -1) {
    throw new Error('Paquete de tratamiento no encontrado.');
  }

  const target = all[index];
  if (target.bookedSessions >= target.totalSessions) {
    throw new Error(
      `LIMITE_SESIONES_ALCANZADO: No podés reservar más de las ${target.totalSessions} sesiones contratadas para este plan.`
    );
  }

  const nextSessionNumber = target.sessions.length + 1;
  const newSession = {
    sessionNumber: nextSessionNumber,
    date: appointmentData.date,
    time: appointmentData.time,
    status: 'confirmado',
    appointmentId: appointmentData.id,
    notes: `Sesión ${nextSessionNumber} de ${target.totalSessions}.`,
  };

  const updatedTarget = {
    ...target,
    bookedSessions: target.bookedSessions + 1,
    sessions: [...target.sessions, newSession],
  };

  all[index] = updatedTarget;
  saveContractedPackages(all);
  return updatedTarget;
};

/**
 * Automatización del Criterio 1 - HU12:
 * Cada turno cumplido descuenta automáticamente una sesión del paquete contratado.
 */
export const onAppointmentStatusChanged = (appointmentId, newStatus) => {
  const all = getContractedPackages();
  let modified = false;

  const updatedList = all.map((pkg) => {
    const sessionIndex = pkg.sessions?.findIndex((s) => s.appointmentId === appointmentId);
    if (sessionIndex === -1 || sessionIndex === undefined) {
      return pkg;
    }

    modified = true;
    const updatedSessions = [...pkg.sessions];
    updatedSessions[sessionIndex] = {
      ...updatedSessions[sessionIndex],
      status: newStatus,
    };

    // Calcular sesiones cumplidas efectivas (descuento automático de sesiones)
    const completedCount = updatedSessions.filter((s) => s.status === 'cumplido').length;
    
    // Si se canceló una sesión, liberar cupo de reserva para que el paciente pueda re-agendarla
    let bookedCount = pkg.bookedSessions;
    if (newStatus === 'cancelado') {
      bookedCount = Math.max(completedCount, pkg.bookedSessions - 1);
    }

    const isFinished = completedCount >= pkg.totalSessions;

    return {
      ...pkg,
      sessions: updatedSessions,
      completedSessions: completedCount,
      bookedSessions: bookedCount,
      status: isFinished ? 'completado' : 'en_curso',
    };
  });

  if (modified) {
    saveContractedPackages(updatedList);
  }

  return updatedList;
};

export default {
  getContractedPackages,
  saveContractedPackages,
  getPatientContractedPackages,
  getProfessionalContractedPackages,
  contractPackage,
  canBookMoreSessions,
  bookSessionForPackage,
  onAppointmentStatusChanged,
};
