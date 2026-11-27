import apiClient from '../api/apiClient';
import { PROFESSIONALS } from '../data/professionalsData';
import { filterAndSortProfessionals } from '../utils/searchEngine';
import {
  NON_DIAGNOSTIC_DISCLAIMER,
  EMERGENCY_CONTACTS,
  MENTAL_HEALTH_CRISIS_CONTACT,
  detectEmergency,
  analyzeOrientationQuery,
} from '../utils/orientationEngine';
import { getJsonItem, setJsonItem, removeItem } from '../utils/storage';

const KEYS = {
  USER: 'salud_directa_user',
  REGISTERED_USERS: 'salud_directa_registered_users',
  APPOINTMENTS: 'salud_directa_turnos',
  PACKAGES: 'salud_directa_paquetes_contratados',
  RECEIPTS: 'salud_directa_comprobantes',
  NOTIFICATIONS: 'salud_directa_notificaciones',
};

export const CANCELLATION_POLICY_TEXT =
  'Cancelación gratuita con reintegro del 100% hasta 24 horas antes del turno. Dentro de las 24 horas previas, la seña se retiene como compensación por bloqueo de agenda médica.';

const SEED_APPOINTMENTS = [
  {
    id: 'TUR-839210',
    professionalId: 1,
    professionalName: 'Lic. Mateo Gómez',
    specialty: 'Kinesiología y Fisiatría',
    registry: 'MP 3412',
    jurisdiction: 'Chaco',
    planTitle: 'Consulta Individual',
    date: '2026-11-30',
    time: '09:00 hs',
    price: 25000,
    amountPaid: 25000,
    balanceDue: 0,
    paymentMode: 'total',
    status: 'confirmado',
    paidAt: '2026-11-24T14:30:00Z',
    paymentId: 'MP-849120',
  },
];

const SEED_PACKAGES = [
  {
    id: 'PKG-CTR-2026-001',
    packageId: 'p2',
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
    status: 'en_curso',
    sessions: [
      { sessionNumber: 1, date: '2026-11-03', time: '09:00 hs', status: 'cumplido', appointmentId: 'TUR-1001' },
      { sessionNumber: 2, date: '2026-11-05', time: '10:30 hs', status: 'cumplido', appointmentId: 'TUR-1002' },
      { sessionNumber: 3, date: '2026-11-08', time: '09:00 hs', status: 'cumplido', appointmentId: 'TUR-1003' },
      { sessionNumber: 4, date: '2026-11-30', time: '09:00 hs', status: 'confirmado', appointmentId: 'TUR-839210' },
    ],
  },
];

const SEED_NOTIFICATIONS = [
  {
    id: 'NOTIF-1',
    tipo: 'recordatorio_24h',
    asunto: 'Recordatorio de turno próximo (HU10)',
    mensaje: 'Tenés un turno confirmado con Lic. Mateo Gómez el 30/11/2026 a las 09:00 hs.',
    leida: false,
    creadoEn: '2026-11-25T10:00:00Z',
  },
  {
    id: 'NOTIF-2',
    tipo: 'confirmacion',
    asunto: 'Turno y pago acreditados (Mercado Pago)',
    mensaje: 'Se confirmó tu reserva TUR-839210. Comprobante MP-849120 disponible en Mis Turnos.',
    leida: true,
    creadoEn: '2026-11-24T14:32:00Z',
  },
];

function extractHttpError(err, fallbackMsg) {
  return (
    err?.response?.data?.detail ||
    err?.response?.data?.mensaje ||
    err?.response?.data?.title ||
    fallbackMsg
  );
}

// ---------- Autenticación Paciente (HU1 / HU14) ----------

export async function loginUser({ email, password }) {
  try {
    const response = await apiClient.post('/auth/login', { email, password });
    return response.data;
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error(
        'Demasiados intentos en poco tiempo. Por seguridad, esperá un minuto antes de volver a intentar.'
      );
    }
    if (err.response) {
      throw new Error(
        extractHttpError(err, 'Credenciales inválidas. Verificá tu correo y contraseña.')
      );
    }

    // API offline -> fallback de desarrollo seguro
    const registered = await getJsonItem(KEYS.REGISTERED_USERS, []);
    const found = registered.find((u) => u.email?.toLowerCase() === email?.toLowerCase());
    if (found) {
      return { user: found, token: `mock_mobile_jwt_${Date.now()}` };
    }

    const rawName = String(email || '')
      .split('@')[0]
      .replace(/[0-9_]/g, ' ')
      .trim();
    const formattedName =
      rawName
        .split(/[\s.]+/)
        .filter(Boolean)
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(' ') || 'Paciente Particular';

    return {
      user: {
        id: `pac-${Date.now()}`,
        nombre: formattedName,
        email,
        rol: 'paciente',
      },
      token: `mock_mobile_jwt_${Date.now()}`,
    };
  }
}

export async function registerUser({ nombre, email, telefono, password }) {
  try {
    const response = await apiClient.post('/auth/register', {
      nombre,
      email,
      telefono,
      password,
      rol: 'paciente',
      consentimientoAceptado: true,
    });

    const registered = await getJsonItem(KEYS.REGISTERED_USERS, []);
    const publicUser = {
      id: response.data?.user?.id || `pac-${Date.now()}`,
      nombre,
      email,
      telefono,
      rol: 'paciente',
      consentimientoAceptadoEn: new Date().toISOString(),
    };
    const nextList = [
      publicUser,
      ...registered.filter((u) => u.email?.toLowerCase() !== email?.toLowerCase()),
    ];
    await setJsonItem(KEYS.REGISTERED_USERS, nextList);

    return response.data;
  } catch (err) {
    if (err.response?.status === 429) {
      throw new Error(
        'Demasiados intentos de registro en poco tiempo. Por seguridad, esperá un minuto antes de volver a intentar.'
      );
    }
    if (err.response) {
      throw new Error(
        extractHttpError(err, 'No se pudo completar el registro. Verificá los datos.')
      );
    }

    // Fallback offline (sin guardar password según Ley 25.326)
    const newUser = {
      id: `pac-${Date.now()}`,
      nombre,
      email,
      telefono,
      rol: 'paciente',
      consentimientoAceptadoEn: new Date().toISOString(),
    };
    const registered = await getJsonItem(KEYS.REGISTERED_USERS, []);
    const nextList = [
      newUser,
      ...registered.filter((u) => u.email?.toLowerCase() !== email?.toLowerCase()),
    ];
    await setJsonItem(KEYS.REGISTERED_USERS, nextList);

    return { user: newUser, token: `mock_mobile_jwt_reg_${Date.now()}` };
  }
}

// ---------- Profesionales y Búsqueda (HU6) ----------

export async function getProfessionals() {
  return PROFESSIONALS;
}

export async function getProfessionalById(id) {
  return PROFESSIONALS.find((p) => String(p.id) === String(id)) || null;
}

// ---------- Orientación Asistida por IA (HU7) ----------

export async function orientarPaciente(descripcion, options = {}) {
  const cleaned = String(descripcion ?? '').trim();
  if (cleaned.length < 6) {
    throw new Error('Describí brevemente qué necesitás (al menos 6 caracteres).');
  }

  const emergency = detectEmergency(cleaned);
  if (emergency.isEmergency) {
    return {
      status: 'emergency',
      isEmergency: true,
      isMentalHealthCrisis: emergency.isMentalHealthCrisis,
      matchedTerms: emergency.matchedTerms,
      emergencyContacts: [
        ...EMERGENCY_CONTACTS,
        ...(emergency.isMentalHealthCrisis ? [MENTAL_HEALTH_CRISIS_CONTACT] : []),
      ],
      suggestions: [],
      disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
      source: 'emergency_guard',
    };
  }

  if (options.simulateUnavailable === true) {
    return {
      status: 'unavailable',
      isEmergency: false,
      suggestions: [],
      disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
      source: 'unavailable',
      error:
        'El servicio de orientación asistida por IA no está disponible en este momento. Podés seguir buscando normalmente con los filtros combinables.',
    };
  }

  const enrich = (items = []) =>
    items.map((item) => {
      const profName = item.profession || item.profesion || '';
      const pros = filterAndSortProfessionals(PROFESSIONALS, {
        profession: profName,
        sortBy: 'relevance',
      }).slice(0, 2);
      return {
        profession: profName,
        specialtyFocus: item.specialtyFocus || item.especialidad || profName,
        affinityLabel: item.affinityLabel || item.afinidad || 'Afinidad sugerida',
        reason: item.reason || item.motivo || '',
        professionals: pros,
      };
    });

  try {
    const response = await apiClient.post(
      '/orientacion',
      { descripcion: cleaned },
      { timeout: 2500 }
    );
    const data = response.data || {};
    if (data.esUrgencia || data.isEmergency) {
      return {
        status: 'emergency',
        isEmergency: true,
        isMentalHealthCrisis: Boolean(data.isMentalHealthCrisis),
        emergencyContacts: EMERGENCY_CONTACTS,
        suggestions: [],
        disclaimer: data.advertencia || NON_DIAGNOSTIC_DISCLAIMER,
        source: 'api',
      };
    }
    const suggestions = enrich(data.sugerencias || data.suggestions || []);
    return {
      status: suggestions.length > 0 ? 'ok' : 'no_match',
      isEmergency: false,
      suggestions,
      disclaimer: data.advertencia || NON_DIAGNOSTIC_DISCLAIMER,
      source: 'api',
    };
  } catch (err) {
    if (err.response?.status === 503) {
      return {
        status: 'unavailable',
        isEmergency: false,
        suggestions: [],
        disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
        source: 'unavailable',
        error: extractHttpError(
          err,
          'El servicio de orientación asistida por IA no está disponible en este momento.'
        ),
      };
    }

    const analysis = analyzeOrientationQuery(cleaned);
    return {
      ...analysis,
      suggestions: enrich(analysis.suggestions),
      source: 'semantic_local',
    };
  }
}

// ---------- Turnos, Concurrencia y Notificaciones (HU9 / HU10 / HU11) ----------

export async function getAppointments() {
  const local = await getJsonItem(KEYS.APPOINTMENTS, null);
  const localList = Array.isArray(local) ? local : SEED_APPOINTMENTS;
  if (!local) {
    await setJsonItem(KEYS.APPOINTMENTS, SEED_APPOINTMENTS);
  }

  try {
    const response = await apiClient.get('/turnos/me');
    if (Array.isArray(response.data) && response.data.length > 0) {
      return response.data.map((t) => ({
        id: t.id,
        professionalName: t.profesional,
        patientName: t.paciente,
        date: t.fecha,
        time: `${t.hora} hs`,
        status: t.estado,
        price: 25000,
        amountPaid: 25000,
        balanceDue: 0,
        paymentMode: 'total',
        planTitle: 'Consulta Médica',
        paymentId: `MP-${String(t.id).slice(0, 6).toUpperCase()}`,
      }));
    }
  } catch {
    // Fallback local
  }

  return localList;
}

export async function getBookedSlots(professionalName, date) {
  const list = await getAppointments();
  return list
    .filter(
      (appt) =>
        appt.professionalName === professionalName &&
        appt.date === date &&
        appt.status !== 'cancelado'
    )
    .map((appt) => appt.time);
}

export async function bookAppointment(appointmentData) {
  const list = await getAppointments();
  const isOccupied = list.some(
    (a) =>
      a.professionalName === appointmentData.professionalName &&
      a.date === appointmentData.date &&
      a.time === appointmentData.time &&
      a.status !== 'cancelado'
  );

  if (isOccupied) {
    throw new Error(
      'CONCURRENCY_COLLISION: El horario seleccionado acaba de ser reservado por otro paciente.'
    );
  }

  const totalAmount = Number(appointmentData.totalAmount) || 0;
  const isSena = appointmentData.paymentMode === 'sena';
  const amountPaid = isSena ? Math.round(totalAmount * 0.3) : totalAmount;
  const balanceDue = Math.max(0, totalAmount - amountPaid);
  const paymentId =
    appointmentData.paymentId || `MP-${Math.floor(100000 + Math.random() * 900000)}`;
  const paidAt = new Date().toISOString();

  // Intentar reserva contra el backend .NET 8 si hay sesión y GUID
  try {
    await apiClient.post('/turnos', {
      profesionalId: appointmentData.professionalId,
      fecha: appointmentData.date,
      hora: String(appointmentData.time || '').replace(' hs', '').trim(),
      prestacionId: appointmentData.prestacionId || null,
    });
  } catch {
    // Fallback local persistente
  }

  const newAppt = {
    id: `TUR-${Math.floor(100000 + Math.random() * 900000)}`,
    professionalId: appointmentData.professionalId,
    professionalName: appointmentData.professionalName,
    specialty: appointmentData.specialty,
    registry: appointmentData.registry || 'MP 3412',
    jurisdiction: appointmentData.jurisdiction || 'Chaco',
    planTitle: appointmentData.planTitle || 'Consulta Individual',
    date: appointmentData.date,
    time: appointmentData.time,
    price: totalAmount,
    amountPaid,
    balanceDue,
    paymentMode: appointmentData.paymentMode || 'total',
    paymentMethod: appointmentData.paymentMethod || 'credit_card',
    status: 'confirmado',
    paidAt,
    paymentId,
  };

  await setJsonItem(KEYS.APPOINTMENTS, [newAppt, ...list]);

  const receipt = buildReceiptFromAppointment(newAppt, appointmentData.payer);
  const receipts = await getJsonItem(KEYS.RECEIPTS, []);
  await setJsonItem(KEYS.RECEIPTS, [
    receipt,
    ...receipts.filter((r) => r.paymentId !== receipt.paymentId),
  ]);

  const currentNotifs = await getNotifications();
  const newNotif = {
    id: `NOTIF-${Date.now()}`,
    tipo: 'confirmacion',
    asunto: 'Turno confirmado y comprobante emitido',
    mensaje: `Tu turno con ${newAppt.professionalName} (${newAppt.date} ${newAppt.time}) fue acreditado (${paymentId}).`,
    leida: false,
    creadoEn: paidAt,
  };
  await setJsonItem(KEYS.NOTIFICATIONS, [newNotif, ...currentNotifs]);

  return { appointment: newAppt, receipt };
}

export function buildReceiptFromAppointment(appt, payerOverride = null) {
  return {
    paymentId: appt.paymentId || `MP-${String(appt.id || '849120').slice(-6)}`,
    status: 'approved',
    statusDetail: 'Acreditado vía Mercado Pago',
    paymentMode: appt.paymentMode || 'total',
    amountPaid: Number(appt.amountPaid ?? appt.price) || 0,
    balanceDue: Number(appt.balanceDue) || 0,
    totalAmount: Number(appt.price) || 0,
    currency: 'ARS',
    paymentMethod: appt.paymentMethod || 'credit_card',
    paidAt: appt.paidAt || new Date().toISOString(),
    payer: payerOverride || {
      name: appt.patientName || 'Paciente Particular',
      dni: 'Sin informar',
    },
    professional: {
      name: appt.professionalName || 'Lic. Mateo Gómez',
      specialty: appt.specialty || 'Salud Particular',
      registry: appt.registry || 'MP 3412',
      jurisdiction: appt.jurisdiction || 'Chaco',
    },
    appointment: {
      date: appt.date,
      time: appt.time,
      planTitle: appt.planTitle || 'Consulta Individual',
    },
    cancellationPolicy: CANCELLATION_POLICY_TEXT,
  };
}

export function getCancellationPolicyEvaluation(appt) {
  const cleanTime = String(appt?.time || '09:00').replace(' hs', '').padStart(5, '0');
  const target = new Date(`${appt?.date}T${cleanTime}:00`);
  const hoursRemaining = Number.isNaN(target.getTime())
    ? 48
    : (target.getTime() - Date.now()) / (1000 * 60 * 60);
  const eligibleForFullRefund = hoursRemaining >= 24;
  return {
    hoursRemaining: Math.max(0, Math.round(hoursRemaining)),
    eligibleForFullRefund,
  };
}

export async function cancelAppointment(appt) {
  const { eligibleForFullRefund } = getCancellationPolicyEvaluation(appt);

  try {
    await apiClient.post(`/turnos/${appt.id}/estado`, { estado: 'cancelado' });
  } catch {
    // Continuar con persistencia local
  }

  const list = await getAppointments();
  const updated = list.map((item) =>
    item.id === appt.id ? { ...item, status: 'cancelado' } : item
  );
  await setJsonItem(KEYS.APPOINTMENTS, updated);

  // Liberar cupo agendado si pertenecía a un paquete HU12
  const packages = await getContractedPackages();
  const updatedPackages = packages.map((pkg) => {
    const hasSession = pkg.sessions?.some((s) => s.appointmentId === appt.id);
    if (!hasSession) return pkg;
    const nextSessions = pkg.sessions.map((s) =>
      s.appointmentId === appt.id ? { ...s, status: 'cancelado' } : s
    );
    const activeBooked = nextSessions.filter(
      (s) => s.status === 'cumplido' || s.status === 'confirmado'
    ).length;
    return {
      ...pkg,
      bookedSessions: activeBooked,
      sessions: nextSessions,
    };
  });
  await setJsonItem(KEYS.PACKAGES, updatedPackages);

  return { eligibleForFullRefund, appointments: updated };
}

export async function getNotifications() {
  try {
    const response = await apiClient.get('/notificaciones/me');
    if (Array.isArray(response.data)) {
      return response.data;
    }
  } catch {
    // Fallback local
  }
  const saved = await getJsonItem(KEYS.NOTIFICATIONS, null);
  if (saved) return saved;
  await setJsonItem(KEYS.NOTIFICATIONS, SEED_NOTIFICATIONS);
  return SEED_NOTIFICATIONS;
}

export async function markNotificationRead(id) {
  try {
    await apiClient.post(`/notificaciones/${id}/leida`);
  } catch {
    // Fallback local
  }
  const list = await getNotifications();
  const updated = list.map((n) => (n.id === id ? { ...n, leida: true } : n));
  await setJsonItem(KEYS.NOTIFICATIONS, updated);
  return updated;
}

// ---------- Seguimiento de Paquetes (HU12) ----------

export async function getContractedPackages() {
  const saved = await getJsonItem(KEYS.PACKAGES, null);
  if (Array.isArray(saved)) return saved;
  await setJsonItem(KEYS.PACKAGES, SEED_PACKAGES);
  return SEED_PACKAGES;
}

export async function getContractedPackageById(contractId) {
  const list = await getContractedPackages();
  return list.find((p) => p.id === contractId) || null;
}

export async function contractPackage({
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
}) {
  const all = await getContractedPackages();
  const sessionsCount = Number(totalSessions) || 4;
  const newContract = {
    id: `PKG-CTR-${Date.now().toString().slice(-6)}`,
    packageId,
    title,
    professionalId,
    professionalName,
    specialty,
    patientName: patientName || 'Paciente Particular',
    patientEmail: patientEmail || 'paciente@saluddirecta.ar',
    totalSessions: sessionsCount,
    completedSessions: 0,
    bookedSessions: firstAppointment ? 1 : 0,
    totalPrice: Number(totalPrice) || 0,
    pricePerSession: Math.round((Number(totalPrice) || 0) / sessionsCount),
    paymentId,
    contractedAt: new Date().toISOString(),
    status: 'en_curso',
    sessions: firstAppointment
      ? [
          {
            sessionNumber: 1,
            date: firstAppointment.date,
            time: firstAppointment.time,
            status: 'confirmado',
            appointmentId: firstAppointment.id,
          },
        ]
      : [],
  };

  const next = [newContract, ...all];
  await setJsonItem(KEYS.PACKAGES, next);
  return newContract;
}

export async function bookSessionForPackage(contractId, appointment) {
  const all = await getContractedPackages();
  const idx = all.findIndex((p) => p.id === contractId);
  if (idx === -1) return null;

  const pkg = all[idx];
  if (pkg.bookedSessions >= pkg.totalSessions) {
    throw new Error(
      `Límite alcanzado: este paquete ya tiene reservadas todas sus ${pkg.totalSessions} sesiones contratadas.`
    );
  }

  const nextSessionNumber = (pkg.sessions?.length || 0) + 1;
  const updatedPkg = {
    ...pkg,
    bookedSessions: pkg.bookedSessions + 1,
    sessions: [
      ...(pkg.sessions || []),
      {
        sessionNumber: nextSessionNumber,
        date: appointment.date,
        time: appointment.time,
        status: 'confirmado',
        appointmentId: appointment.id,
      },
    ],
  };

  const next = [...all];
  next[idx] = updatedPkg;
  await setJsonItem(KEYS.PACKAGES, next);
  return updatedPkg;
}

// ---------- Privacidad y Cuenta (HU14 - Ley 25.326) ----------

export async function exportarMisDatos() {
  try {
    const response = await apiClient.get('/cuenta/me/datos');
    return { data: response.data, source: 'api' };
  } catch (err) {
    if (err.response) {
      throw new Error(
        extractHttpError(err, 'No se pudieron consultar tus datos personales.')
      );
    }

    const user = await getJsonItem(KEYS.USER, {});
    const appointments = await getAppointments();
    const notifications = await getNotifications();

    return {
      source: 'local',
      data: {
        generadoEn: new Date().toISOString(),
        cuenta: {
          id: user?.id || 'pac-local',
          nombre: user?.nombre || 'Paciente Particular',
          email: user?.email || '',
          telefono: user?.telefono || '',
          rol: user?.rol || 'paciente',
          consentimientoAceptadoEn: user?.consentimientoAceptadoEn || new Date().toISOString(),
        },
        perfil: null,
        turnos: appointments.map((t) => ({
          id: t.id,
          fecha: t.date,
          hora: t.time,
          estado: t.status,
          contraparte: t.professionalName || 'Profesional',
        })),
        notificaciones: notifications.map((n) => ({
          tipo: n.tipo || 'sistema',
          asunto: n.asunto,
          mensaje: n.mensaje,
          creadoEn: n.creadoEn,
        })),
      },
    };
  }
}

export async function eliminarMiCuenta(password) {
  if (!password || !password.trim()) {
    throw new Error('Ingresá tu contraseña actual para confirmar la eliminación.');
  }

  const user = await getJsonItem(KEYS.USER, {});
  const emailLower = user?.email?.toLowerCase();

  try {
    const response = await apiClient.delete('/cuenta/me', {
      data: { password },
    });

    await cleanupLocalAfterDelete(emailLower);
    return {
      turnosCancelados: response.data?.turnosCancelados ?? 0,
      source: 'api',
    };
  } catch (err) {
    if (err.response) {
      throw new Error(
        extractHttpError(err, 'No se pudo eliminar la cuenta. Verificá tu contraseña.')
      );
    }

    const canceled = await cleanupLocalAfterDelete(emailLower);
    return { turnosCancelados: canceled, source: 'local' };
  }
}

async function cleanupLocalAfterDelete(emailLower) {
  const appointments = await getJsonItem(KEYS.APPOINTMENTS, []);
  let canceledCount = 0;
  const updatedAppointments = (Array.isArray(appointments) ? appointments : []).map((a) => {
    if (a.status === 'confirmado' || a.status === 'solicitado') {
      canceledCount += 1;
      return { ...a, status: 'cancelado' };
    }
    return a;
  });

  if (canceledCount > 0) {
    await setJsonItem(KEYS.APPOINTMENTS, updatedAppointments);
  }

  await removeItem(KEYS.NOTIFICATIONS);
  if (emailLower) {
    const registered = await getJsonItem(KEYS.REGISTERED_USERS, []);
    await setJsonItem(
      KEYS.REGISTERED_USERS,
      (Array.isArray(registered) ? registered : []).filter(
        (u) => u.email?.toLowerCase() !== emailLower
      )
    );
  }

  return canceledCount;
}
