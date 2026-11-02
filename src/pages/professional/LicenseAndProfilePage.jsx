import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Building2, 
  DollarSign, 
  Accessibility, 
  Save, 
  Eye, 
  ShieldCheck, 
  MapPin, 
  Sparkles,
  Info
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_PROFILE = {
  profession: 'Kinesiología y Fisiatría',
  specialty: 'Rehabilitación Deportiva y Columna',
  registry: 'MP 3412',
  jurisdiction: 'Chaco',
  verificationStatus: 'verificado', // 'verificado' | 'pendiente' | 'observado'
  consultationPrice: 25000,
  sessionDurationMinutes: 45,
  address: 'Av. Sarmiento 450, Consultorio 3',
  city: 'Resistencia, Chaco',
  phone: '3624-889900',
  description: 'Especialista en rehabilitación traumatológica deportiva y patologías de columna vertebral. Más de 8 años de experiencia en clínica privada y alto rendimiento.',
  hasRamp: true,
  hasElevator: true,
  hasAdaptedBathroom: true,
  isPublished: true,
};

export default function LicenseAndProfilePage() {
  const { user } = useAuth();

  // Inicialización directa (lazy state initializer) evitando set-state-in-effect
  const [formData, setFormData] = useState(() => {
    const base = {
      ...DEFAULT_PROFILE,
      name: user?.nombre || 'Lic. Mateo Gómez',
    };
    try {
      const saved = localStorage.getItem('salud_directa_pro_profile');
      return saved ? { ...base, ...JSON.parse(saved) } : base;
    } catch {
      return base;
    }
  });

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: null }));
    }
    setSavedSuccess(false);
  };

  const handleSave = (e) => {
    e.preventDefault();
    const newErrors = {};

    if (!formData.registry.trim()) {
      newErrors.registry = 'El número de matrícula es obligatorio.';
    }
    if (!formData.consultationPrice || Number(formData.consultationPrice) <= 0) {
      newErrors.consultationPrice = 'Es obligatorio fijar un honorario de consulta válido (HU4).';
    }
    if (!formData.address.trim()) {
      newErrors.address = 'La dirección del consultorio es obligatoria.';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    localStorage.setItem('salud_directa_pro_profile', JSON.stringify(formData));
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 4000);
  };

  // Renderizado condicional del badge de verificación oficial (HU2)
  const renderVerificationBadge = () => {
    switch (formData.verificationStatus) {
      case 'verificado':
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-emerald-50 border border-emerald-300 text-emerald-950">
            <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-sm text-emerald-900 flex items-center gap-1.5">
                <span>Profesional Verificado Oficialmente</span>
                <span className="bg-emerald-200 text-emerald-800 text-[10px] px-2 py-0.5 rounded-full font-bold">SISA / REFEPS</span>
              </div>
              <p className="text-xs text-emerald-800 mt-1 leading-relaxed">
                Tu matrícula <strong>{formData.registry}</strong> está validada ante el Registro Federal de Profesionales de la Salud (REFEPS - Jurisdicción {formData.jurisdiction}). Tu distintivo de confianza es visible para todos los pacientes.
              </p>
            </div>
          </div>
        );
      case 'pendiente':
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-300 text-amber-950">
            <Clock className="w-5 h-5 text-amber-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-sm text-amber-900">Validación en Trámite</div>
              <p className="text-xs text-amber-800 mt-1 leading-relaxed">
                Tus datos fueron enviados a contrastación con el padrón de {formData.jurisdiction}. Mientras tanto, tu perfil puede recibir solicitudes que quedarán sujetas a confirmación.
              </p>
            </div>
          </div>
        );
      case 'observado':
        return (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-300 text-red-950">
            <AlertTriangle className="w-5 h-5 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-sm text-red-900">Matrícula Requiere Revisión Manual</div>
              <p className="text-xs text-red-800 mt-1 leading-relaxed">
                No se pudo validar automáticamente la matrícula en SISA. Por favor subí tu credencial o título en la sección <strong>Carga Documental / OCR</strong> para validación por el equipo auditor.
              </p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Cabecera de Página */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-primary-dark" aria-hidden="true" />
            Matrícula Profesional y Honorarios
          </h1>
          <p className="text-sm text-text-muted">
            Administrá tus credenciales oficiales de salud, publicación de honorarios y condiciones de tu consultorio.
          </p>
        </div>

        {/* Toggle de Publicación de Perfil */}
        <div className="flex items-center gap-2 bg-white border border-borderSubtle px-3 py-2 rounded-xl shadow-sm self-start sm:self-auto">
          <span className="text-xs font-semibold text-text-main">Estado del Perfil:</span>
          <button
            type="button"
            onClick={() => handleChange('isPublished', !formData.isPublished)}
            className={`text-xs font-bold px-2.5 py-1 rounded-full transition-colors ${
              formData.isPublished
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                : 'bg-slate-200 text-slate-700 border border-slate-300'
            }`}
          >
            {formData.isPublished ? '● Público y Activo' : '○ En Pausa (Oculto)'}
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div 
          className="bg-emerald-50 border border-emerald-300 text-emerald-900 rounded-xl p-4 flex items-center gap-3 shadow-sm animate-in slide-in-from-top-2"
          role="status"
          aria-live="polite"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-700 flex-shrink-0" aria-hidden="true" />
          <div className="text-sm font-semibold">
            ¡Los cambios en tu perfil y honorarios se guardaron exitosamente!
          </div>
        </div>
      )}

      {/* Grid Principal: Formulario a la izquierda, Previsualización en Vivo a la derecha */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Formulario (Columnas 1 a 7) */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* SECCIÓN 1: Estado de Verificación y Matrícula Oficial (HU2) */}
          <section className="card space-y-4" aria-labelledby="section-matricula">
            <div className="flex items-center justify-between">
              <h2 id="section-matricula" className="font-bold text-base text-text-main flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-primary-dark" aria-hidden="true" />
                1. Datos de Matriculación Oficial (HU2)
              </h2>
              {/* Selector interactivo para demo/simulación de auditoría */}
              <select
                aria-label="Simular estado de verificación"
                value={formData.verificationStatus}
                onChange={(e) => handleChange('verificationStatus', e.target.value)}
                className="text-[11px] font-semibold bg-slate-50 border border-borderSubtle rounded-md px-2 py-1 text-text-muted hover:border-slate-400"
              >
                <option value="verificado">Simular: Verificado SISA</option>
                <option value="pendiente">Simular: En Trámite</option>
                <option value="observado">Simular: Observado</option>
              </select>
            </div>

            {/* Banner condicional de verificación */}
            {renderVerificationBadge()}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-profesion" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Profesión
                </label>
                <select
                  id="input-profesion"
                  value={formData.profession}
                  onChange={(e) => handleChange('profession', e.target.value)}
                  className="input-field"
                >
                  <option value="Kinesiología y Fisiatría">Kinesiología y Fisiatría</option>
                  <option value="Nutrición">Nutrición Clínica y Deportiva</option>
                  <option value="Psicología">Psicología</option>
                  <option value="Fonoaudiología">Fonoaudiología</option>
                  <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                  <option value="Odontología">Odontología</option>
                </select>
              </div>

              <div>
                <label htmlFor="input-specialty" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Especialidad / Enfoque Clínico
                </label>
                <input
                  id="input-specialty"
                  type="text"
                  value={formData.specialty}
                  onChange={(e) => handleChange('specialty', e.target.value)}
                  placeholder="Ej: Rehabilitación de Columna"
                  className="input-field"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-registry" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  N° de Matrícula Profesional *
                </label>
                <input
                  id="input-registry"
                  type="text"
                  required
                  value={formData.registry}
                  onChange={(e) => handleChange('registry', e.target.value)}
                  placeholder="Ej: MP 3412"
                  className={`input-field font-mono ${errors.registry ? 'border-medical-error ring-1 ring-medical-error' : ''}`}
                />
                {errors.registry && <p className="text-xs text-medical-error mt-1">{errors.registry}</p>}
              </div>

              <div>
                <label htmlFor="input-jurisdiction" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Jurisdicción Emisora
                </label>
                <select
                  id="input-jurisdiction"
                  value={formData.jurisdiction}
                  onChange={(e) => handleChange('jurisdiction', e.target.value)}
                  className="input-field"
                >
                  <option value="Chaco">Chaco (Colegio de Kinesiólogos del Chaco)</option>
                  <option value="Corrientes">Corrientes</option>
                  <option value="Formosa">Formosa</option>
                  <option value="Misiones">Misiones</option>
                  <option value="Nacional">Nacional (Ministerio de Salud de la Nación)</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECCIÓN 2: Publicación de Honorarios Obligatorios (HU4) */}
          <section className="card space-y-4" aria-labelledby="section-honorarios">
            <div>
              <h2 id="section-honorarios" className="font-bold text-base text-text-main flex items-center gap-2">
                <DollarSign className="w-5 h-5 text-emerald-700" aria-hidden="true" />
                2. Honorarios Obligatorios de Consulta Particular (HU4)
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Según las pautas de transparencia de la plataforma, el valor de la consulta individual debe ser público y fijado con antelación para el paciente.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-price" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Valor Consulta Individual ($ ARS) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-3 text-text-muted font-bold text-sm">$</span>
                  <input
                    id="input-price"
                    type="number"
                    min="1000"
                    step="500"
                    required
                    value={formData.consultationPrice}
                    onChange={(e) => handleChange('consultationPrice', e.target.value)}
                    className={`input-field pl-8 font-semibold text-base ${errors.consultationPrice ? 'border-medical-error ring-1 ring-medical-error' : ''}`}
                  />
                </div>
                {errors.consultationPrice && <p className="text-xs text-medical-error mt-1">{errors.consultationPrice}</p>}
              </div>

              <div>
                <label htmlFor="input-duration" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Duración Estimada por Sesión
                </label>
                <select
                  id="input-duration"
                  value={formData.sessionDurationMinutes}
                  onChange={(e) => handleChange('sessionDurationMinutes', Number(e.target.value))}
                  className="input-field"
                >
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1 hora)</option>
                  <option value={90}>90 minutos</option>
                </select>
              </div>
            </div>
          </section>

          {/* SECCIÓN 3: Consultorio y Accesibilidad Edilicia (HU4 & RNF-07) */}
          <section className="card space-y-4" aria-labelledby="section-consultorio">
            <div>
              <h2 id="section-consultorio" className="font-bold text-base text-text-main flex items-center gap-2">
                <Building2 className="w-5 h-5 text-primary-dark" aria-hidden="true" />
                3. Consultorio y Accesibilidad Edilicia (HU4 / RNF-07)
              </h2>
              <p className="text-xs text-text-muted mt-0.5">
                Información del lugar físico de atención y adecuaciones arquitectónicas para pacientes con movilidad reducida.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="input-address" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Dirección del Consultorio *
                </label>
                <input
                  id="input-address"
                  type="text"
                  required
                  value={formData.address}
                  onChange={(e) => handleChange('address', e.target.value)}
                  placeholder="Ej: Av. Sarmiento 450, Piso 1"
                  className={`input-field ${errors.address ? 'border-medical-error ring-1 ring-medical-error' : ''}`}
                />
                {errors.address && <p className="text-xs text-medical-error mt-1">{errors.address}</p>}
              </div>

              <div>
                <label htmlFor="input-city" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                  Localidad y Provincia
                </label>
                <input
                  id="input-city"
                  type="text"
                  value={formData.city}
                  onChange={(e) => handleChange('city', e.target.value)}
                  placeholder="Ej: Resistencia, Chaco"
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label htmlFor="input-desc" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                Bio / Reseña Profesional
              </label>
              <textarea
                id="input-desc"
                rows={3}
                value={formData.description}
                onChange={(e) => handleChange('description', e.target.value)}
                placeholder="Describí tu trayectoria y enfoque de atención..."
                className="input-field resize-none leading-relaxed"
              />
            </div>

            {/* Checkboxes de Accesibilidad */}
            <fieldset className="pt-2 border-t border-borderSubtle">
              <legend className="text-xs font-bold text-text-main uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Accessibility className="w-4 h-4 text-primary-dark" aria-hidden="true" />
                Adecuaciones Edilicias para Personas con Discapacidad
              </legend>
              <div className="space-y-2 text-xs">
                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasRamp}
                    onChange={(e) => handleChange('hasRamp', e.target.checked)}
                    className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
                  />
                  <span className="text-text-main font-medium">Cuenta con rampa de acceso o ingreso a nivel de calle (sin escalones)</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasElevator}
                    onChange={(e) => handleChange('hasElevator', e.target.checked)}
                    className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
                  />
                  <span className="text-text-main font-medium">Ascensor amplio habilitado para sillas de ruedas</span>
                </label>

                <label className="flex items-center gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.hasAdaptedBathroom}
                    onChange={(e) => handleChange('hasAdaptedBathroom', e.target.checked)}
                    className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
                  />
                  <span className="text-text-main font-medium">Sanitario adaptado para movilidad reducida</span>
                </label>
              </div>
            </fieldset>
          </section>

          {/* Botón de Guardado Principal */}
          <button
            type="submit"
            className="btn-primary text-base py-3.5 shadow-md flex items-center justify-center gap-2"
          >
            <Save className="w-5 h-5" aria-hidden="true" />
            Guardar y Actualizar Perfil Público
          </button>
        </form>

        {/* Panel Lateral: Previsualización en Vivo para Pacientes (Columnas 8 a 12) */}
        <aside className="lg:col-span-5 sticky top-6 space-y-4" aria-label="Previsualización de cómo verán los pacientes este perfil">
          <div className="flex items-center justify-between text-xs font-bold text-text-muted uppercase tracking-wider px-1">
            <span className="flex items-center gap-1.5">
              <Eye className="w-4 h-4 text-primary-dark" aria-hidden="true" />
              Vista Previa para Pacientes
            </span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" aria-hidden="true" /> En tiempo real
            </span>
          </div>

          {/* Tarjeta de Búsqueda Simulada */}
          <div className="card border-2 border-primary-light shadow-md bg-white">
            <div className="flex gap-4 items-start mb-4">
              <div className="w-14 h-14 rounded-full bg-primary-dark text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0">
                {formData.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-text-main text-base truncate">{formData.name}</h3>
                  {formData.verificationStatus === 'verificado' && (
                    <span className="badge-success text-[10px] py-0.5">
                      <CheckCircle2 className="w-3 h-3" aria-hidden="true" /> SISA {formData.registry}
                    </span>
                  )}
                </div>
                <p className="text-xs text-text-muted font-medium mt-0.5">{formData.specialty || formData.profession}</p>
                <p className="text-[11px] text-text-muted flex items-center gap-1 mt-1">
                  <MapPin className="w-3 h-3 text-slate-400" aria-hidden="true" />
                  {formData.city}
                </p>
              </div>
            </div>

            {/* Accesibilidad en la tarjeta */}
            <div className="bg-slate-50 rounded-lg p-2.5 mb-4 text-[11px] border border-slate-200 flex items-center gap-1.5 text-text-muted">
              <Accessibility className="w-3.5 h-3.5 text-primary-dark flex-shrink-0" aria-hidden="true" />
              <span>
                {formData.hasRamp
                  ? '✓ Rampa de acceso habilitada'
                  : 'Sin rampa directa al ingreso'}
              </span>
            </div>

            <p className="text-xs text-text-main line-clamp-2 mb-4 leading-relaxed">
              {formData.description}
            </p>

            <div className="pt-3 border-t border-borderSubtle flex items-center justify-between">
              <div>
                <span className="text-[10px] text-text-muted uppercase font-bold block">Honorario consulta</span>
                <span className="text-xl font-extrabold text-primary-dark">
                  $ {Number(formData.consultationPrice || 0).toLocaleString('es-AR')}
                </span>
              </div>
              <span className="text-xs bg-primary-dark text-white font-semibold px-3 py-1.5 rounded-lg shadow-sm">
                Reservar Turno
              </span>
            </div>
          </div>

          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl text-xs text-blue-900 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-blue-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <p className="leading-relaxed">
              Los cambios guardados impactan inmediatamente en el buscador público y en la ficha del profesional (HU4 y HU6).
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
