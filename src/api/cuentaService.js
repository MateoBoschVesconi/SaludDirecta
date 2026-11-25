import axiosClient from './axiosClient';
import { getLocalAppointments, saveLocalAppointments } from './appointmentService';
import { recordAuditLog } from './paymentService';

const USER_STORAGE_KEY = 'salud_directa_user';
const PRO_PROFILE_KEY = 'salud_directa_pro_profile';
const PRO_SCHEDULE_KEY = 'salud_directa_pro_schedule';
const PRO_PACKAGES_KEY = 'salud_directa_pro_packages';
const NOTIFICATIONS_KEY = 'salud_directa_notificaciones';
const REGISTERED_USERS_KEY = 'salud_directa_registered_users';

function readJsonStorage(key, fallback = null) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}

function buildLocalPersonalDataSnapshot() {
  const user = readJsonStorage(USER_STORAGE_KEY, {});
  const isPro = user?.rol === 'profesional';
  const savedProfile = isPro ? readJsonStorage(PRO_PROFILE_KEY, null) : null;
  const savedNotifications = readJsonStorage(NOTIFICATIONS_KEY, []);
  const localAppointments = getLocalAppointments();

  const normalizedEmail = user?.email?.toLowerCase();
  const userTurnos = localAppointments.filter((a) => {
    if (!user?.nombre && !normalizedEmail) return true;
    const matchName = isPro
      ? a.professionalName?.toLowerCase() === user?.nombre?.toLowerCase()
      : !a.patientName || a.patientName?.toLowerCase() === user?.nombre?.toLowerCase();
    const matchEmail = !a.patientEmail || a.patientEmail?.toLowerCase() === normalizedEmail;
    return isPro ? matchName : matchName || matchEmail;
  });

  const perfil = savedProfile
    ? {
        especialidad: savedProfile.specialty || user?.profesion || null,
        descripcion: savedProfile.description || null,
        direccion: savedProfile.address || null,
        ciudad: savedProfile.city || null,
        telefono: savedProfile.phone || null,
        honorarioConsulta:
          savedProfile.consultationPrice !== undefined
            ? Number(savedProfile.consultationPrice)
            : null,
        duracionSesionMinutos: Number(savedProfile.sessionDurationMinutes) || 45,
        publicado: savedProfile.isPublished ?? true,
      }
    : null;

  return {
    generadoEn: new Date().toISOString(),
    cuenta: {
      id: user?.id || 'local-user',
      nombre: user?.nombre || 'Usuario',
      email: user?.email || '',
      telefono: user?.telefono || '',
      rol: user?.rol || 'paciente',
      profesion: user?.profesion || null,
      matricula: user?.matricula || null,
      jurisdiccion: user?.jurisdiccion || null,
      consentimientoAceptadoEn:
        user?.consentimientoAceptadoEn || user?.consentAcceptedAt || new Date().toISOString(),
      creadoEn: user?.creadoEn || user?.consentAcceptedAt || new Date().toISOString(),
    },
    perfil,
    turnos: userTurnos.map((t) => ({
      id: t.id,
      fecha: t.date || t.fecha || '-',
      hora: t.time || t.hora || '-',
      estado: t.status || t.estado || 'confirmado',
      contraparte: isPro
        ? t.patientName || t.patient || 'Paciente Particular'
        : t.professionalName || 'Profesional de Salud',
    })),
    notificaciones: (Array.isArray(savedNotifications) ? savedNotifications : []).map((n) => ({
      tipo: n.tipo || 'sistema',
      asunto: n.asunto || 'Aviso del sistema',
      mensaje: n.mensaje || '',
      creadoEn: n.creadoEn || new Date().toISOString(),
    })),
  };
}

function cleanupLocalAccountArtifacts(userSnapshot) {
  const email = userSnapshot?.email?.toLowerCase();
  const nombre = userSnapshot?.nombre?.toLowerCase();
  const isPro = userSnapshot?.rol === 'profesional';

  // 1. Cancelar turnos activos locales del usuario y contabilizarlos
  const currentAppointments = getLocalAppointments();
  let canceledCount = 0;

  const updatedAppointments = currentAppointments.map((appt) => {
    const belongsToUser = isPro
      ? appt.professionalName?.toLowerCase() === nombre
      : (email && appt.patientEmail?.toLowerCase() === email) ||
        (nombre && appt.patientName?.toLowerCase() === nombre);

    const isActive = appt.status === 'confirmado' || appt.status === 'solicitado';
    if (belongsToUser && isActive) {
      canceledCount += 1;
      return { ...appt, status: 'cancelado' };
    }
    return appt;
  });

  if (canceledCount > 0) {
    saveLocalAppointments(updatedAppointments);
  }

  // 2. Eliminar datos personales cacheados en localStorage
  localStorage.removeItem(PRO_PROFILE_KEY);
  localStorage.removeItem(PRO_SCHEDULE_KEY);
  localStorage.removeItem(PRO_PACKAGES_KEY);
  localStorage.removeItem(NOTIFICATIONS_KEY);

  // 3. Remover al usuario del registro local para liberar el correo
  if (email) {
    const registeredUsers = readJsonStorage(REGISTERED_USERS_KEY, []);
    if (Array.isArray(registeredUsers)) {
      const remaining = registeredUsers.filter((u) => u.email?.toLowerCase() !== email);
      localStorage.setItem(REGISTERED_USERS_KEY, JSON.stringify(remaining));
    }
  }

  return canceledCount;
}

/**
 * Servicio de Privacidad y Cuenta integrado con el Backend .NET 8 (HU14 - Ley 25.326)
 */
export const cuentaService = {
  /**
   * Derecho de Acceso: GET /api/cuenta/me/datos
   * @returns {Promise<{ data: Object, source: 'api' | 'local' }>}
   */
  async exportarMisDatos() {
    try {
      const response = await axiosClient.get('/cuenta/me/datos');
      return { data: response.data, source: 'api' };
    } catch (err) {
      if (err.response) {
        const message =
          err.response.data?.detail ||
          err.response.data?.mensaje ||
          err.response.data?.title ||
          'No se pudieron obtener tus datos personales.';
        throw new Error(message);
      }
      return { data: buildLocalPersonalDataSnapshot(), source: 'local' };
    }
  },

  /**
   * Derecho de Supresión: DELETE /api/cuenta/me
   * Exige la contraseña actual en el body ({ data: { password } }).
   * @param {string} password
   * @returns {Promise<{ turnosCancelados: number, source: 'api' | 'local' }>}
   */
  async eliminarMiCuenta(password) {
    if (!password || !password.trim()) {
      throw new Error('Ingresá tu contraseña actual para confirmar la eliminación.');
    }

    const userSnapshot = readJsonStorage(USER_STORAGE_KEY, {});
    const rolLabel = userSnapshot?.rol || 'usuario';

    try {
      const response = await axiosClient.delete('/cuenta/me', {
        data: { password },
      });

      const localCanceled = cleanupLocalAccountArtifacts(userSnapshot);
      const apiCanceled = response.data?.turnosCancelados ?? localCanceled;

      // Bitácora local sin datos personales (RNF-04)
      recordAuditLog({
        action: 'ELIMINACION_CUENTA',
        amount: 0,
        paymentId: null,
        userId: 'anonimo',
        details: `Cuenta de ${rolLabel} eliminada a pedido del titular. Turnos activos cancelados: ${apiCanceled}.`,
      });

      return { turnosCancelados: apiCanceled, source: 'api' };
    } catch (err) {
      if (err.response) {
        const message =
          err.response.data?.detail ||
          err.response.data?.mensaje ||
          err.response.data?.title ||
          'No se pudo eliminar la cuenta. Verificá tu contraseña.';
        throw new Error(message);
      }

      // Fallback local únicamente si la API no está disponible (error de red)
      const canceledCount = cleanupLocalAccountArtifacts(userSnapshot);
      recordAuditLog({
        action: 'ELIMINACION_CUENTA',
        amount: 0,
        paymentId: null,
        userId: 'anonimo',
        details: `Cuenta de ${rolLabel} eliminada en modo local a pedido del titular. Turnos activos cancelados: ${canceledCount}.`,
      });

      return { turnosCancelados: canceledCount, source: 'local' };
    }
  },
};

/**
 * Descarga una copia legible en formato JSON de los datos personales exportados.
 */
export function downloadPersonalDataJson(datosPersonales) {
  const jsonText = JSON.stringify(datosPersonales, null, 2);
  const blob = new Blob([jsonText], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute(
    'download',
    `salud-directa-mis-datos-${new Date().toISOString().slice(0, 10)}.json`
  );
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default cuentaService;
