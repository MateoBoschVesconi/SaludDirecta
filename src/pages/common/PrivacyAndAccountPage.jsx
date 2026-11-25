import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Download,
  Eye,
  Trash2,
  AlertTriangle,
  Lock,
  CheckCircle2,
  FileText,
  Calendar,
  Bell,
  User,
  Database,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { cuentaService, downloadPersonalDataJson } from '../../api/cuentaService';

function formatIsoDateTime(value) {
  if (!value) return '-';
  try {
    return new Date(value).toLocaleString('es-AR', {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  } catch {
    return value;
  }
}

export default function PrivacyAndAccountPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Estados para Derecho de Acceso (GET /api/cuenta/me/datos)
  const [personalData, setPersonalData] = useState(null);
  const [dataSource, setDataSource] = useState(null); // 'api' | 'local'
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  // Estados para Derecho de Supresión (DELETE /api/cuenta/me)
  const [password, setPassword] = useState('');
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleLoadPersonalData = async () => {
    try {
      setLoadingData(true);
      setDataError('');
      const result = await cuentaService.exportarMisDatos();
      setPersonalData(result.data);
      setDataSource(result.source);
    } catch (err) {
      setDataError(err.message || 'No se pudieron consultar tus datos personales.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleDeleteAccount = async (e) => {
    e.preventDefault();
    if (!password.trim() || !confirmIrreversible) {
      setDeleteError('Completá tu contraseña actual y confirmá que comprendés el alcance del borrado.');
      return;
    }

    try {
      setIsDeleting(true);
      setDeleteError('');
      const result = await cuentaService.eliminarMiCuenta(password);
      logout();
      navigate('/login?accountDeleted=true', {
        replace: true,
        state: { turnosCancelados: result.turnosCancelados },
      });
    } catch (err) {
      setDeleteError(err.message || 'No se pudo eliminar la cuenta. Verificá tu contraseña.');
    } finally {
      setIsDeleting(false);
    }
  };

  const cuenta = personalData?.cuenta;
  const perfil = personalData?.perfil;
  const turnos = personalData?.turnos || [];
  const notificaciones = personalData?.notificaciones || [];

  return (
    <div className="max-w-4xl mx-auto mt-6 px-4 pb-16 space-y-6 animate-in fade-in duration-300">
      {/* Cabecera Principal */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-primary-dark flex-shrink-0" aria-hidden="true" />
            Privacidad y Gestión de Datos Personales
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Ejercé tus derechos de acceso y supresión de datos conforme a la{' '}
            <strong className="text-text-main">Ley Nacional N° 25.326 (HU14)</strong>.
          </p>
        </div>

        <span className="badge-success self-start whitespace-nowrap">
          <Lock className="w-3.5 h-3.5" aria-hidden="true" />
          Sin diagnósticos ni historia clínica (RNF-02)
        </span>
      </div>

      {/* Sección 1: Derecho de Acceso (GET /api/cuenta/me/datos) */}
      <section className="card space-y-4" aria-labelledby="section-access-title">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 id="section-access-title" className="text-base font-bold text-text-main flex items-center gap-2">
              <Database className="w-4 h-4 text-primary-dark" aria-hidden="true" />
              Derecho de Acceso — Mis Datos Almacenados
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Consultá y descargá en formato portable toda la información que Salud Directa registra sobre{' '}
              <strong className="text-text-main">{user?.email || 'tu cuenta'}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={handleLoadPersonalData}
              disabled={loadingData}
              className="btn-primary w-auto text-xs py-2.5 px-4 gap-2"
            >
              <Eye className="w-4 h-4" aria-hidden="true" />
              {loadingData
                ? 'Consultando...'
                : personalData
                ? 'Actualizar mis datos'
                : 'Consultar mis datos almacenados'}
            </button>

            {personalData && (
              <button
                type="button"
                onClick={() => downloadPersonalDataJson(personalData)}
                className="btn-secondary text-xs py-2.5 px-4 gap-2"
              >
                <Download className="w-4 h-4 text-primary-dark" aria-hidden="true" />
                Descargar copia en JSON
              </button>
            )}
          </div>
        </div>

        {dataError && (
          <div
            className="bg-red-50 border border-red-300 rounded-lg p-3 text-xs text-red-800 flex items-start gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-700 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{dataError}</span>
          </div>
        )}

        {personalData && (
          <div className="space-y-4 pt-2 border-t border-borderSubtle animate-in fade-in" role="status" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="text-text-muted">
                Reporte generado: <strong className="text-text-main">{formatIsoDateTime(personalData.generadoEn)}</strong>
              </span>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full font-semibold border text-[11px] ${
                  dataSource === 'api'
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                    : 'bg-sky-50 text-sky-800 border-sky-300'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                {dataSource === 'api' ? 'Sincronizado con API .NET 8' : 'Modo respaldo local'}
              </span>
            </div>

            {/* Datos de Cuenta */}
            <div className="bg-slate-50 border border-borderSubtle rounded-xl p-4 space-y-2">
              <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                Datos de la Cuenta
              </h3>
              <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
                <div>
                  <dt className="text-text-muted">Nombre completo</dt>
                  <dd className="font-semibold text-text-main">{cuenta?.nombre || '-'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Correo electrónico</dt>
                  <dd className="font-semibold text-text-main">{cuenta?.email || '-'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Teléfono</dt>
                  <dd className="font-semibold text-text-main">{cuenta?.telefono || 'No informado'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Rol en la plataforma</dt>
                  <dd className="font-semibold text-text-main capitalize">{cuenta?.rol || '-'}</dd>
                </div>
                <div>
                  <dt className="text-text-muted">Consentimiento informado (Ley 25.326)</dt>
                  <dd className="font-semibold text-text-main">
                    {formatIsoDateTime(cuenta?.consentimientoAceptadoEn)}
                  </dd>
                </div>
                <div>
                  <dt className="text-text-muted">Fecha de alta</dt>
                  <dd className="font-semibold text-text-main">{formatIsoDateTime(cuenta?.creadoEn)}</dd>
                </div>
                {(cuenta?.profesion || cuenta?.matricula || cuenta?.jurisdiccion) && (
                  <>
                    <div>
                      <dt className="text-text-muted">Profesión</dt>
                      <dd className="font-semibold text-text-main">{cuenta?.profesion || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Matrícula</dt>
                      <dd className="font-semibold text-text-main">{cuenta?.matricula || '-'}</dd>
                    </div>
                    <div>
                      <dt className="text-text-muted">Jurisdicción</dt>
                      <dd className="font-semibold text-text-main">{cuenta?.jurisdiccion || '-'}</dd>
                    </div>
                  </>
                )}
              </dl>
            </div>

            {/* Perfil Profesional (si corresponde) */}
            {perfil && (
              <div className="bg-sky-50/50 border border-sky-200 rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-primary-dark uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" aria-hidden="true" />
                  Perfil Público Profesional
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs pt-1">
                  <div>
                    <dt className="text-text-muted">Especialidad</dt>
                    <dd className="font-semibold text-text-main">{perfil.especialidad || '-'}</dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Consultorio y Ciudad</dt>
                    <dd className="font-semibold text-text-main">
                      {[perfil.direccion, perfil.ciudad].filter(Boolean).join(' · ') || '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Honorario base / Duración</dt>
                    <dd className="font-semibold text-text-main">
                      {perfil.honorarioConsulta !== null && perfil.honorarioConsulta !== undefined
                        ? `$ ${Number(perfil.honorarioConsulta).toLocaleString('es-AR')}`
                        : '-'}{' '}
                      · {perfil.duracionSesionMinutos} min
                    </dd>
                  </div>
                  <div>
                    <dt className="text-text-muted">Visibilidad</dt>
                    <dd className="font-semibold text-text-main">
                      {perfil.publicado ? 'Público en buscador' : 'Oculto temporalmente'}
                    </dd>
                  </div>
                </dl>
              </div>
            )}

            {/* Turnos y Notificaciones en 2 columnas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white border border-borderSubtle rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                    Turnos registrados
                  </span>
                  <span className="bg-slate-100 text-text-main px-2 py-0.5 rounded-full text-[11px]">
                    {turnos.length}
                  </span>
                </h3>
                {turnos.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-2">No registrás turnos asociados.</p>
                ) : (
                  <ul className="divide-y divide-borderSubtle max-h-52 overflow-y-auto text-xs">
                    {turnos.map((t, idx) => (
                      <li key={t.id || idx} className="py-2 flex items-center justify-between gap-2">
                        <div>
                          <div className="font-semibold text-text-main">{t.contraparte}</div>
                          <div className="text-[11px] text-text-muted">
                            {t.fecha} · {t.hora}
                          </div>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-slate-100 text-text-main font-semibold capitalize text-[11px]">
                          {t.estado}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              <div className="bg-white border border-borderSubtle rounded-xl p-4 space-y-2">
                <h3 className="text-xs font-bold text-text-main uppercase tracking-wider flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Bell className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                    Notificaciones emitidas
                  </span>
                  <span className="bg-slate-100 text-text-main px-2 py-0.5 rounded-full text-[11px]">
                    {notificaciones.length}
                  </span>
                </h3>
                {notificaciones.length === 0 ? (
                  <p className="text-xs text-text-muted italic py-2">No hay notificaciones recientes.</p>
                ) : (
                  <ul className="divide-y divide-borderSubtle max-h-52 overflow-y-auto text-xs">
                    {notificaciones.map((n, idx) => (
                      <li key={idx} className="py-2 space-y-0.5">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-text-main">{n.asunto}</span>
                          <span className="text-[10px] text-text-muted uppercase">{n.tipo}</span>
                        </div>
                        <p className="text-[11px] text-text-muted line-clamp-2">{n.mensaje}</p>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Sección 2: Garantías de Seguridad Activas */}
      <section className="card space-y-3" aria-labelledby="section-security-title">
        <h2 id="section-security-title" className="text-base font-bold text-text-main flex items-center gap-2">
          <Lock className="w-4 h-4 text-primary-dark" aria-hidden="true" />
          Garantías de Seguridad y Privacidad Activas
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-text-muted">
          <div className="bg-slate-50 border border-borderSubtle rounded-lg p-3">
            <strong className="text-text-main block mb-0.5">Bitácora Inmutable (RNF-04)</strong>
            Los eventos críticos de seguridad y pagos quedan registrados en modo solo escritura sin datos clínicos.
          </div>
          <div className="bg-slate-50 border border-borderSubtle rounded-lg p-3">
            <strong className="text-text-main block mb-0.5">Protección contra Fuerza Bruta</strong>
            El acceso y registro limitan los intentos consecutivos por IP (respuesta HTTP 429 ante exceso).
          </div>
          <div className="bg-slate-50 border border-borderSubtle rounded-lg p-3">
            <strong className="text-text-main block mb-0.5">Cabeceras y Cifrado (RNF-03)</strong>
            Políticas HTTP estrictas (`no-store` en API, protección contra framing y MIME sniffing) bajo transporte TLS.
          </div>
          <div className="bg-slate-50 border border-borderSubtle rounded-lg p-3">
            <strong className="text-text-main block mb-0.5">Aislamiento de Datos Sensibles (RNF-02)</strong>
            La plataforma vincula turnos y honorarios particulares; nunca almacena diagnósticos ni historia clínica.
          </div>
        </div>
      </section>

      {/* Sección 3: Derecho de Supresión / Eliminar Cuenta (DELETE /api/cuenta/me) */}
      <section
        className="card border-2 border-red-300 bg-red-50/30 space-y-4"
        aria-labelledby="section-delete-title"
      >
        <div>
          <h2 id="section-delete-title" className="text-base font-bold text-red-800 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-700" aria-hidden="true" />
            Derecho de Supresión — Eliminar mi Cuenta
          </h2>
          <p className="text-xs text-red-900 mt-1 leading-relaxed">
            De acuerdo con el art. 16 de la Ley N° 25.326, podés solicitar el borrado definitivo de tus datos personales.
            Al confirmar esta operación:
          </p>
          <ul className="list-disc list-inside text-xs text-red-900 mt-2 space-y-1">
            <li>Tus turnos activos (solicitados o confirmados) se cancelarán automáticamente y se notificará a la contraparte.</li>
            <li>Los turnos ya cumplidos se conservan como historial anonimizado sin tus datos identificatorios.</li>
            <li>Se eliminarán tu perfil, agenda, ausencias, honorarios y notificaciones, y se invalidará tu sesión JWT.</li>
            <li>La cuenta quedará anonimizada (<em>Usuario eliminado</em>), tu correo quedará libre para un eventual re-registro y la bitácora conservará únicamente el evento anónimo <code className="font-mono font-semibold">ELIMINACION_CUENTA</code>.</li>
          </ul>
        </div>

        {deleteError && (
          <div
            className="bg-red-100 border border-red-400 rounded-lg p-3 text-xs text-red-900 font-medium flex items-start gap-2"
            role="alert"
          >
            <AlertCircle className="w-4 h-4 text-red-800 flex-shrink-0 mt-0.5" aria-hidden="true" />
            <span>{deleteError}</span>
          </div>
        )}

        <form onSubmit={handleDeleteAccount} className="space-y-4 pt-2 border-t border-red-200">
          <div>
            <label
              htmlFor="delete-account-password"
              className="block text-xs font-bold text-red-900 uppercase tracking-wider mb-1"
            >
              Confirmá tu contraseña actual
            </label>
            <input
              id="delete-account-password"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Ingresá tu contraseña para autorizar el borrado"
              className="input-field border-red-300 focus:ring-red-700"
            />
          </div>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmIrreversible}
              onChange={(e) => setConfirmIrreversible(e.target.checked)}
              className="mt-0.5 rounded text-red-700 focus:ring-red-700 w-4 h-4 border-red-400"
            />
            <span className="text-xs font-medium text-red-900 leading-relaxed">
              Entiendo que esta acción es irreversible y que mis turnos activos serán cancelados.
            </span>
          </label>

          <button
            type="submit"
            disabled={isDeleting || !password.trim() || !confirmIrreversible}
            className={`inline-flex items-center justify-center gap-2 font-semibold text-xs py-3 px-5 rounded-lg transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-red-700 ${
              isDeleting || !password.trim() || !confirmIrreversible
                ? 'bg-red-200 text-red-800/60 cursor-not-allowed'
                : 'bg-red-700 text-white hover:bg-red-800 shadow-sm'
            }`}
          >
            <Trash2 className="w-4 h-4" aria-hidden="true" />
            {isDeleting ? 'Eliminando cuenta...' : 'Eliminar mi cuenta definitivamente'}
          </button>
        </form>
      </section>
    </div>
  );
}
