import axiosClient from './axiosClient';
import { supabase } from '../lib/supabase';
import { PROFESSIONALS as SEED_PROFESSIONALS } from '../data/mockData';
import { filterAndSortProfessionals, extractSearchFacets } from '../utils/professionalSearch';

const LOCAL_CUSTOM_PROS_KEY = 'salud_directa_custom_professionals';
const CACHE_TTL_MS = 60_000;
const SUPABASE_TIMEOUT_MS = 1200;

let cachedProfessionals = null;
let cachedAt = 0;

function normalizeProfessional(raw) {
  if (!raw) return raw;
  const isVerified = Boolean(
    raw.isVerified ??
      (raw.verificationStatus ? raw.verificationStatus === 'verificado' : true)
  );
  return {
    ...raw,
    isVerified,
    verificationStatus: raw.verificationStatus || (isVerified ? 'verificado' : 'pendiente'),
    hasRampAccessibility: Boolean(raw.hasRampAccessibility ?? raw.hasRamp ?? raw.has_ramp),
    hasElevator: Boolean(raw.hasElevator ?? raw.has_elevator),
    hasAdaptedBathroom: Boolean(raw.hasAdaptedBathroom ?? raw.has_adapted_bathroom),
    sessionDurationMinutes: Number(raw.sessionDurationMinutes) || 45,
    price: Number(raw.price ?? raw.consultationPrice) || 25000,
    isPublished: raw.isPublished !== false,
    packages: Array.isArray(raw.packages) ? raw.packages : [],
    availableSlots: Array.isArray(raw.availableSlots) ? raw.availableSlots : [],
  };
}

export const getLocalCustomProfessionals = () => {
  try {
    const raw = localStorage.getItem(LOCAL_CUSTOM_PROS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveLocalCustomProfessionals = (list) => {
  localStorage.setItem(LOCAL_CUSTOM_PROS_KEY, JSON.stringify(list));
};

// Genera slots de atención estándar para profesionales nuevos si no tienen configurados aún
export const generateDefaultAvailableSlots = () => {
  const dates = [];
  const today = new Date();
  
  for (let i = 1; i <= 7; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    // Excluir domingos
    if (nextDate.getDay() === 0) continue;

    const yyyy = nextDate.getFullYear();
    const mm = String(nextDate.getMonth() + 1).padStart(2, '0');
    const dd = String(nextDate.getDate()).padStart(2, '0');
    const isoDate = `${yyyy}-${mm}-${dd}`;
    
    const dayNames = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
    const dayLabel = `${dayNames[nextDate.getDay()]} ${dd}`;

    dates.push({
      date: isoDate,
      dayLabel,
      times: ['09:00 hs', '10:30 hs', '11:30 hs', '16:00 hs', '17:30 hs'],
    });

    if (dates.length >= 5) break;
  }

  return dates;
};

/**
 * Servicio de Profesionales integrado con Supabase, Backend y Almacenamiento Local
 */
export const profesionalService = {
  /**
   * Obtiene la lista completa de profesionales unificando:
   * 1. Supabase (tabla 'professionals')
   * 2. Profesionales creados localmente en el navegador
   * 3. Seed inicial (mockData)
   */
  async getProfessionals({ forceRefresh = false } = {}) {
    if (!forceRefresh && cachedProfessionals && Date.now() - cachedAt < CACHE_TTL_MS) {
      return cachedProfessionals;
    }

    let supabasePros = [];

    if (supabase) {
      try {
        const timeoutPromise = new Promise((resolve) =>
          setTimeout(() => resolve({ data: null, error: new Error('Supabase timeout') }), SUPABASE_TIMEOUT_MS)
        );
        const { data, error } = await Promise.race([
          supabase.from('professionals').select('*'),
          timeoutPromise,
        ]);

        if (!error && data && data.length > 0) {
          supabasePros = data.map((sp) =>
            normalizeProfessional({
              id: sp.id,
              name: sp.name,
              profession: sp.specialty?.split(' - ')[0] || sp.specialty || 'Salud',
              specialty: sp.specialty,
              registry: sp.registry,
              jurisdiction: sp.jurisdiction || 'Chaco',
              isVerified: sp.is_verified ?? true,
              verificationStatus: sp.is_verified === false ? 'pendiente' : 'verificado',
              price: Number(sp.price) || 25000,
              rating: 5.0,
              reviewsCount: 1,
              location: sp.location || 'Resistencia, Chaco',
              address: sp.address || 'Consultorio Profesional',
              hasRampAccessibility: sp.has_ramp ?? true,
              hasElevator: sp.has_elevator ?? false,
              hasAdaptedBathroom: sp.has_adapted_bathroom ?? false,
              sessionDurationMinutes: sp.session_duration_minutes || 45,
              description: sp.description || 'Atención personalizada y seguimiento profesional.',
              packages: [
                { id: `pkg-${sp.id}-1`, sessions: 4, discountPercent: 10, title: 'Plan Recuperación (4 Sesiones)' },
              ],
              availableSlots: generateDefaultAvailableSlots(),
            })
          );
        }
      } catch {
        // Fallback si Supabase no responde
      }
    }

    const localCustomPros = getLocalCustomProfessionals().map(normalizeProfessional);
    
    // Si el usuario actual tiene su perfil guardado en 'salud_directa_pro_profile', aseguramos sincronizarlo
    try {
      const activeProProfile = localStorage.getItem('salud_directa_pro_profile');
      if (activeProProfile) {
        const parsed = JSON.parse(activeProProfile);
        if (parsed.name && parsed.isPublished !== false) {
          const exists = localCustomPros.some((p) => p.name?.toLowerCase() === parsed.name?.toLowerCase());
          if (!exists) {
            localCustomPros.unshift(
              normalizeProfessional({
                id: parsed.id || 'pro-me',
                name: parsed.name,
                profession: parsed.profession || 'Kinesiología',
                specialty: parsed.specialty || parsed.profession || 'Especialista',
                registry: parsed.registry || 'MP 3412',
                jurisdiction: parsed.jurisdiction || 'Chaco',
                verificationStatus: parsed.verificationStatus,
                isVerified: parsed.verificationStatus === 'verificado',
                price: Number(parsed.consultationPrice) || 25000,
                rating: 5.0,
                reviewsCount: 0,
                location: parsed.city || 'Resistencia, Chaco',
                address: parsed.address || 'Consultorio',
                hasRampAccessibility: Boolean(parsed.hasRamp),
                hasElevator: Boolean(parsed.hasElevator),
                hasAdaptedBathroom: Boolean(parsed.hasAdaptedBathroom),
                sessionDurationMinutes: Number(parsed.sessionDurationMinutes) || 45,
                description: parsed.description || 'Atención profesional particular.',
                packages: [
                  { id: 'pkg-custom-1', sessions: 4, discountPercent: 10, title: 'Plan Módulo (4 Sesiones)' },
                ],
                availableSlots: generateDefaultAvailableSlots(),
              })
            );
          }
        }
      }
    } catch {
      // Ignorar error de parsing
    }

    // Combinar sin duplicados por nombre
    const combined = [...localCustomPros, ...supabasePros];
    for (const seed of SEED_PROFESSIONALS) {
      if (!combined.some((p) => p.name?.toLowerCase() === seed.name?.toLowerCase())) {
        combined.push(normalizeProfessional(seed));
      }
    }

    cachedProfessionals = combined;
    cachedAt = Date.now();
    return combined;
  },

  /**
   * Búsqueda con criterios combinables y medición de latencia (HU6 / RF-07 / RNF-05)
   */
  async buscarProfesionales(filters = {}) {
    const startedAt = performance.now();
    const all = await this.getProfessionals();
    const results = filterAndSortProfessionals(all, filters);
    const facets = extractSearchFacets(all);
    return {
      results,
      totalAvailable: all.length,
      facets,
      elapsedMs: Math.max(1, Math.round(performance.now() - startedAt)),
    };
  },

  /**
   * Obtiene un profesional específico por su ID (número o string/uuid)
   */
  async getProfessionalById(id) {
    const all = await this.getProfessionals();
    return all.find((p) => String(p.id) === String(id)) || null;
  },

  /**
   * Guarda y da de alta un profesional en Supabase y en almacenamiento local
   */
  async registrarOActualizarProfesional(proData) {
    const id = proData.id || `pro-${Date.now()}`;
    const formatted = normalizeProfessional({
      id,
      name: proData.name,
      profession: proData.profession || proData.specialty || 'Kinesiología',
      specialty: proData.specialty || proData.profession || 'Kinesiología y Fisiatría',
      registry: proData.registry || 'MP 3412',
      jurisdiction: proData.jurisdiction || 'Chaco',
      verificationStatus: proData.verificationStatus,
      isVerified: proData.verificationStatus ? proData.verificationStatus === 'verificado' : true,
      price: Number(proData.price || proData.consultationPrice) || 25000,
      rating: 5.0,
      reviewsCount: 0,
      location: proData.city || proData.location || 'Resistencia, Chaco',
      address: proData.address || 'Consultorio',
      hasRampAccessibility: Boolean(proData.hasRamp ?? proData.hasRampAccessibility),
      hasElevator: Boolean(proData.hasElevator),
      hasAdaptedBathroom: Boolean(proData.hasAdaptedBathroom),
      sessionDurationMinutes: Number(proData.sessionDurationMinutes) || 45,
      description: proData.description || 'Atención médica y seguimiento individual.',
      packages: proData.packages || [
        { id: `pkg-${id}-1`, sessions: 4, discountPercent: 10, title: 'Plan Recuperación (4 Sesiones)' },
      ],
      availableSlots: proData.availableSlots || generateDefaultAvailableSlots(),
      isPublished: proData.isPublished !== false,
    });

    // 1. Guardar en Supabase si está disponible
    if (supabase) {
      try {
        await supabase.from('professionals').upsert({
          name: formatted.name,
          specialty: formatted.specialty,
          registry: formatted.registry,
          price: formatted.price,
          description: formatted.description,
          location: formatted.location,
        });
      } catch {
        // Fallback local
      }
    }

    // 2. Guardar en almacenamiento local persistente e invalidar caché de búsqueda
    const localList = getLocalCustomProfessionals();
    const index = localList.findIndex((p) => String(p.id) === String(id) || p.name?.toLowerCase() === formatted.name.toLowerCase());
    if (index >= 0) {
      localList[index] = { ...localList[index], ...formatted };
    } else {
      localList.unshift(formatted);
    }
    saveLocalCustomProfessionals(localList);
    cachedProfessionals = null;
    cachedAt = 0;

    return formatted;
  },
  // --- HU2: Verificación de Matrícula (REFEPS / SISA) ---

  /**
   * Ejecuta la verificación de la matrícula declarada contra el registro oficial
   * @returns {Promise<{ estado: string, distintivo: boolean, motivo: string, fuente?: string, verificadaEn?: string }>}
   */
  async verificarMatricula() {
    const response = await axiosClient.post('/profesionales/me/verificacion');
    return response.data;
  },

  /**
   * Consulta el estado de la última verificación del profesional autenticado
   */
  async getMiVerificacion() {
    const response = await axiosClient.get('/profesionales/me/verificacion');
    return response.data;
  },

  /**
   * Consulta pública de distintivo de verificación oficial para un profesional
   */
  async getDistintivo(profesionalId) {
    const response = await axiosClient.get(`/profesionales/${profesionalId}/distintivo`);
    return response.data;
  },

  // --- HU4: Perfil, Honorarios Obligatorios y Prestaciones ---

  /**
   * Obtiene el perfil completo del profesional autenticado
   */
  async getMiPerfil() {
    const response = await axiosClient.get('/profesionales/me/perfil');
    return response.data;
  },

  /**
   * Guarda o actualiza los datos del consultorio y accesibilidad (HU4)
   */
  async guardarPerfil(perfilData) {
    const response = await axiosClient.put('/profesionales/me/perfil', {
      especialidad: perfilData.especialidad || null,
      descripcion: perfilData.descripcion || null,
      direccion: perfilData.direccion || null,
      ciudad: perfilData.ciudad || null,
      telefono: perfilData.telefono || null,
      duracionSesionMinutos: Number(perfilData.duracionSesionMinutos) || 45,
      tieneRampa: Boolean(perfilData.tieneRampa),
      tieneAscensor: Boolean(perfilData.tieneAscensor),
      tieneBanoAdaptado: Boolean(perfilData.tieneBanoAdaptado),
    });
    return response.data;
  },

  /**
   * Fija o modifica el honorario de la consulta (con auditoría y registro en historial)
   */
  async cambiarHonorario(honorario) {
    const response = await axiosClient.put('/profesionales/me/perfil/honorario', {
      honorario: Number(honorario),
    });
    return response.data;
  },

  /**
   * Publica el perfil en el buscador (exige tener honorario fijado)
   */
  async publicarPerfil() {
    const response = await axiosClient.post('/profesionales/me/perfil/publicar');
    return response.data;
  },

  /**
   * Oculta el perfil del buscador
   */
  async despublicarPerfil() {
    const response = await axiosClient.post('/profesionales/me/perfil/despublicar');
    return response.data;
  },

  /**
   * Consulta el historial de cambios de honorarios para auditoría (RNF-04)
   */
  async getHistorialHonorarios() {
    const response = await axiosClient.get('/profesionales/me/perfil/honorarios/historial');
    return response.data;
  },

  // --- Prestaciones y Paquetes de Atención ---

  /**
   * Lista las prestaciones activas del profesional
   */
  async getMisPrestaciones() {
    const response = await axiosClient.get('/profesionales/me/prestaciones');
    return response.data;
  },

  /**
   * Da de alta una nueva prestación
   */
  async crearPrestacion(prestacion) {
    const response = await axiosClient.post('/profesionales/me/prestaciones', {
      nombre: prestacion.nombre,
      duracionMinutos: Number(prestacion.duracionMinutos) || 45,
    });
    return response.data;
  },

  /**
   * Modifica una prestación propia
   */
  async actualizarPrestacion(id, prestacion) {
    const response = await axiosClient.put(`/profesionales/me/prestaciones/${id}`, {
      nombre: prestacion.nombre,
      duracionMinutos: Number(prestacion.duracionMinutos) || 45,
    });
    return response.data;
  },

  /**
   * Baja lógica de una prestación
   */
  async eliminarPrestacion(id) {
    await axiosClient.delete(`/profesionales/me/prestaciones/${id}`);
  },

  /**
   * Consulta pública de perfil para pacientes
   */
  async getPerfilPublico(profesionalId) {
    const response = await axiosClient.get(`/profesionales/${profesionalId}/perfil`);
    return response.data;
  },
};

export default profesionalService;
