import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, Brain, Activity, Apple, ShieldCheck, Clock, CheckCircle } from 'lucide-react';

export default function HomePage() {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  const handleSearch = (e) => {
    e.preventDefault();
    navigate(`/resultados?q=${encodeURIComponent(searchTerm.trim())}`);
  };

  const handleQuickCategory = (category) => {
    navigate(`/resultados?categoria=${encodeURIComponent(category)}`);
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

      {/* Buscador Principal */}
      <form onSubmit={handleSearch} className="card p-2 mb-8 flex flex-col sm:flex-row items-center shadow-md border-borderSubtle focus-within:ring-2 focus-within:ring-primary-dark">
        <div className="flex items-center w-full px-3 py-2">
          <label htmlFor="search-input" className="sr-only">
            Buscar por especialidad, profesional o dolencia
          </label>
          <Search className="w-5 h-5 text-slate-400 mr-2 flex-shrink-0" aria-hidden="true" />
          <input
            id="search-input"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ej: Kinesiología, Nutrición, Psicología..."
            className="w-full border-none focus:ring-0 bg-transparent text-text-main text-base outline-none placeholder-text-muted"
          />
        </div>
        <button
          type="submit"
          className="w-full sm:w-auto bg-primary-dark text-white px-8 py-3 rounded-lg font-semibold hover:bg-sky-800 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-dark"
        >
          Buscar
        </button>
      </form>

      {/* Especialidades destacadas */}
      <section aria-labelledby="featured-specialties-heading" className="mb-12">
        <h2 id="featured-specialties-heading" className="text-xs font-bold text-text-muted uppercase tracking-wider mb-4">
          Especialidades destacadas
        </h2>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => handleQuickCategory('Kinesiología')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <Activity className="w-4 h-4 text-primary-dark" aria-hidden="true" />
            Kinesiología & Fisiatría
          </button>
          <button
            onClick={() => handleQuickCategory('Nutrición')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <Apple className="w-4 h-4 text-emerald-600" aria-hidden="true" />
            Nutrición Clínica
          </button>
          <button
            onClick={() => handleQuickCategory('Psicología')}
            className="flex items-center gap-2 bg-white border border-borderSubtle px-4 py-2.5 rounded-full text-sm font-medium hover:border-primary-dark hover:text-primary-dark transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-primary-dark"
          >
            <Brain className="w-4 h-4 text-purple-600" aria-hidden="true" />
            Psicología
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

