import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ChevronLeft, CheckCircle2, MapPin, Accessibility, Calendar, Sparkles } from 'lucide-react';
import { PROFESSIONALS } from '../../data/mockData';

export default function ProfessionalProfilePage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const pro = PROFESSIONALS.find((p) => p.id === Number(id));

  const [selectedPlan, setSelectedPlan] = useState('individual'); // 'individual' o package id

  if (!pro) {
    return (
      <div className="max-w-2xl mx-auto mt-12 px-4 text-center">
        <h2 className="text-xl font-bold text-text-main mb-2">Profesional no encontrado</h2>
        <p className="text-sm text-text-muted mb-4">El perfil solicitado no existe o fue dado de baja.</p>
        <Link to="/resultados" className="text-primary-dark font-semibold hover:underline">
          Volver al listado
        </Link>
      </div>
    );
  }

  const initials = pro.name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();

  const handleStartBooking = () => {
    navigate(`/reservar/${pro.id}?plan=${selectedPlan}`);
  };

  return (
    <div className="max-w-3xl mx-auto mt-6 px-4 pb-12 animate-in fade-in duration-300">
      <button
        onClick={() => navigate(-1)}
        className="text-text-muted hover:text-text-main flex items-center text-sm font-semibold mb-6 transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-primary-dark"
      >
        <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Volver a resultados
      </button>

      <div className="card mb-6">
        {/* Cabecera del Perfil con Badge Oficial */}
        <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center mb-6">
          <div 
            className="w-20 h-20 rounded-full bg-primary-dark text-white flex items-center justify-center font-extrabold text-2xl shadow-md flex-shrink-0"
            aria-hidden="true"
          >
            {initials}
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <h1 className="font-bold text-2xl text-text-main">{pro.name}</h1>
              <span className="badge-success">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Matrícula Verificada SISA
              </span>
            </div>
            <p className="text-text-muted text-sm font-medium mb-1">
              {pro.specialty} · {pro.registry} ({pro.jurisdiction})
            </p>
            <p className="text-xs text-text-muted flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5" aria-hidden="true" />
              {pro.address}, {pro.location}
            </p>
          </div>
        </div>

        {/* Accesibilidad edilicia (HU4) */}
        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 mb-6 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-text-main font-medium">
            <Accessibility className="w-4 h-4 text-primary-dark" aria-hidden="true" />
            <span>Condiciones de accesibilidad edilicia:</span>
          </div>
          <span className={`font-semibold ${pro.hasRampAccessibility ? 'text-emerald-700' : 'text-slate-600'}`}>
            {pro.hasRampAccessibility ? '✓ Rampa de acceso y ascensor habilitados' : 'Sin rampa directa'}
          </span>
        </div>

        {/* Descripción profesional */}
        <div className="mb-8">
          <h2 className="text-sm font-bold text-text-main uppercase tracking-wider mb-2">Sobre el profesional</h2>
          <p className="text-text-main text-sm sm:text-base leading-relaxed">
            {pro.description}
          </p>
        </div>

        {/* Honorarios Obligatorios y Paquetes de Sesiones (HU4 y HU5) */}
        <div className="border-t border-borderSubtle pt-6">
          <h2 className="text-base font-bold text-text-main mb-1">Opciones de atención y honorarios</h2>
          <p className="text-xs text-text-muted mb-4">
            Valores finales acordados para atención particular. Seleccioná una modalidad para continuar:
          </p>

          <div className="space-y-3" role="radiogroup" aria-label="Selección de prestación o paquete">
            {/* Opción 1: Consulta Individual */}
            <div
              onClick={() => setSelectedPlan('individual')}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setSelectedPlan('individual'); }}
              tabIndex={0}
              role="radio"
              aria-checked={selectedPlan === 'individual'}
              className={`flex justify-between items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                selectedPlan === 'individual'
                  ? 'border-primary-dark bg-sky-50 shadow-sm'
                  : 'border-borderSubtle hover:border-slate-400 bg-white'
              }`}
            >
              <div>
                <div className="font-bold text-text-main text-sm sm:text-base">Consulta Individual</div>
                <div className="text-xs text-text-muted">Atención presencial en consultorio (1 sesión)</div>
              </div>
              <div className="text-right">
                <div className="font-extrabold text-xl text-primary-dark">$ {pro.price.toLocaleString('es-AR')}</div>
                <div className="text-[11px] text-text-muted">Precio final por sesión</div>
              </div>
            </div>

            {/* Opciones de Paquetes (HU5) */}
            {pro.packages?.map((pkg) => {
              const totalPrice = pro.price * pkg.sessions * (1 - pkg.discountPercent / 100);
              const isSelected = selectedPlan === pkg.id;

              return (
                <div
                  key={pkg.id}
                  onClick={() => setSelectedPlan(pkg.id)}
                  onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') setSelectedPlan(pkg.id); }}
                  tabIndex={0}
                  role="radio"
                  aria-checked={isSelected}
                  className={`flex justify-between items-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    isSelected
                      ? 'border-primary-dark bg-sky-50 shadow-sm'
                      : 'border-borderSubtle hover:border-slate-400 bg-white'
                  }`}
                >
                  <div>
                    <div className="font-bold text-text-main text-sm sm:text-base flex items-center gap-1.5">
                      {pkg.title}
                      <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sparkles className="w-3 h-3" aria-hidden="true" />
                        {pkg.discountPercent}% OFF
                      </span>
                    </div>
                    <div className="text-xs text-text-muted">Incluye {pkg.sessions} sesiones programadas</div>
                  </div>
                  <div className="text-right">
                    <div className="font-extrabold text-xl text-text-main">
                      $ {Math.round(totalPrice).toLocaleString('es-AR')}
                    </div>
                    <div className="text-[11px] text-emerald-700 font-semibold">
                      $ {Math.round(totalPrice / pkg.sessions).toLocaleString('es-AR')} / sesión
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Botón de Acción Principal */}
      <button
        onClick={handleStartBooking}
        className="btn-primary text-base py-3.5 shadow-md flex items-center justify-center gap-2"
      >
        <Calendar className="w-5 h-5" aria-hidden="true" />
        Continuar con la Reserva de Turno
      </button>
    </div>
  );
}
