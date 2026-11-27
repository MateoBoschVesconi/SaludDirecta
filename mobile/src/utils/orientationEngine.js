import { normalizeText } from './searchEngine.js';

/**
 * Motor puro de orientación asistida y detección prioritaria de urgencias (HU7 / RF-08).
 * No emite diagnósticos médicos ni almacena descripciones sensibles (Ley 25.326 / RNF-02).
 */

export const NON_DIAGNOSTIC_DISCLAIMER =
  'Esta orientación asistida es únicamente informativa para ayudarte a elegir qué tipo de profesional consultar. No constituye un diagnóstico médico ni reemplaza una evaluación profesional. Tu descripción no se almacena ni forma parte de ninguna historia clínica (Ley 25.326).';

export const EMERGENCY_CONTACTS = [
  {
    number: '107',
    href: 'tel:107',
    label: 'Emergencias Médicas / SAME (24 hs)',
    priority: 'primary',
  },
  {
    number: '911',
    href: 'tel:911',
    label: 'Central de Emergencias (24 hs)',
    priority: 'secondary',
  },
];

export const MENTAL_HEALTH_CRISIS_CONTACT = {
  number: '0800-345-1435',
  href: 'tel:08003451435',
  label: 'Línea Nacional de Prevención del Suicidio y Salud Mental (24 hs, gratuita)',
  priority: 'crisis',
};

const MEDICAL_EMERGENCY_TERMS = [
  'dolor de pecho',
  'dolor en el pecho',
  'opresion en el pecho',
  'infarto',
  'paro cardiaco',
  'no puedo respirar',
  'falta de aire',
  'me falta el aire',
  'ahogo',
  'asfixia',
  'me cuesta respirar',
  'acv',
  'derrame cerebral',
  'desmayo',
  'perdida de conocimiento',
  'inconsciente',
  'convulsion',
  'convulsiones',
  'paralisis',
  'hemorragia',
  'sangrado abundante',
  'sangrado intenso',
  'intoxicacion',
  'envenenamiento',
  'anafilaxia',
  'se me cierra la garganta',
  'fractura expuesta',
  'traumatismo grave',
  'quemadura grave',
  'fiebre muy alta',
  '40 grados',
];

const MENTAL_HEALTH_CRISIS_TERMS = [
  'suicidio',
  'suicidarme',
  'quitarme la vida',
  'matarme',
  'hacerme dano',
  'autolesion',
  'no quiero vivir',
];

const PROFESSION_CATALOG = [
  {
    profession: 'Kinesiología',
    specialtyFocus: 'Kinesiología y Fisiatría / Rehabilitación Física',
    summary:
      'Profesionales dedicados a la recuperación muscular, articular, postural y respiratoria.',
    phrases: [
      'dolor de espalda',
      'dolor lumbar',
      'dolor cervical',
      'lesion deportiva',
      'rehabilitacion fisica',
      'dolor de rodilla',
      'dolor de hombro',
      'dolor de cuello',
      'contractura muscular',
      'correccion postural',
    ],
    keywords: [
      'espalda',
      'lumbar',
      'cervical',
      'columna',
      'contractura',
      'muscular',
      'lesion',
      'esguince',
      'tendinitis',
      'rodilla',
      'hombro',
      'tobillo',
      'postura',
      'rehabilitacion',
      'kinesiologia',
    ],
  },
  {
    profession: 'Nutrición',
    specialtyFocus: 'Nutrición Clínica y Deportiva',
    summary:
      'Acompañamiento alimentario personalizado, cambio de hábitos y asesoramiento nutricional.',
    phrases: [
      'mejorar mi alimentacion',
      'bajar colesterol',
      'plan alimentario',
      'control de peso',
      'alimentacion saludable',
      'nutricion deportiva',
      'bajar de peso',
    ],
    keywords: [
      'nutricion',
      'alimentacion',
      'dieta',
      'colesterol',
      'trigliceridos',
      'glucemia',
      'peso',
      'adelgazar',
      'comida',
      'alimentos',
      'celiaquia',
      'intolerancia',
      'habitos',
    ],
  },
  {
    profession: 'Psicología',
    specialtyFocus: 'Psicología Clínica y Terapia Cognitivo-Conductual',
    summary:
      'Psicoterapia enfocada en bienestar emocional, manejo del estrés, ansiedad y descanso.',
    phrases: [
      'me cuesta dormir',
      'ataques de panico',
      'manejo del estres',
      'salud mental',
      'salud emocional',
      'necesito hablar con alguien',
      'agotamiento laboral',
    ],
    keywords: [
      'ansiedad',
      'estres',
      'angustia',
      'tristeza',
      'depresion',
      'panico',
      'insomnio',
      'dormir',
      'duelo',
      'miedos',
      'emocional',
      'terapia',
      'psicologia',
    ],
  },
  {
    profession: 'Fonoaudiología',
    specialtyFocus: 'Fonoaudiología Pediátrica y Adultos',
    summary:
      'Evaluación y abordaje de la voz, el lenguaje, el habla, la audición y la deglución.',
    phrases: [
      'problemas del habla',
      'trastorno del lenguaje',
      'perdida de la voz',
      'cuesta pronunciar',
      'dificultad para tragar',
    ],
    keywords: [
      'voz',
      'disfonia',
      'afonia',
      'tartamudez',
      'pronunciacion',
      'habla',
      'lenguaje',
      'deglucion',
      'tragar',
      'audicion',
      'oido',
      'fonoaudiologia',
    ],
  },
  {
    profession: 'Odontología',
    specialtyFocus: 'Odontología General, Preventiva y Ortodoncia',
    summary:
      'Cuidado bucodental, prevención, alivio de molestias dentales, encías y ortodoncia.',
    phrases: [
      'dolor de muela',
      'dolor de muelas',
      'dolor de dientes',
      'limpieza dental',
      'encias sangrantes',
      'caries dental',
    ],
    keywords: [
      'muela',
      'muelas',
      'diente',
      'dientes',
      'caries',
      'ortodoncia',
      'encias',
      'bucal',
      'mandibula',
      'bruxismo',
      'odontologia',
      'dentista',
    ],
  },
  {
    profession: 'Terapia Ocupacional',
    specialtyFocus: 'Rehabilitación Funcional y Motricidad',
    summary:
      'Intervención centrada en autonomía cotidiana, motricidad fina, coordinación y ergonomía.',
    phrases: [
      'actividades de la vida diaria',
      'motricidad fina',
      'rehabilitacion neurologica',
      'recuperar autonomia',
      'adaptacion del hogar',
    ],
    keywords: [
      'autonomia',
      'motricidad',
      'mano',
      'dedos',
      'coordinacion',
      'neurologica',
      'ergonomia',
      'estimulacion',
      'ocupacional',
      'funcional',
    ],
  },
];

function buildSearchableText(rawText = '') {
  return normalizeText(rawText)
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsTerm(searchableText, term) {
  if (!searchableText || !term) return false;
  const pattern = new RegExp(`(?:^|\\s)${escapeRegex(term)}(?:$|\\s)`);
  return pattern.test(searchableText);
}

export function detectEmergency(rawText = '') {
  const searchable = buildSearchableText(rawText);
  if (!searchable) {
    return { isEmergency: false, isMentalHealthCrisis: false, matchedTerms: [] };
  }

  const matchedMedical = MEDICAL_EMERGENCY_TERMS.filter((term) => containsTerm(searchable, term));
  const matchedMentalHealth = MENTAL_HEALTH_CRISIS_TERMS.filter((term) =>
    containsTerm(searchable, term)
  );

  const matchedTerms = [...new Set([...matchedMedical, ...matchedMentalHealth])];
  return {
    isEmergency: matchedTerms.length > 0,
    isMentalHealthCrisis: matchedMentalHealth.length > 0,
    matchedTerms,
  };
}

export function analyzeOrientationQuery(rawText = '') {
  const emergencyCheck = detectEmergency(rawText);
  if (emergencyCheck.isEmergency) {
    return {
      status: 'emergency',
      isEmergency: true,
      isMentalHealthCrisis: emergencyCheck.isMentalHealthCrisis,
      matchedTerms: emergencyCheck.matchedTerms,
      suggestions: [],
      disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
    };
  }

  const searchable = buildSearchableText(rawText);
  const scored = [];

  for (const entry of PROFESSION_CATALOG) {
    let score = 0;
    const matched = [];

    for (const phrase of entry.phrases) {
      if (containsTerm(searchable, phrase)) {
        score += 3;
        matched.push(phrase);
      }
    }

    for (const keyword of entry.keywords) {
      if (containsTerm(searchable, keyword)) {
        score += 1.5;
        if (!matched.some((m) => m.includes(keyword))) {
          matched.push(keyword);
        }
      }
    }

    if (score > 0) {
      const uniqueMatched = [...new Set(matched)].slice(0, 3);
      scored.push({
        profession: entry.profession,
        specialtyFocus: entry.specialtyFocus,
        affinityLabel: score >= 4.5 ? 'Alta afinidad' : 'Afinidad sugerida',
        score,
        matchedTerms: uniqueMatched,
        reason: `Relacionado con tu consulta sobre: ${uniqueMatched.join(', ')}. ${entry.summary}`,
      });
    }
  }

  scored.sort((a, b) => b.score - a.score);
  const suggestions = scored.slice(0, 3);

  if (suggestions.length === 0) {
    return {
      status: 'no_match',
      isEmergency: false,
      isMentalHealthCrisis: false,
      suggestions: [],
      disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
    };
  }

  return {
    status: 'ok',
    isEmergency: false,
    isMentalHealthCrisis: false,
    suggestions,
    disclaimer: NON_DIAGNOSTIC_DISCLAIMER,
  };
}
