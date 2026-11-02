import React, { useState } from 'react';
import { useNavigate, useLocation, Link, useSearchParams } from 'react-router-dom';
import { Lock, Mail, AlertCircle, Stethoscope, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const sessionExpired = searchParams.get('expired') === 'true';

  const { login } = useAuth();

  const [role, setRole] = useState('paciente'); // 'paciente' o 'profesional'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Por favor completá tu correo y contraseña.');
      return;
    }

    // Simulación de login exitoso con JWT
    const mockUser = {
      id: role === 'profesional' ? 'pro-1' : 'pac-1',
      nombre: role === 'profesional' ? 'Lic. Mateo Gómez' : 'Federico Zeniquel',
      email,
      rol: role,
    };
    const mockJwt = 'mock_jwt_token_' + Date.now();

    login(mockUser, mockJwt);

    const redirectPath = location.state?.from?.pathname || (role === 'profesional' ? '/profesional/dashboard' : '/');
    navigate(redirectPath, { replace: true });
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
          <div className="inline-flex p-3 rounded-2xl bg-sky-50 text-primary-dark mb-3">
            <Lock className="w-6 h-6" aria-hidden="true" />
          </div>
          <h1 className="text-2xl font-bold text-text-main">Iniciar Sesión</h1>
          <p className="text-xs text-text-muted mt-1">Accedé a tu cuenta en Salud Directa</p>
        </div>

        {sessionExpired && (
          <div className="bg-amber-50 border border-amber-300 rounded-lg p-3 text-xs text-amber-800 flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>Tu sesión ha expirado por motivos de seguridad. Por favor, ingresá nuevamente.</span>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2 mb-4">
            <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{error}</span>
          </div>
        )}

        {/* Selector de Rol */}
        <div className="grid grid-cols-2 gap-2 p-1 bg-slate-100 rounded-lg mb-6 text-xs font-semibold" role="tablist">
          <button
            type="button"
            onClick={() => setRole('paciente')}
            className={`py-2 rounded-md flex items-center justify-center gap-1.5 transition-all ${
              role === 'paciente' ? 'bg-white text-text-main shadow-sm' : 'text-text-muted hover:text-text-main'
            }`}
          >
            <User className="w-3.5 h-3.5" aria-hidden="true" /> Paciente
          </button>
          <button
            type="button"
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

          <button type="submit" className="btn-primary mt-2">
            Ingresar
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
