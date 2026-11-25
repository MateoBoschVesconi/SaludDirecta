import React from 'react';
import {
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Accessibility,
  Calendar,
  Star,
  Sparkles,
  Scale,
} from 'lucide-react';
import { getNextAvailableSlot, getProfessionalTimeWindows } from '../utils/professionalSearch';

export default function ProfessionalCard({
  professional,
  name,
  specialty,
  registry,
  price,
  onClick,
  isSelectedForCompare = false,
  onToggleCompare,
  compareDisabled = false,
}) {
  const pro = professional || {};
  const proName = pro.name || name || 'Profesional de Salud';
  const proSpecialty = pro.specialty || specialty || 'Consulta Particular';
  const proProfession = pro.profession || '';
  const proRegistry = pro.registry || registry || 'MP';
  const proPrice = Number(pro.price ?? price) || 0;
  const isVerified = pro.isVerified !== undefined ? Boolean(pro.isVerified) : true;
  const packages = Array.isArray(pro.packages) ? pro.packages : [];
  const maxDiscount = packages.reduce(
    (max, pkg) => Math.max(max, Number(pkg.discountPercent) || 0),
    0
  );

  const nextSlot = getNextAvailableSlot(pro);
  const windows = getProfessionalTimeWindows(pro);

  const windowLabels = [];
  if (windows.morning) windowLabels.push('Mañana');
  if (windows.afternoon) windowLabels.push('Tarde');
  if (windows.saturday) windowLabels.push('Sábados');

  const accessibilityTags = [];
  if (pro.hasRampAccessibility) accessibilityTags.push('Rampa');
  if (pro.hasElevator) accessibilityTags.push('Ascensor');
  if (pro.hasAdaptedBathroom) accessibilityTags.push('Baño adaptado');

  const initials = proName
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <article
      className={`card transition-all flex flex-col sm:flex-row sm:items-stretch justify-between gap-4 ${
        isSelectedForCompare ? 'border-primary-dark ring-1 ring-primary-dark bg-sky-50/30' : 'hover:shadow-md'
      }`}
    >
      {/* Bloque principal de información profesional */}
      <div className="flex gap-4 items-start flex-1 min-w-0">
        <div
          className="w-14 h-14 rounded-full bg-primary-dark text-white flex items-center justify-center font-bold text-lg shadow-sm flex-shrink-0"
          aria-hidden="true"
        >
          {initials}
        </div>

        <div className="min-w-0 flex-1 space-y-1.5">
          {/* Nombre + Badge de verificación obligatorio (Criterio 2 - HU6) */}
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-bold text-text-main text-lg leading-snug">{proName}</h2>
            {isVerified ? (
              <span className="badge-success">
                <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                Verificado SISA · {proRegistry}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 text-amber-900 font-semibold text-xs bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300">
                <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                Verificación Pendiente · {proRegistry}
              </span>
            )}
          </div>

          {/* Profesión, Especialidad y Calificación */}
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-text-muted">
            {proProfession && (
              <span className="font-semibold text-primary-dark">{proProfession}</span>
            )}
            {proProfession && <span aria-hidden="true">·</span>}
            <span>{proSpecialty}</span>
            {pro.rating && (
              <>
                <span aria-hidden="true">·</span>
                <span className="inline-flex items-center gap-1 font-semibold text-text-main">
                  <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" aria-hidden="true" />
                  {Number(pro.rating).toFixed(1)}
                  {pro.reviewsCount > 0 && (
                    <span className="font-normal text-text-muted">({pro.reviewsCount})</span>
                  )}
                </span>
              </>
            )}
          </div>

          {/* Localidad y Consultorio */}
          {(pro.location || pro.address) && (
            <p className="text-xs text-text-muted flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5 text-text-muted flex-shrink-0" aria-hidden="true" />
              <span className="truncate">
                {[pro.address, pro.location].filter(Boolean).join(' · ')}
              </span>
            </p>
          )}

          {/* Próximo turno y franjas de atención */}
          {(nextSlot || windowLabels.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-1 text-xs">
              {nextSlot && (
                <span className="inline-flex items-center gap-1 bg-sky-50 text-primary-dark border border-sky-200 px-2 py-0.5 rounded-md font-medium">
                  <Calendar className="w-3.5 h-3.5" aria-hidden="true" />
                  Próx. turno: {nextSlot.dayLabel} {nextSlot.time}
                </span>
              )}
              {windowLabels.map((label) => (
                <span
                  key={label}
                  className="bg-slate-100 text-text-main border border-slate-200 px-2 py-0.5 rounded-md text-[11px] font-medium"
                >
                  {label}
                </span>
              ))}
            </div>
          )}

          {/* Accesibilidad edilicia */}
          <div className="flex flex-wrap items-center gap-1.5 pt-0.5 text-[11px]">
            <Accessibility className="w-3.5 h-3.5 text-primary-dark flex-shrink-0" aria-hidden="true" />
            {accessibilityTags.length > 0 ? (
              accessibilityTags.map((tag) => (
                <span
                  key={tag}
                  className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-2 py-0.5 rounded-md font-medium"
                >
                  {tag}
                </span>
              ))
            ) : (
              <span className="text-text-muted">Sin accesibilidad declarada</span>
            )}
          </div>
        </div>
      </div>

      {/* Columna derecha: Honorario obligatorio + Acciones */}
      <div className="flex sm:flex-col items-center sm:items-end justify-between gap-3 pt-3 sm:pt-0 sm:pl-4 border-t sm:border-t-0 sm:border-l border-borderSubtle flex-shrink-0 sm:min-w-[185px]">
        <div className="text-left sm:text-right">
          <div className="font-extrabold text-xl text-text-main">
            $ {proPrice.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-text-muted">Consulta particular</div>
          {packages.length > 0 && (
            <div className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <Sparkles className="w-3 h-3" aria-hidden="true" />
              {maxDiscount > 0 ? `Paquetes hasta ${maxDiscount}% OFF` : `${packages.length} paquete(s)`}
            </div>
          )}
        </div>

        <div className="flex flex-wrap sm:flex-col items-stretch sm:items-end gap-2 w-auto sm:w-full">
          {onToggleCompare && (
            <button
              type="button"
              onClick={() => onToggleCompare(pro)}
              aria-pressed={isSelectedForCompare}
              disabled={compareDisabled && !isSelectedForCompare}
              className={`text-xs font-semibold px-3 py-1.5 rounded-lg border inline-flex items-center justify-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark ${
                isSelectedForCompare
                  ? 'bg-primary-light text-primary-dark border-primary-dark'
                  : compareDisabled
                  ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                  : 'bg-white text-text-main border-borderSubtle hover:bg-slate-50'
              }`}
              title={
                compareDisabled && !isSelectedForCompare
                  ? 'Podés comparar hasta 3 profesionales a la vez'
                  : isSelectedForCompare
                  ? 'Quitar de la comparación'
                  : 'Agregar para comparar lado a lado'
              }
            >
              <Scale className="w-3.5 h-3.5" aria-hidden="true" />
              {isSelectedForCompare ? 'Seleccionado' : 'Comparar'}
            </button>
          )}

          <button
            type="button"
            onClick={onClick}
            className="bg-primary-dark text-white hover:bg-sky-800 text-xs font-semibold px-4 py-2 rounded-lg inline-flex items-center justify-center gap-1 transition-colors shadow-sm focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary-dark"
          >
            Ver perfil y turnos
            <ChevronRight className="w-4 h-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
