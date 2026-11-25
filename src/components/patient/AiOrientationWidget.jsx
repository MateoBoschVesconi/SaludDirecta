import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Sparkles,
  AlertTriangle,
  PhoneCall,
  ShieldAlert,
  ArrowRight,
  CheckCircle2,
  Clock,
  MapPin,
  RotateCcw,
  SlidersHorizontal,
  Info,
  AlertCircle,
} from 'lucide-react';
import { orientacionService } from '../../api/orientacionService';

const QUICK_EXAMPLES = [
  'Tengo dolor lumbar y contractura al trabajar',
  'Quiero mejorar mi alimentación y bajar colesterol',
  'Siento mucho estrés, ansiedad y me cuesta dormir',
];

export default function AiOrientationWidget() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [simulateUnavailable, setSimulateUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      setValidationError('');
      const response = await orientacionService.orientarPaciente(query, {
        simulateUnavailable,
      });
      setResult(response);
    } catch (err) {
      setResult(null);
      setValidationError(err.message || 'No pudimos procesar tu consulta en este momento.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setValidationError('');
  };

  const handleUseExample = (text) => {
    setQuery(text);
    setValidationError('');
    setResult(null);
  };

  return (
    <section
      id="orientacion-ia"
      aria-labelledby="ai-orientation-title"
      className="card mb-10 space-y-4 border-sky-200 bg-gradient-to-b from-sky-50/50 to-white scroll-mt-24"
    >
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-primary-dark bg-sky-100 border border-sky-200 px-2.5 py-0.5 rounded-full mb-2">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            Orientación Inteligente (HU7)
          </span>
          <h2 id="ai-orientation-title" className="text-lg sm:text-xl font-bold text-text-main">
            ¿No sabés qué profesional consultar? Orientación Asistida por IA
          </h2>
          <p className="text-xs sm:text-sm text-text-muted mt-0.5">
            Describí brevemente lo que necesitás en tus propias palabras para recibir sugerencias de especialidades disponibles.
          </p>
        </div>
      </div>

      {/* Banner Permanente y Visible de Advertencia Médica + Privacidad (Criterio 2 - HU7 / RNF-02) */}
      <div
        role="note"
        className="bg-amber-50 border border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 flex items-start gap-2.5"
      >
        <ShieldAlert className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" aria-hidden="true" />
        <div className="leading-relaxed">
          <strong className="font-bold text-amber-950">No constituye un diagnóstico médico.</strong>{' '}
          Esta herramienta solo orienta sobre qué especialidad podría ayudarte a programar una consulta particular.
          Ante urgencias médicas, llamá al <strong>107 (SAME)</strong> o <strong>911</strong>. Tu descripción no se guarda en ninguna historia clínica (Ley N° 25.326).
        </div>
      </div>

      {/* Formulario en Lenguaje Natural */}
      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <div className="flex items-center justify-between gap-2 mb-1.5">
            <label
              htmlFor="ai-orientation-input"
              className="block text-xs font-bold text-text-main uppercase tracking-wider"
            >
              Contanos brevemente qué molestia, consulta o necesidad tenés
            </label>
            <span className="text-[11px] text-text-muted font-mono" aria-live="off">
              {query.length}/400
            </span>
          </div>
          <textarea
            id="ai-orientation-input"
            rows={3}
            maxLength={400}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              if (validationError) setValidationError('');
            }}
            placeholder="Ej: Tengo dolor lumbar desde hace unos días al levantar peso y busco rehabilitación física..."
            className="input-field resize-y min-h-[84px]"
          />
        </div>

        {/* Ejemplos rápidos para guiar al paciente */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-text-muted font-medium">Ejemplos rápidos:</span>
          {QUICK_EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => handleUseExample(example)}
              className="bg-white border border-borderSubtle hover:border-primary-dark hover:text-primary-dark text-text-main px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark"
            >
              “{example}”
            </button>
          ))}
        </div>

        {validationError && (
          <div
            role="alert"
            className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-900 flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{validationError}</span>
          </div>
        )}

        {/* Acciones + Simulación de resiliencia (Criterio 4) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
          <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer select-none">
            <input
              type="checkbox"
              checked={simulateUnavailable}
              onChange={(e) => setSimulateUnavailable(e.target.checked)}
              className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
            />
            <span>Simular indisponibilidad del servicio de IA (prueba de resiliencia)</span>
          </label>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            {(query.trim() || result) && (
              <button
                type="button"
                onClick={handleClear}
                className="btn-secondary text-xs py-2.5 px-3.5 gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Limpiar
              </button>
            )}
            <button
              type="submit"
              disabled={!query.trim() || isLoading}
              className={`text-xs font-semibold py-2.5 px-5 rounded-lg inline-flex items-center justify-center gap-2 transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-dark ${
                !query.trim() || isLoading
                  ? 'bg-slate-300 text-slate-600 cursor-not-allowed'
                  : 'bg-primary-dark text-white hover:bg-sky-800 shadow-sm'
              }`}
            >
              <Sparkles className="w-4 h-4" aria-hidden="true" />
              {isLoading ? 'Analizando consulta...' : 'Orientar mi búsqueda'}
            </button>
          </div>
        </div>
      </form>

      {/* Resultado 1: DERIVACIÓN PRIORITARIA A EMERGENCIAS (Criterio 3 - HU7) */}
      {result?.status === 'emergency' && (
        <div
          role="alert"
          aria-live="assertive"
          className="bg-red-50 border-2 border-red-600 rounded-xl p-5 text-red-950 space-y-4 shadow-sm animate-in fade-in"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-6 h-6 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div className="space-y-1">
              <h3 className="text-base font-extrabold text-red-900">
                Derivación Prioritaria a Emergencias — No esperes un turno programado
              </h3>
              <p className="text-xs sm:text-sm text-red-900 leading-relaxed">
                Tu mensaje incluye señales que podrían requerir atención médica o contención inmediata de urgencia.
                Salud Directa coordina únicamente consultas particulares programadas; por favor comunicate ahora mismo con la guardia o emergencias:
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {result.emergencyContacts?.map((contact) => (
              <a
                key={contact.number}
                href={contact.href}
                className={`flex items-center justify-between gap-3 p-3.5 rounded-xl font-bold text-xs sm:text-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-700 ${
                  contact.priority === 'primary' || contact.priority === 'crisis'
                    ? 'bg-red-700 text-white hover:bg-red-800 shadow-sm'
                    : 'bg-white text-red-900 border-2 border-red-400 hover:bg-red-100'
                }`}
              >
                <span className="flex items-center gap-2">
                  <PhoneCall className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
                  <span>{contact.label}</span>
                </span>
                <span className="font-mono text-base whitespace-nowrap">{contact.number}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Resultado 2: SUGERENCIAS DE PROFESIONES Y PROFESIONALES (Criterio 1 + Criterio 2) */}
      {result?.status === 'ok' && (
        <div
          role="region"
          aria-live="polite"
          aria-label="Especialidades sugeridas por orientación asistida"
          className="space-y-4 pt-2 border-t border-borderSubtle animate-in fade-in"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-bold text-text-main">
              Especialidades sugeridas según tu descripción ({result.suggestions.length}):
            </span>
            <span className="inline-flex items-center gap-1 font-semibold text-amber-950 bg-amber-100 border border-amber-300 px-2.5 py-0.5 rounded-full">
              <Info className="w-3.5 h-3.5 text-amber-800" aria-hidden="true" />
              Orientación informativa — No constituye un diagnóstico médico
            </span>
          </div>

          <div className="space-y-4">
            {result.suggestions.map((item) => (
              <div
                key={item.profession}
                className="bg-white border border-borderSubtle rounded-xl p-4 space-y-3 shadow-sm"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="text-base font-bold text-text-main">{item.profession}</h3>
                      <span className="bg-sky-100 text-primary-dark border border-sky-200 text-[11px] font-bold px-2.5 py-0.5 rounded-full">
                        {item.affinityLabel}
                      </span>
                    </div>
                    <p className="text-xs text-text-muted mt-0.5">{item.specialtyFocus}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      navigate(`/resultados?profesion=${encodeURIComponent(item.profession)}`)
                    }
                    className="btn-secondary text-xs py-2 px-3.5 gap-1.5 self-start sm:self-auto"
                  >
                    <span>Ver todos en {item.profession} con filtros</span>
                    <ArrowRight className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                  </button>
                </div>

                <p className="text-xs text-text-main leading-relaxed bg-slate-50 border border-slate-200 rounded-lg p-3">
                  {item.reason}
                </p>

                {item.professionals && item.professionals.length > 0 ? (
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted block">
                      Profesionales disponibles en esta especialidad:
                    </span>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {item.professionals.map((pro) => (
                        <div
                          key={pro.id}
                          className="border border-borderSubtle rounded-lg p-3 flex items-center justify-between gap-3 bg-white hover:border-primary-dark transition-colors"
                        >
                          <div className="min-w-0 space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span className="font-bold text-xs sm:text-sm text-text-main truncate">
                                {pro.name}
                              </span>
                              {pro.isVerified ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                                  <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
                                  Verificado SISA
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-900 bg-amber-100 border border-amber-300 px-2 py-0.5 rounded-full">
                                  <Clock className="w-3 h-3" aria-hidden="true" />
                                  Pendiente
                                </span>
                              )}
                            </div>
                            <p className="text-[11px] text-text-muted flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" aria-hidden="true" />
                              {pro.location} ·{' '}
                              <strong className="text-text-main">
                                $ {Number(pro.price).toLocaleString('es-AR')}
                              </strong>
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => navigate(`/profesional/${pro.id}`)}
                            className="bg-primary-dark text-white hover:bg-sky-800 text-xs font-semibold px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark"
                          >
                            Ver perfil
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-text-muted italic">
                    Podés explorar filtros combinables de localidades y disponibilidad para esta especialidad.
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Resultado 3: INDISPONIBILIDAD DE IA -> BUSCADOR SIGUE OPERATIVO (Criterio 4 - HU7) */}
      {result?.status === 'unavailable' && (
        <div
          role="alert"
          className="bg-amber-50 border border-amber-400 rounded-xl p-4 text-xs sm:text-sm text-amber-950 space-y-3 animate-in fade-in"
        >
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-800 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <strong className="font-bold block">Orientación asistida temporalmente no disponible</strong>
              <p className="text-xs text-amber-900 mt-0.5 leading-relaxed">
                {result.error ||
                  'El servicio de IA no responde en este momento. Podés seguir buscando profesionales manualmente sin inconvenientes.'}
              </p>
            </div>
          </div>
          <Link
            to="/resultados"
            className="btn-primary w-auto text-xs py-2 px-4 gap-2"
          >
            <SlidersHorizontal className="w-3.5 h-3.5" aria-hidden="true" />
            Usar buscador con filtros combinables
          </Link>
        </div>
      )}

      {/* Resultado 4: SIN COINCIDENCIA CLARA */}
      {result?.status === 'no_match' && (
        <div
          role="status"
          aria-live="polite"
          className="bg-slate-50 border border-borderSubtle rounded-xl p-4 text-xs text-text-main space-y-2.5 animate-in fade-in"
        >
          <p className="font-semibold">
            No pudimos asociar tu descripción a una especialidad específica con suficiente certeza.
          </p>
          <p className="text-text-muted leading-relaxed">
            Intentá detallar el área o necesidad (por ejemplo: movilidad, alimentación, estrés, audición, salud dental o autonomía diaria) o explorá todas las especialidades directamente. Recordá que ante cualquier urgencia debés llamar al <strong>107 (SAME)</strong>.
          </p>
          <Link
            to="/resultados"
            className="text-primary-dark font-semibold hover:underline inline-flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary-dark rounded px-1"
          >
            Explorar todas las especialidades con filtros
            <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>
      )}
    </section>
  );
}
