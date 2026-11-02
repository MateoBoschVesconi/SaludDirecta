export const PROFESSIONALS = [
  {
    id: 1,
    name: 'Lic. Mateo Gómez',
    profession: 'Kinesiología',
    specialty: 'Kinesiología y Fisiatría',
    registry: 'MP 3412',
    jurisdiction: 'Chaco',
    isVerified: true,
    price: 25000,
    rating: 4.9,
    reviewsCount: 38,
    location: 'Resistencia, Chaco',
    address: 'Av. Sarmiento 450, Consultorio 3',
    hasRampAccessibility: true,
    description: 'Especialista en rehabilitación traumatológica deportiva y patologías de columna vertebral. Más de 8 años de experiencia en clínica privada y alto rendimiento.',
    packages: [
      { id: 'p1', sessions: 4, discountPercent: 10, title: 'Plan Recuperación (4 Sesiones)' },
      { id: 'p2', sessions: 8, discountPercent: 16, title: 'Plan Integral (8 Sesiones)' },
    ],
    availableSlots: [
      { date: '2026-11-05', dayLabel: 'Jue 05', times: ['09:00 hs', '10:30 hs', '11:30 hs', '16:00 hs'] },
      { date: '2026-11-06', dayLabel: 'Vie 06', times: ['09:30 hs', '11:00 hs', '15:30 hs'] },
      { date: '2026-11-09', dayLabel: 'Lun 09', times: ['10:00 hs', '11:30 hs', '17:00 hs'] },
      { date: '2026-11-10', dayLabel: 'Mar 10', times: ['09:00 hs', '10:30 hs', '16:30 hs'] },
      { date: '2026-11-11', dayLabel: 'Mié 11', times: ['11:00 hs', '14:30 hs', '18:00 hs'] },
    ]
  },
  {
    id: 2,
    name: 'Dra. Laura Martínez',
    profession: 'Nutrición',
    specialty: 'Nutrición Clínica y Deportiva',
    registry: 'MP 1845',
    jurisdiction: 'Chaco',
    isVerified: true,
    price: 18000,
    rating: 4.8,
    reviewsCount: 52,
    location: 'Resistencia, Chaco',
    address: 'Marcelo T. de Alvear 280',
    hasRampAccessibility: true,
    description: 'Acompañamiento nutricional personalizado, cambio de hábitos, nutrición en enfermedades crónicas y asesoramiento a deportistas.',
    packages: [
      { id: 'p3', sessions: 3, discountPercent: 10, title: 'Plan Inicio y Seguimiento (3 Sesiones)' },
      { id: 'p4', sessions: 6, discountPercent: 15, title: 'Plan Mantenimiento (6 Sesiones)' },
    ],
    availableSlots: [
      { date: '2026-11-05', dayLabel: 'Jue 05', times: ['08:30 hs', '10:00 hs', '11:30 hs'] },
      { date: '2026-11-06', dayLabel: 'Vie 06', times: ['09:00 hs', '10:30 hs'] },
      { date: '2026-11-09', dayLabel: 'Lun 09', times: ['15:00 hs', '16:30 hs', '18:00 hs'] },
    ]
  },
  {
    id: 3,
    name: 'Lic. Nicolás Valenzuela',
    profession: 'Psicología',
    specialty: 'Psicología Cognitivo-Conductual',
    registry: 'MP 2990',
    jurisdiction: 'Chaco',
    isVerified: true,
    price: 30000,
    rating: 5.0,
    reviewsCount: 29,
    location: 'Resistencia, Chaco',
    address: 'Güemes 124, 2do Piso B',
    hasRampAccessibility: false,
    description: 'Psicoterapia para adolescentes y adultos. Abordaje focalizado en ansiedad, depresión, manejo del estrés y habilidades de regulación emocional.',
    packages: [
      { id: 'p5', sessions: 4, discountPercent: 12, title: 'Módulo Terapéutico Mensual (4 Sesiones)' },
    ],
    availableSlots: [
      { date: '2026-11-05', dayLabel: 'Jue 05', times: ['14:00 hs', '15:30 hs', '17:00 hs'] },
      { date: '2026-11-07', dayLabel: 'Sáb 07', times: ['09:00 hs', '10:30 hs'] },
      { date: '2026-11-10', dayLabel: 'Mar 10', times: ['16:00 hs', '17:30 hs', '19:00 hs'] },
    ]
  },
];

