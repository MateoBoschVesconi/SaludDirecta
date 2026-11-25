import axiosClient from './axiosClient';
import { profesionalService } from './profesionalService';
import { filterAndSortProfessionals } from '../utils/professionalSearch';
import {
  NON_DIAGNOSTIC_DISCLAIMER,
  EMERGENCY_CONTACTS,
  MENTAL_HEALTH_CRISIS_CONTACT,
  detectEmergency,
  analyzeOrientationQuery,
} from '../utils/orientationEngine';

const UNAVAILABLE_MESSAGE =
  'El servicio de orientación asistida por IA no está disponible en este momento. Podés seguir buscando normalmente con los filtros combinables.';

async function enrichSuggestionsWithProfessionals(suggestions = []) {
  if (!Array.isArray(suggestions) || suggestions.length === 0) {
    return [];
  }

  let allPros = [];
  try {
    allPros = await profesionalService.getProfessionals();
  } catch {
    allPros = [];
  }

  return suggestions.map((item) => {
    const professionName = item.profession || item.profesion || '';
    const matchingPros = filterAndSortProfessionals(allPros, {
      profession: professionName,
      sortBy: 'relevance',
    }).slice(0, 2);

    return {
      profession: professionName,
      specialtyFocus: item.specialtyFocus || item.especialidad || professionName,
      affinityLabel: item.affinityLabel || item.afinidad || 'Afinidad sugerida',
      reason: item.reason || item.motivo || '',
      matchedTerms: item.matchedTerms || [],
      professionals:
        Array.isArray(item.professionals) && item.professionals.length > 0
          ? item.professionals
          : matchingPros,
    };
  });
}

/**
 * Servicio de Orientación Asistida por IA para Pacientes (HU7 / RF-08 / RNF-02).
 * No persiste el texto libre del paciente ni emite diagnósticos médicos.
 */
export const orientacionService = {
  async orientarPaciente(descripcion, options = {}) {
    const cleaned = String(descripcion ?? '').trim();
    if (cleaned.length < 6) {
      throw new Error(
        'Describí brevemente qué necesitás (al menos 6 caracteres) para poder orientarte.'
      );
    }

    // 1. Seguridad prioritaria (instantánea y local, sin esperar red)
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

    // 2. Resiliencia / simulación controlada de indisponibilidad (Criterio 4 - HU7)
    if (options.simulateUnavailable === true) {
      return {
        status: 'unavailable',
        isEmergency: false,
        isMentalHealthCrisis: false,
        suggestions: [],
        disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
        source: 'unavailable',
        error: UNAVAILABLE_MESSAGE,
      };
    }

    // 3. Intentar endpoint backend (/api/orientacion) y degradar con elegancia ante offline/404
    try {
      const response = await axiosClient.post(
        '/orientacion',
        { descripcion: cleaned },
        { timeout: 2500 }
      );
      const apiData = response.data || {};

      if (apiData.esUrgencia || apiData.isEmergency) {
        return {
          status: 'emergency',
          isEmergency: true,
          isMentalHealthCrisis: Boolean(apiData.isMentalHealthCrisis),
          matchedTerms: apiData.matchedTerms || [],
          emergencyContacts: EMERGENCY_CONTACTS,
          suggestions: [],
          disclaimer: apiData.advertencia || NON_DIAGNOSTIC_DISCLAIMER,
          source: 'api',
        };
      }

      const rawSuggestions = apiData.sugerencias || apiData.suggestions || [];
      const enrichedSuggestions = await enrichSuggestionsWithProfessionals(rawSuggestions);

      return {
        status: enrichedSuggestions.length > 0 ? 'ok' : 'no_match',
        isEmergency: false,
        isMentalHealthCrisis: false,
        suggestions: enrichedSuggestions,
        disclaimer: apiData.advertencia || NON_DIAGNOSTIC_DISCLAIMER,
        source: 'api',
      };
    } catch (err) {
      if (err.response?.status === 503) {
        return {
          status: 'unavailable',
          isEmergency: false,
          isMentalHealthCrisis: false,
          suggestions: [],
          disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
          source: 'unavailable',
          error: err.response.data?.detail || UNAVAILABLE_MESSAGE,
        };
      }

      // Ante 404 (endpoint aún no desplegado) o API offline: motor semántico local
      const analysis = analyzeOrientationQuery(cleaned);
      const enrichedSuggestions = await enrichSuggestionsWithProfessionals(analysis.suggestions);

      return {
        ...analysis,
        suggestions: enrichedSuggestions,
        source: 'semantic_local',
      };
    }
  },
};

export default orientacionService;
