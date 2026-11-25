import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { ShieldCheck, User, Stethoscope, FileCheck, AlertCircle } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService, saveRegisteredUser } from '../../api/authService';
import { profesionalService } from '../../api/profesionalService';

export default function RegisterPage() {
  const [searchParams] = useSearchParams();
  const initialRole = searchParams.get('rol') === 'profesional' ? 'profesional' : 'paciente';

  const navigate = useNavigate();
  const { login } = useAuth();

  const [role, setRole] = useState(initialRole);
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  
  // Campos específicos de profesional
  const [profesion, setProfesion] = useState('Kinesiología');
  const [matricula, setMatricula] = useState('');
  const [jurisdiccion, setJurisdiccion] = useState('Chaco');

  // Consentimiento Informado (Ley 25.326) - Obligatorio
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!showConsentModal) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowConsentModal(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showConsentModal]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!consentAccepted) {
      setError('Debes aceptar expresamente el consentimiento informado y los términos de tratamiento de datos personales (Ley 25.326).');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      // 1. Registro integrado con el Backend .NET 8 (HU1)
      const data = await authService.register({
        nombre,
        email,
        telefono,
        password,
        rol: role,
        profesion: role === 'profesional' ? profesion : null,
        matricula: role === 'profesional' ? matricula : null,
        jurisdiccion: role === 'profesional' ? jurisdiccion : null,
        consentimientoAceptado: true,
      });

      // Si es profesional, sincronizarlo directamente para que esté disponible en búsquedas y turnos
      if (role === 'profesional') {
        await profesionalService.registrarOActualizarProfesional({
          name: nombre,
          profession: profesion,
          specialty: profesion,
          registry: matricula,
          jurisdiction: jurisdiccion,
          price: 25000,
          location: 'Resistencia, Chaco',
        });
      }

      // Guardar usuario en registro local sin almacenar contraseña (Ley 25.326 / HU14)
      saveRegisteredUser({
        id: data.user?.id || (role === 'profesional' ? 'pro-' + Date.now() : 'pac-' + Date.now()),
        nombre,
        email,
        telefono,
        rol: role,
        profesion: role === 'profesional' ? profesion : undefined,
        matricula: role === 'profesional' ? matricula : undefined,
        jurisdiccion: role === 'profesional' ? jurisdiccion : undefined,
      });

      login(data.user, data.token);
      navigate(role === 'profesional' ? '/profesional/matricula' : '/');
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Demasiados intentos de registro en poco tiempo. Por seguridad, esperá un minuto antes de volver a intentar.');
      } else if (err.response?.status === 400 || err.response?.status === 409) {
        setError(
          err.response.data?.detail ||
            err.response.data?.mensaje ||
            err.response.data?.title ||
            'No se pudo completar el registro. Verificá los datos.'
        );
      } else if (err.response) {
        setError(
          err.response.data?.detail ||
            err.response.data?.mensaje ||
            err.response.data?.title ||
            'No se pudo completar el registro en este momento.'
        );
      } else {
        // 2. Fallback de desarrollo si la API local no está corriendo
        console.warn('Backend API no disponible, registrando en modo desarrollo:', err.message);
        const newUser = {
          id: role === 'profesional' ? 'pro-' + Date.now() : 'pac-' + Date.now(),
          nombre,
          email,
          telefono,
          rol: role,
          profesion: role === 'profesional' ? profesion : undefined,
          matricula: role === 'profesional' ? matricula : undefined,
          jurisdiccion: role === 'profesional' ? jurisdiccion : undefined,
          consentAcceptedAt: new Date().toISOString(),
        };

        if (role === 'profesional') {
          await profesionalService.registrarOActualizarProfesional({
            id: newUser.id,
            name: nombre,
            profession: profesion,
            specialty: profesion,
            registry: matricula,
            jurisdiction: jurisdiccion,
            price: 25000,
            location: 'Resistencia, Chaco',
          });
        }

        saveRegisteredUser(newUser);

        login(newUser, 'jwt_token_registered_' + Date.now());
        navigate(role === 'profesional' ? '/profesional/matricula' : '/');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto mt-8 px-4 pb-16 animate-in fade-in duration-300">
      <div className="card p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="inline-flex p-3 rounded-2xl bg-sky-50 text-primary-dark mb-3">
            <ShieldCheck className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text-main">Crear Cuenta</h1>
          <p className="text-xs text-text-muted mt-1">Registrate en Salud Directa para continuar</p>
        </div>

        {error && (
          <div
            role="alert"
            className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2 mb-4"
          >
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Selector de Rol */}
        <div
          className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg mb-6 text-xs font-semibold"
          role="tablist"
          aria-label="Tipo de cuenta"
        >
          <button
            type="button"
            role="tab"
            aria-selected={role === 'paciente'}
            onClick={() => setRole('paciente')}
            className={`py-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              role === 'paciente' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <User className="w-3.5 h-3.5" aria-hidden="true" /> Registro Paciente
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={role === 'profesional'}
            onClick={() => setRole('profesional')}
            className={`py-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              role === 'profesional' ? 'bg-white text-primary-dark shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" /> Registro Profesional
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="reg-nombre" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
              Nombre Completo
            </label>
            <input
              id="reg-nombre"
              type="text"
              required
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: Laura Martínez"
              className="input-field"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="reg-email" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                Correo Electrónico
              </label>
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="input-field"
              />
            </div>
            <div>
              <label htmlFor="reg-tel" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
                Teléfono de Contacto
              </label>
              <input
                id="reg-tel"
                type="tel"
                required
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej: 3624123456"
                className="input-field"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <input
              id="reg-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Mínimo 8 caracteres"
              className="input-field"
            />
          </div>

          {/* Campos adicionales si es profesional (HU2 preview) */}
          {role === 'profesional' && (
            <div className="p-4 bg-sky-50/70 border border-sky-200 rounded-xl space-y-3">
              <h3 className="text-xs font-bold text-primary-dark uppercase tracking-wider flex items-center gap-1.5">
                <FileCheck className="w-4 h-4" aria-hidden="true" /> Datos Profesionales Iniciales
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label htmlFor="reg-profesion" className="block text-[11px] font-semibold text-text-main mb-1">
                    Profesión
                  </label>
                  <select
                    id="reg-profesion"
                    value={profesion}
                    onChange={(e) => setProfesion(e.target.value)}
                    className="input-field py-2 text-xs"
                  >
                    <option value="Kinesiología">Kinesiología</option>
                    <option value="Nutrición">Nutrición</option>
                    <option value="Psicología">Psicología</option>
                    <option value="Fonoaudiología">Fonoaudiología</option>
                    <option value="Terapia Ocupacional">Terapia Ocupacional</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="reg-matricula" className="block text-[11px] font-semibold text-text-main mb-1">
                    N° de Matrícula
                  </label>
                  <input
                    id="reg-matricula"
                    type="text"
                    required
                    value={matricula}
                    onChange={(e) => setMatricula(e.target.value)}
                    placeholder="Ej: MP 3412"
                    className="input-field py-2 text-xs"
                  />
                </div>

                <div>
                  <label htmlFor="reg-jurisdiccion" className="block text-[11px] font-semibold text-text-main mb-1">
                    Jurisdicción
                  </label>
                  <select
                    id="reg-jurisdiccion"
                    value={jurisdiccion}
                    onChange={(e) => setJurisdiccion(e.target.value)}
                    className="input-field py-2 text-xs"
                  >
                    <option value="Chaco">Chaco</option>
                    <option value="Corrientes">Corrientes</option>
                    <option value="Formosa">Formosa</option>
                    <option value="Misiones">Misiones</option>
                    <option value="Nacional">Nacional</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Checkbox Obligatorio: Consentimiento Informado (Ley 25.326) */}
          <div className="pt-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                required
                checked={consentAccepted}
                onChange={(e) => setConsentAccepted(e.target.checked)}
                className="mt-1 rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
              />
              <span className="text-xs text-text-muted leading-relaxed">
                He leído y acepto expresamente el{' '}
                <button
                  type="button"
                  onClick={() => setShowConsentModal(true)}
                  className="text-primary-dark font-semibold underline hover:text-sky-900"
                >
                  Consentimiento Informado y Política de Privacidad (Ley 25.326)
                </button>
                , autorizando el tratamiento seguro de mis datos exclusivamente para la gestión de turnos particulares.
              </span>
            </label>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2">
            {isSubmitting ? 'Registrando...' : 'Completar Registro'}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-text-muted">
          ¿Ya tenés una cuenta?{' '}
          <Link to="/login" className="text-primary-dark font-semibold hover:underline">
            Iniciá sesión acá
          </Link>
        </div>
      </div>

      {/* Modal Accesible de Consentimiento Informado */}
      {showConsentModal && (
        <div 
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="consent-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowConsentModal(false);
          }}
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200">
            <h2 id="consent-title" className="text-lg font-bold text-text-main mb-3 flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" aria-hidden="true" />
              Consentimiento Informado — Ley 25.326
            </h2>
            <div className="text-xs text-text-muted space-y-3 max-h-72 overflow-y-auto pr-2 leading-relaxed border-y border-borderSubtle py-3">
              <p>
                En cumplimiento de la <strong>Ley Nacional N° 25.326 de Protección de los Datos Personales</strong> de la República Argentina, el titular de los datos presta su consentimiento libre, expreso e informado para el tratamiento de su información personal.
              </p>
              <p>
                <strong>Finalidad exclusiva:</strong> La recolección de datos personales (nombre, teléfono, correo electrónico, y datos de matriculación profesional en caso de corresponder) tiene como único fin la intermediación técnica, vinculación y agendamiento de turnos para consultas de salud particulares.
              </p>
              <p>
                <strong>Prohibición estricta de datos sensibles de salud:</strong> La plataforma <em>Salud Directa</em> bajo ninguna circunstancia solicita, recopila, procesa ni almacena información relativa a diagnósticos médicos, tratamientos farmacológicos ni historias clínicas de los pacientes.
              </p>
              <p>
                <strong>Derechos ARCO:</strong> El titular podrá ejercer en cualquier momento sus derechos de acceso, rectificación, actualización y supresión de sus datos personales comunicándose con el soporte de la plataforma.
              </p>
            </div>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowConsentModal(false)}
                className="btn-secondary text-xs py-2 px-4"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => {
                  setConsentAccepted(true);
                  setShowConsentModal(false);
                }}
                className="bg-primary-dark text-white text-xs font-semibold py-2 px-4 rounded-lg hover:bg-sky-800 transition-colors"
              >
                Aceptar Consentimiento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
