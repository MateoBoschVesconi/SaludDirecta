import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Lock, Mail, AlertCircle, CheckCircle2, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { authService, findRegisteredUserByEmail } from '../../api/authService';
import logoIsotipo from '../../assets/logo-isotipo.png';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';
  const accountDeleted = searchParams.get('accountDeleted') === 'true';
  const turnosCancelados = location.state?.turnosCancelados;

  const { login } = useAuth();

  const [role, setRole] = useState('paciente'); // 'paciente' o 'profesional'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completá tu correo y contraseña.');
      return;
    }

    try {
      setIsSubmitting(true);
      setError('');
      // 1. Intentar autenticación con el Backend .NET 8 (HU1)
      const data = await authService.login({ email, password });
      login(data.user, data.token);

      const redirectPath = location.state?.from?.pathname || (data.user.rol === 'profesional' ? '/profesional/dashboard' : '/');
      navigate(redirectPath, { replace: true });
    } catch (err) {
      if (err.response?.status === 429) {
        setError('Demasiados intentos en poco tiempo. Por seguridad, esperá un minuto antes de volver a intentar.');
      } else if (err.response?.status === 400 || err.response?.status === 401) {
        setError(
          err.response.data?.detail ||
            err.response.data?.mensaje ||
            err.response.data?.title ||
            'Credenciales inválidas. Verificá tu correo y contraseña.'
        );
      } else if (err.response) {
        setError(
          err.response.data?.detail ||
            err.response.data?.mensaje ||
            err.response.data?.title ||
            'No se pudo iniciar sesión en este momento.'
        );
      } else {
        // 2. Si la API no está encendida aún, buscar en los usuarios registrados localmente
        console.warn('Backend API no disponible, iniciando con cuenta local/desarrollo:', err.message);
        
        const existingUser = findRegisteredUserByEmail(email);

        let userToLogin;
        if (existingUser) {
          // Si el usuario se registró con este correo, usar sus datos reales
          userToLogin = {
            id: existingUser.id,
            nombre: existingUser.nombre,
            email: existingUser.email,
            telefono: existingUser.telefono,
            rol: existingUser.rol || role,
            profesion: existingUser.profesion,
            matricula: existingUser.matricula,
            jurisdiccion: existingUser.jurisdiccion,
          };
        } else {
          // Si no está en registrados, verificar si guardó perfil previamente en el navegador
          let savedName = '';
          try {
            const savedProfile = localStorage.getItem('salud_directa_pro_profile');
            if (savedProfile) {
              const parsed = JSON.parse(savedProfile);
              if (parsed.name && parsed.name !== 'Lic. Mateo Gómez') {
                savedName = parsed.name;
              }
            }
          } catch {
            // Ignorar
          }

          // Limpiar caracteres numéricos o signos del inicio del email para formatear un nombre legible
          const rawPrefix = email.split('@')[0].replace(/[0-9_]/g, ' ').trim();
          const derivedName = rawPrefix
            .split(/[\s.]+/)
            .filter(Boolean)
            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');

          const finalName = savedName || derivedName || (role === 'profesional' ? 'Profesional de la Salud' : 'Paciente Particular');

          userToLogin = {
            id: (role === 'profesional' ? 'pro-' : 'pac-') + Date.now(),
            nombre: role === 'profesional' && !finalName.startsWith('Lic.') && !finalName.startsWith('Dr.') ? `Lic. ${finalName}` : finalName,
            email,
            rol: role,
          };
        }

        const mockJwt = 'mock_jwt_token_' + Date.now();
        login(userToLogin, mockJwt);

        const redirectPath = location.state?.from?.pathname || (userToLogin.rol === 'profesional' ? '/profesional/dashboard' : '/');
        navigate(redirectPath, { replace: true });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickDemoLogin = (selectedRole) => {
    const demoUser = selectedRole === 'profesional'
      ? { id: 'pro-1', nombre: 'Lic. Mateo Gómez', email: 'mateo.gomez@saluddirecta.ar', rol: 'profesional' }
      : { id: 'pac-1', nombre: 'Federico Zeniquel', email: 'federico.zeniquel@saluddirecta.ar', rol: 'paciente' };
    
    login(demoUser, 'mock_jwt_token_demo');
    navigate(selectedRole === 'profesional' ? '/profesional/dashboard' : '/');
  };

  return (
    <div className="max-w-md mx-auto mt-10 px-4 pb-16 animate-in fade-in duration-300">
      <div className="card p-6 sm:p-8">
        <div className="text-center mb-6">
          <img
            src={logoIsotipo}
            alt=""
            aria-hidden="true"
            className="w-14 h-14 object-contain mx-auto mb-3"
          />
          <h1 className="text-2xl font-bold text-text-main">Iniciar Sesión</h1>
          <p className="text-xs text-text-muted mt-1">Accedé a tu cuenta en Salud Directa</p>
        </div>

        {accountDeleted && (
          <div
            className="bg-emerald-50 border border-emerald-300 rounded-lg p-3 text-xs text-emerald-900 flex items-start gap-2 mb-4"
            role="status"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>
              Tu cuenta y datos personales fueron eliminados definitivamente según la Ley 25.326.
              {typeof turnosCancelados === 'number' && turnosCancelados > 0
                ? ` Se cancelaron ${turnosCancelados} turno(s) activo(s) y se notificó a la contraparte.`
                : ''}
            </span>
          </div>
        )}

        {sessionExpired && (
          <div
            className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2 mb-4"
            role="status"
          >
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>Tu sesión ha expirado por motivos de seguridad. Por favor, ingresá nuevamente.</span>
          </div>
        )}

        {error && (
          <div
            className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2 mb-4"
            role="alert"
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
            <User className="w-3.5 h-3.5" aria-hidden="true" /> Paciente
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
            <Stethoscope className="w-3.5 h-3.5" aria-hidden="true" /> Profesional
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="login-email" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="usuario@ejemplo.com"
                className="input-field pl-10"
              />
            </div>
          </div>

          <div>
            <label htmlFor="login-password" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" aria-hidden="true" />
              <input
                id="login-password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="input-field pl-10"
              />
            </div>
          </div>

          <button type="submit" disabled={isSubmitting} className="btn-primary mt-2">
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>

        {/* Acceso Rápido Demo (Útil para pair programming y desarrollo ágil) */}
        <div className="mt-6 pt-6 border-t border-borderSubtle">
          <p className="text-[11px] font-semibold text-text-muted uppercase text-center mb-2.5">
            Acceso Rápido para Pruebas (Demo)
          </p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('paciente')}
              className="text-xs font-semibold py-2 px-3 border border-borderSubtle rounded-lg bg-white hover:bg-slate-50 text-text-main transition-colors text-center"
            >
              Demo Paciente
            </button>
            <button
              type="button"
              onClick={() => handleQuickDemoLogin('profesional')}
              className="text-xs font-semibold py-2 px-3 border border-sky-300 rounded-lg bg-sky-50 hover:bg-sky-100 text-primary-dark transition-colors text-center"
            >
              Demo Profesional
            </button>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-text-muted">
          ¿No tenés una cuenta?{' '}
          <Link to={`/registro?rol=${role}`} className="text-primary-dark font-semibold hover:underline">
            Registrate acá
          </Link>
        </div>
      </div>
    </div>
  );
}
