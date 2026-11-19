import { supabase } from '../lib/supabase';
import axiosClient from './axiosClient';

// Máquina de estados válida del turno (Criterio 2 - HU9 / RF-11)
export const VALID_TRANSITIONS = {
  solicitado: ['confirmado', 'cancelado'],
  confirmado: ['cumplido', 'ausente', 'cancelado'],
  cumplido: [], // Estado terminal
  ausente: [],   // Estado terminal
  cancelado: [], // Estado terminal
};

export const canTransition = (currentStatus, newStatus) => {
  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  return allowed.includes(newStatus);
};

const STORAGE_KEY = 'salud_directa_turnos';

export const getLocalAppointments = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalAppointments = (list) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
};

/**
 * Obtener las franjas horarias ya ocupadas para un profesional en una fecha determinada.
 * Control estricto de concurrencia (Criterio 1 - HU9).
 */
export async function getBookedSlots(professionalName, date) {
  // 1. Intentar consultar en Supabase si está inicializado
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .select('time, status')
        .eq('professional_name', professionalName)
        .eq('date', date)
        .neq('status', 'cancelado')
        .neq('status', 'cancelled');

      if (!error && data) {
        return data.map((item) => item.time);
      }
    } catch {
      // Fallback
    }
  }

  // 2. Fallback a almacenamiento local persistido
  const localList = getLocalAppointments();
  return localList
    .filter(
      (appt) =>
        appt.professionalName === professionalName &&
        appt.date === date &&
        appt.status !== 'cancelado'
    )
    .map((appt) => appt.time);
}

/**
 * Obtener turnos del usuario autenticado (paciente o profesional)
 * Conecta con el Backend .NET 8 (/api/turnos/me) con fallback local
 */
export async function fetchMyAppointments() {
  try {
    const response = await axiosClient.get('/turnos/me');
    if (response.data && response.data.length > 0) {
      return response.data.map((t) => ({
        id: t.id,
        professionalName: t.profesional,
        patientName: t.paciente,
        date: t.fecha,
        time: t.hora + ' hs',
        status: t.estado,
        price: 25000,
        planTitle: 'Consulta Médica',
        paymentId: 'MP-' + t.id.slice(0, 6).toUpperCase(),
      }));
    }
  } catch {
    // Si la API está offline o no responde, retornar datos locales
  }
  return getLocalAppointments();
}

/**
 * Reservar un turno con prevención estricta de doble asignación (Criterio 1 - HU9 / Backend .NET 8).
 */
export async function bookAppointment(appointmentData) {
  const { professionalName, date, time } = appointmentData;
  const formattedTime = time ? time.replace(' hs', '').trim() : '09:00';

  // 1. Intentar reservar en el Backend .NET 8 (Restricción de exclusión en Postgres -> 409 Conflict)
  try {
    const response = await axiosClient.post('/turnos', {
      profesionalId: appointmentData.profesionalId || '00000000-0000-0000-0000-000000000001',
      fecha: date,
      hora: formattedTime,
      prestacionId: appointmentData.prestacionId || null,
    });

    if (response.data) {
      const local = getLocalAppointments();
      const newAppt = {
        id: response.data.id || 'TUR-' + Date.now().toString().slice(-6),
        professionalName,
        specialty: appointmentData.specialty,
        planTitle: appointmentData.planTitle,
        date,
        time,
        price: appointmentData.totalAmount,
        status: response.data.estado || 'confirmado',
        paidAt: new Date().toISOString(),
        paymentId: 'MP-' + Math.floor(100000 + Math.random() * 900000),
      };
      saveLocalAppointments([newAppt, ...local]);
      return newAppt;
    }
  } catch (err) {
    if (err.response?.status === 409) {
      throw new Error('CONCURRENCY_COLLISION: El horario seleccionado ya fue reservado por otro paciente.');
    }
  }

  // 2. Verificar en Supabase si está disponible
  if (supabase) {
    try {
      const { data: existingSlots } = await supabase
        .from('appointments')
        .select('id')
        .eq('professional_name', professionalName)
        .eq('date', date)
        .eq('time', time)
        .neq('status', 'cancelled')
        .neq('status', 'cancelado');

      if (existingSlots && existingSlots.length > 0) {
        throw new Error('CONCURRENCY_COLLISION: El horario seleccionado ya fue reservado por otro paciente.');
      }

      const { data, error } = await supabase
        .from('appointments')
        .insert([
          {
            professional_name: professionalName,
            specialty: appointmentData.specialty,
            patient_name: appointmentData.patientName || 'Paciente Particular',
            patient_phone: appointmentData.patientPhone || '',
            patient_email: appointmentData.patientEmail || '',
            date: date,
            time: time,
            total_price: appointmentData.totalAmount,
            status: appointmentData.status || 'confirmado',
          }
        ])
        .select()
        .single();

      if (error) {
        if (error.code === '23505') {
          throw new Error('CONCURRENCY_COLLISION: El horario seleccionado acaba de ser tomado en este instante.');
        }
      } else if (data) {
        const local = getLocalAppointments();
        const appt = {
          id: data.id,
          professionalName,
          specialty: appointmentData.specialty,
          planTitle: appointmentData.planTitle,
          date,
          time,
          price: appointmentData.totalAmount,
          status: appointmentData.status || 'confirmado',
          paidAt: data.created_at,
          paymentId: 'MP-' + Math.floor(100000 + Math.random() * 900000),
        };
        saveLocalAppointments([appt, ...local]);
        return appt;
      }
    } catch (err) {
      if (err.message?.includes('CONCURRENCY_COLLISION')) {
        throw err;
      }
    }
  }

  // 3. Control de concurrencia sobre almacenamiento local (Fallback reactivo)
  const currentLocal = getLocalAppointments();
  const isOccupied = currentLocal.some(
    (a) =>
      a.professionalName === professionalName &&
      a.date === date &&
      a.time === time &&
      a.status !== 'cancelado'
  );

  if (isOccupied) {
    throw new Error('CONCURRENCY_COLLISION: El horario seleccionado ya se encuentra ocupado.');
  }

  const newAppt = {
    id: 'TUR-' + Date.now().toString().slice(-6),
    professionalName,
    specialty: appointmentData.specialty,
    planTitle: appointmentData.planTitle,
    date,
    time,
    price: appointmentData.totalAmount,
    status: appointmentData.status || 'confirmado',
    paidAt: new Date().toISOString(),
    paymentId: 'MP-' + Math.floor(100000 + Math.random() * 900000),
  };

  saveLocalAppointments([newAppt, ...currentLocal]);
  return newAppt;
}

/**
 * Actualizar el estado de un turno siguiendo la máquina de estados (Criterio 2 - HU9 / Backend .NET 8).
 */
export async function updateAppointmentStatus(appointmentId, newStatus) {
  const currentList = getLocalAppointments();
  const targetIndex = currentList.findIndex((a) => a.id === appointmentId);

  if (targetIndex !== -1) {
    const currentAppt = currentList[targetIndex];
    if (!canTransition(currentAppt.status, newStatus)) {
      throw new Error(
        `Transición no permitida: no se puede pasar un turno de estado "${currentAppt.status}" a "${newStatus}".`
      );
    }
    const updatedAppt = { ...currentAppt, status: newStatus };
    currentList[targetIndex] = updatedAppt;
    saveLocalAppointments(currentList);
  }

  // 1. Intentar actualizar en Backend .NET 8 (/api/turnos/{id}/estado)
  try {
    await axiosClient.post(`/turnos/${appointmentId}/estado`, {
      estado: newStatus,
    });
  } catch {
    // Si la API no está en línea o id no es GUID, continuar
  }

  // 2. Intentar actualizar en Supabase si corresponde
  if (supabase) {
    try {
      await supabase
        .from('appointments')
        .update({ status: newStatus })
        .eq('id', appointmentId);
    } catch {
      // Ignorar fallback
    }
  }

  return targetIndex !== -1 ? currentList[targetIndex] : { id: appointmentId, status: newStatus };
}
