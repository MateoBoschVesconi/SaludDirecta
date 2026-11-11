import { supabase } from '../lib/supabase';

// Máquina de estados válida del turno (Criterio 2 - HU9)
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
      // Si falla o no hay conexión, recurrir a almacenamiento local
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
 * Reservar un turno con prevención estricta de doble asignación (Criterio 1 - HU9).
 */
export async function bookAppointment(appointmentData) {
  const { professionalName, date, time } = appointmentData;

  // 1. Verificar primero si el horario ya fue reservado en Supabase
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

      // Insertar en Supabase
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
        // Código 23505 = violación de índice único en PostgreSQL (unique_active_appointment_idx)
        if (error.code === '23505') {
          throw new Error('CONCURRENCY_COLLISION: El horario seleccionado acaba de ser tomado en este instante.');
        }
        console.warn('Advertencia Supabase:', error.message);
      } else if (data) {
        // También guardar en local para sincronía
        const local = getLocalAppointments();
        saveLocalAppointments([
          {
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
          },
          ...local,
        ]);
        return data;
      }
    } catch (err) {
      if (err.message?.includes('CONCURRENCY_COLLISION')) {
        throw err;
      }
    }
  }

  // 2. Control de concurrencia sobre almacenamiento local
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
 * Actualizar el estado de un turno siguiendo la máquina de estados (Criterio 2 - HU9).
 */
export async function updateAppointmentStatus(appointmentId, newStatus) {
  const currentList = getLocalAppointments();
  const targetIndex = currentList.findIndex((a) => a.id === appointmentId);

  if (targetIndex === -1) {
    throw new Error('Turno no encontrado.');
  }

  const currentAppt = currentList[targetIndex];

  if (!canTransition(currentAppt.status, newStatus)) {
    throw new Error(
      `Transición no permitida: no se puede pasar un turno de estado "${currentAppt.status}" a "${newStatus}".`
    );
  }

  // Actualizar localmente
  const updatedAppt = { ...currentAppt, status: newStatus };
  currentList[targetIndex] = updatedAppt;
  saveLocalAppointments(currentList);

  // Intentar actualizar en Supabase si corresponde
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

  return updatedAppt;
}
