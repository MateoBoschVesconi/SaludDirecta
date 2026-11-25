import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Search,
  Brain,
  Activity,
  Apple,
  ShieldCheck,
  Clock,
  CheckCircle,
  MapPin,
  SlidersHorizontal,
  AudioLines,
  Smile,
  ArrowRight,
} from 'lucide-react';

const PROFESSION_OPTIONS = [
  'Kinesiología',
  'Nutrición',
  'Psicología',
  'Fonoaudiología',
  'Odontología',
  'Terapia Ocupacional',
];

const LOCATION_OPTIONS = [
  'Resistencia, Chaco',
  'Corrientes Capital, Corrientes',
  'Barranqueras, Chaco',
];

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProfession, setSelectedProfession] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchTerm.trim()) params.set('q', searchTerm.trim());
    if (selectedProfession) params.set('profesion', selectedProfession);
    if (selectedLocation) params.set('localidad', selectedLocation);
    const qs = params.toString();
    navigate(qs ? `/resultados?${qs}` : '/resultados');
  };

  const handleQuickCategory = (profession) => {
    navigate(`/resultados?profesion=${encodeURIComponent(profession)}`);
  };

  return (
    <div className="max-w-4xl mx-auto mt-10 px-4 animate-in fade-in duration-300">
      {/* Hero Section */}
      <div className="text-center max-w-2xl mx-auto mb-10">
        <div className="inline-flex items-center gap-1.5 bg-sky-50 border border-sky-200 text-primary-dark px-3 py-1 rounded-full text-xs font-semibold mb-4">
          <ShieldCheck className="w-4 h-4" aria-hidden="true" />
          Atención Médica Particular Transparente
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-text-main mb-4 tracking-tight">
          Encontrá tu <span className="text-primary-dark">profesional particular</span>
        </h1>
        <p className="text-text-muted text-base leading-relaxed">
          Accedé a consultas particulares sin pagar coseguros ocultos. Matrículas oficiales verificadas ante organismos públicos (SISA / REFEPS).
        </p>
      </div>

      {/* Buscador Principal con Filtros Rápidos Combinables (HU6) */}
      <form
        onSubmit={handleSearch}
        className="card p-3 mb-8 space-y-3 shadow-md border-borderSubtle"
        role="search"
        aria-label="Buscador de profesionales de la salud"
      >
        <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
          <div className="flex items-center flex-1 border border-borderSubtle rounded-lg px-3 py-2.5 bg-white focus-within:ring-2 focus-within:ring-primary-dark">
            <label htmlFor="search-input" className="sr-only">
              Buscar por especialidad, profesional o localidad
            </label>
            <Search className="w-5 h-5 text-text-muted mr-2 flex-shrink-0" aria-hidden="true" />
            <input
              id="search-input"
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Ej: Kinesiología, Nutrición, Lic. Gómez..."
              className="w-full border-none focus:ring-0 bg-transparent text-text-main text-sm sm:text-base outline-none placeholder-text-muted"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:flex items-center gap-2.5">
            <div className="md:w-48">
              <label htmlFor="home-profession-select" className="sr-only">
                Filtrar por profesión
              </label>
              <select
                id="home-profession-select"
                value={selectedProfession}
                onChange={(e) => setSelectedProfession(e.target.value)}
                className="input-field py-2.5 px-3 text-xs sm:text-sm"
              >
                <option value="">Todas las profesiones</option>
                {PROFESSION_OPTIONS.map((prof) => (
                  <option key={prof} value={prof}>
                    {prof}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:w-52 relative">
              <label htmlFor="home-location-select" className="sr-only">
                Filtrar por localidad
              </label>
              <MapPin
                className="w-4 h-4 text-text-muted absolute left-3 top-3 pointer-events-none"
                aria-hidden="true"
              />
              <select
                id="home-location-select"
                value={selectedLocation}
                onChange={(e) => setSelectedLocation(e.target.value)}
                className="input-field py-2.5 pl-9 pr-3 text-xs sm:text-sm"
              >
                <option value="">Todas las localidades</option>
                {LOCATION_OPTIONS.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="w-full md:w-auto bg-primary-dark text-white px-7 py-2.5 rounded-lg font-semibold hover:bg-sky-800 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-dark"
          >
            Buscar
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-text-muted">
          <span>Podés combinar filtros de honorarios, horarios, accesibilidad edilicia y matrícula verificada.</span>
          <Link
            to="/resultados"
            className="text-primary-dark font-semibold hover:underline inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary-dark rounded px-1"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Explorar todos con filtros avanzados
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      </form>

      {/* Especialidades destacadas */}
      <section aria-labelledby="featured-specialties-heading" className="mb-12">
        <h2 id="featured-specialties-heading" className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
          Especialidades destacadas
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => handleQuickCategory('Kinesiología')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <Activity className="w-4 h-4 text-primary-dark" aria-hidden="true" />
            Kinesiología &amp; Fisiatría
          </button>
          <button
            type="button"
            onClick={() => handleQuickCategory('Nutrición')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <Apple className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            Nutrición Clínica
          </button>
          <button
            type="button"
            onClick={() => handleQuickCategory('Psicología')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <Brain className="w-4 h-4 text-purple-600" aria-hidden="true" />
            Psicología
          </button>
          <button
            type="button"
            onClick={() => handleQuickCategory('Fonoaudiología')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <AudioLines className="w-4 h-4 text-sky-700" aria-hidden="true" />
            Fonoaudiología
          </button>
          <button
            type="button"
            onClick={() => handleQuickCategory('Odontología')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <Smile className="w-4 h-4 text-amber-700" aria-hidden="true" />
            Odontología
          </button>
        </div>
      </section>

      {/* Beneficios Clave (RNF-07, HU4, HU11) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-borderSubtle">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-50 text-emerald-700">
            <CheckCircle className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-text-main text-sm">Honorarios Claros</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Precios finales publicados obligatoriamente. Sin sorpresas al momento de la consulta.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-sky-50 text-primary-dark">
            <Clock className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-text-main text-sm">Reserva Inmediata</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Disponibilidad en tiempo real para agendar en el día o coordinar sesiones programadas.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-lg bg-blue-50 text-blue-700">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </div>
          <div>
            <h3 className="font-semibold text-text-main text-sm">Validación Profesional</h3>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Registro validado con OCR y contrastado con bases oficiales de salud.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

