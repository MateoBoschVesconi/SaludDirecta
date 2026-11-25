/**
 * Motor de búsqueda y filtros combinables para profesionales (HU6 / RF-07).
 * Implementado con patrón Specification sobre datos normalizados en memoria (< 2s / RNF-05).
 */

const WEEKDAY_PREFIXES = ['dom', 'lun', 'mar', 'mie', 'jue', 'vie', 'sab'];

/**
 * Normaliza texto para comparaciones insensibles a mayúsculas y tildes.
 * @param {string} value
 * @returns {string}
 */
export function normalizeText(value = '') {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Extrae la hora entera (0-23) desde una franja horaria (ej. '09:30 hs' -> 9).
 * @param {string} timeStr
 * @returns {number | null}
 */
export function parseSlotHour(timeStr = '') {
  const match = String(timeStr ?? '').match(/(\d{1,2})/);
  if (!match) return null;
  const hour = Number(match[1]);
  return Number.isFinite(hour) && hour >= 0 && hour <= 23 ? hour : null;
}

function getSlotDayPrefix(slot) {
  if (slot?.dayLabel) {
    return normalizeText(slot.dayLabel).slice(0, 3);
  }
  if (slot?.date) {
    const parsed = new Date(`${slot.date}T12:00:00`);
    if (!Number.isNaN(parsed.getTime())) {
      return WEEKDAY_PREFIXES[parsed.getDay()];
    }
  }
  return '';
}

/**
 * Obtiene el próximo turno disponible de un profesional, o null si no tiene franjas cargadas.
 * @param {Object} professional
 * @returns {{ date: string, dayLabel: string, time: string } | null}
 */
export function getNextAvailableSlot(professional) {
  const slots = professional?.availableSlots;
  if (!Array.isArray(slots)) return null;

  for (const slot of slots) {
    if (Array.isArray(slot?.times) && slot.times.length > 0) {
      return {
        date: slot.date || '',
        dayLabel: slot.dayLabel || slot.date || '',
        time: slot.times[0],
      };
    }
  }
  return null;
}

/**
 * Analiza las franjas de un profesional para determinar si atiende mañana, tarde y/o sábados.
 * @param {Object} professional
 * @returns {{ morning: boolean, afternoon: boolean, saturday: boolean }}
 */
export function getProfessionalTimeWindows(professional) {
  const slots = professional?.availableSlots;
  if (!Array.isArray(slots) || slots.length === 0) {
    return { morning: false, afternoon: false, saturday: false };
  }

  let morning = false;
  let afternoon = false;
  let saturday = false;

  for (const slot of slots) {
    const times = Array.isArray(slot?.times) ? slot.times : [];
    if (times.length === 0) continue;

    if (getSlotDayPrefix(slot) === 'sab') {
      saturday = true;
    }

    for (const time of times) {
      const hour = parseSlotHour(time);
      if (hour === null) continue;
      if (hour < 13) morning = true;
      if (hour >= 13) afternoon = true;
    }
  }

  return { morning, afternoon, saturday };
}

/**
 * Verifica si el profesional posee turnos en un día de la semana dado ('Lun', 'Mar', 'Mié', etc.).
 * @param {Object} professional
 * @param {string} weekdayCode
 * @returns {boolean}
 */
export function hasWeekdayAvailability(professional, weekdayCode) {
  const targetPrefix = normalizeText(weekdayCode).slice(0, 3);
  if (!targetPrefix) return true;

  const slots = professional?.availableSlots;
  if (!Array.isArray(slots)) return false;

  return slots.some(
    (slot) =>
      Array.isArray(slot?.times) &&
      slot.times.length > 0 &&
      getSlotDayPrefix(slot) === targetPrefix
  );
}

/**
 * Compone un predicado combinable (Specification) a partir de los filtros activos.
 * @param {Object} filters
 * @returns {(pro: Object) => boolean}
 */
export function createSearchSpecification(filters = {}) {
  const query = normalizeText(filters.query);
  const profession = normalizeText(filters.profession);
  const specialty = normalizeText(filters.specialty);
  const location = normalizeText(filters.location);
  const minPrice = Number(filters.minPrice);
  const maxPrice = Number(filters.maxPrice);
  const hasMinPrice = Number.isFinite(minPrice) && minPrice > 0;
  const hasMaxPrice = Number.isFinite(maxPrice) && maxPrice > 0;
  const availability = filters.availability || 'cualquiera';
  const dayOfWeek = filters.dayOfWeek || '';

  return (pro) => {
    if (!pro || pro.isPublished === false) return false;

    if (query) {
      const haystack = normalizeText(
        [
          pro.name,
          pro.profession,
          pro.specialty,
          pro.location,
          pro.address,
          pro.description,
        ]
          .filter(Boolean)
          .join(' ')
      );
      if (!haystack.includes(query)) return false;
    }

    if (profession) {
      const proProfession = normalizeText(pro.profession);
      const proSpecialty = normalizeText(pro.specialty);
      if (!proProfession.includes(profession) && !proSpecialty.includes(profession)) {
        return false;
      }
    }

    if (specialty) {
      const proSpecialty = normalizeText(pro.specialty);
      if (!proSpecialty.includes(specialty)) return false;
    }

    if (location) {
      const proLocation = normalizeText(pro.location);
      const proJurisdiction = normalizeText(pro.jurisdiction);
      if (!proLocation.includes(location) && !proJurisdiction.includes(location)) {
        return false;
      }
    }

    const price = Number(pro.price) || 0;
    if (hasMinPrice && price < minPrice) return false;
    if (hasMaxPrice && price > maxPrice) return false;

    if (availability && availability !== 'cualquiera') {
      const windows = getProfessionalTimeWindows(pro);
      if (availability === 'manana' && !windows.morning) return false;
      if (availability === 'tarde' && !windows.afternoon) return false;
      if (availability === 'sabado' && !windows.saturday) return false;
    }

    if (dayOfWeek && !hasWeekdayAvailability(pro, dayOfWeek)) {
      return false;
    }

    if (filters.ramp && pro.hasRampAccessibility !== true) return false;
    if (filters.elevator && pro.hasElevator !== true) return false;
    if (filters.adaptedBathroom && pro.hasAdaptedBathroom !== true) return false;

    if (filters.onlyVerified && pro.isVerified !== true) return false;

    if (filters.onlyWithPackages && (!Array.isArray(pro.packages) || pro.packages.length === 0)) {
      return false;
    }

    return true;
  };
}

/**
 * Filtra y ordena una lista de profesionales según los criterios indicados.
 * @param {Array<Object>} professionals
 * @param {Object} filters
 * @returns {Array<Object>}
 */
export function filterAndSortProfessionals(professionals = [], filters = {}) {
  const predicate = createSearchSpecification(filters);
  const filtered = (Array.isArray(professionals) ? professionals : []).filter(predicate);
  const sortBy = filters.sortBy || 'relevance';

  return [...filtered].sort((a, b) => {
    if (sortBy === 'price_asc') {
      return (Number(a.price) || 0) - (Number(b.price) || 0);
    }
    if (sortBy === 'price_desc') {
      return (Number(b.price) || 0) - (Number(a.price) || 0);
    }
    if (sortBy === 'rating_desc') {
      const ratingDiff = (Number(b.rating) || 0) - (Number(a.rating) || 0);
      if (ratingDiff !== 0) return ratingDiff;
      return (Number(b.reviewsCount) || 0) - (Number(a.reviewsCount) || 0);
    }

    // 'relevance': verificados primero, luego mayor calificación, luego menor honorario
    const verifiedDiff = Number(Boolean(b.isVerified)) - Number(Boolean(a.isVerified));
    if (verifiedDiff !== 0) return verifiedDiff;

    const ratingDiff = (Number(b.rating) || 0) - (Number(a.rating) || 0);
    if (ratingDiff !== 0) return ratingDiff;

    return (Number(a.price) || 0) - (Number(b.price) || 0);
  });
}

/**
 * Extrae las opciones únicas disponibles (facetas) para poblar filtros combinables.
 * @param {Array<Object>} professionals
 * @returns {{ professions: string[], specialties: string[], locations: string[], priceBounds: { min: number, max: number } }}
 */
export function extractSearchFacets(professionals = []) {
  const professionsSet = new Set();
  const specialtiesSet = new Set();
  const locationsSet = new Set();
  let min = Infinity;
  let max = 0;

  for (const pro of Array.isArray(professionals) ? professionals : []) {
    if (!pro || pro.isPublished === false) continue;
    if (pro.profession) professionsSet.add(pro.profession);
    if (pro.specialty) specialtiesSet.add(pro.specialty);
    if (pro.location) locationsSet.add(pro.location);

    const price = Number(pro.price);
    if (Number.isFinite(price) && price > 0) {
      if (price < min) min = price;
      if (price > max) max = price;
    }
  }

  return {
    professions: [...professionsSet].sort((a, b) => a.localeCompare(b, 'es')),
    specialties: [...specialtiesSet].sort((a, b) => a.localeCompare(b, 'es')),
    locations: [...locationsSet].sort((a, b) => a.localeCompare(b, 'es')),
    priceBounds: {
      min: min === Infinity ? 15000 : min,
      max: max === 0 ? 50000 : max,
    },
  };
}
