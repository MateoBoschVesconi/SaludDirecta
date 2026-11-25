import React, { useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Clock,
  Scale,
  MapPin,
  Accessibility,
  Calendar,
  Sparkles,
  ChevronRight,
} from 'lucide-react';
import { getNextAvailableSlot, getProfessionalTimeWindows } from '../../utils/professionalSearch';

export default function ProfessionalCompareModal({
  professionals,
  isOpen,
  onClose,
  onRemove,
  onSelectProfessional,
}) {
  useEffect(() => {
    if (!isOpen) return undefined;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !professionals || professionals.length === 0) {
    return null;
  }

  const lowestPrice = Math.min(...professionals.map((p) => Number(p.price) || 0));

  const renderAccessibilityRow = (pro) => {
    const items = [
      { label: 'Rampa', value: Boolean(pro.hasRampAccessibility) },
      { label: 'Ascensor', value: Boolean(pro.hasElevator) },
      { label: 'Baño adaptado', value: Boolean(pro.hasAdaptedBathroom) },
    ];
    return (
      <ul className="space-y-1 text-xs">
        {items.map((item) => (
          <li key={item.label} className="flex items-center justify-between gap-2">
            <span className="text-text-muted">{item.label}:</span>
            <span
              className={`font-semibold ${
                item.value ? 'text-emerald-800' : 'text-text-muted'
              }`}
            >
              {item.value ? 'Sí' : 'No informado'}
            </span>
          </li>
        ))}
      </ul>
    );
  };

  const renderAvailabilityRow = (pro) => {
    const nextSlot = getNextAvailableSlot(pro);
    const windows = getProfessionalTimeWindows(pro);
    const turnosLabel = [
      windows.morning && 'Mañana',
      windows.afternoon && 'Tarde',
      windows.saturday && 'Sábados',
    ]
      .filter(Boolean)
      .join(' · ');

    return (
      <div className="space-y-1 text-xs">
        <div className="font-semibold text-text-main">
          {nextSlot ? `${nextSlot.dayLabel} ${nextSlot.time}` : 'Consultar agenda'}
        </div>
        <div className="text-text-muted">
          {turnosLabel || 'Sin franjas cargadas'}
        </div>
        <div className="text-[11px] text-primary-dark font-medium">
          Sesión de {Number(pro.sessionDurationMinutes) || 45} min
        </div>
      </div>
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compare-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-borderSubtle overflow-hidden">
        {/* Header del Modal */}
        <div className="px-6 py-4 border-b border-borderSubtle flex items-center justify-between gap-4 bg-slate-50">
          <div>
            <h2
              id="compare-modal-title"
              className="text-lg font-bold text-text-main flex items-center gap-2"
            >
              <Scale className="w-5 h-5 text-primary-dark" aria-hidden="true" />
              Comparativa de Profesionales ({professionals.length})
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Compará honorarios transparentes, verificación de matrícula, accesibilidad y disponibilidad.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-text-muted hover:text-text-main hover:bg-slate-200/70 transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark"
            aria-label="Cerrar comparativa"
          >
            <X className="w-5 h-5" aria-hidden="true" />
          </button>
        </div>

        {/* Tabla Comparativa Responsive */}
        <div className="p-6 overflow-auto flex-1">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[600px]">
              <thead>
                <tr className="border-b-2 border-borderSubtle">
                  <th
                    scope="col"
                    className="py-3 pr-4 text-xs font-bold uppercase tracking-wider text-text-muted w-44 align-bottom"
                  >
                    Criterio
                  </th>
                  {professionals.map((pro) => (
                    <th key={pro.id} scope="col" className="py-3 px-4 align-top min-w-[200px]">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="font-bold text-sm text-text-main">{pro.name}</div>
                          <div className="text-xs font-medium text-primary-dark">
                            {pro.profession || pro.specialty}
                          </div>
                          <div className="text-[11px] font-normal text-text-muted mt-0.5">
                            {pro.specialty}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => onRemove(pro.id)}
                          className="text-text-muted hover:text-medical-error p-1 rounded hover:bg-red-50 transition-colors focus-visible:ring-2 focus-visible:ring-medical-error"
                          aria-label={`Quitar a ${pro.name} de la comparación`}
                          title="Quitar"
                        >
                          <X className="w-4 h-4" aria-hidden="true" />
                        </button>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-borderSubtle text-sm">
                {/* Verificación y Matrícula */}
                <tr>
                  <th scope="row" className="py-3.5 pr-4 text-xs font-semibold text-text-main align-top">
                    Verificación REFEPS / SISA
                  </th>
                  {professionals.map((pro) => (
                    <td key={pro.id} className="py-3.5 px-4 align-top">
                      {pro.isVerified ? (
                        <span className="badge-success mb-1">
                          <CheckCircle2 className="w-3.5 h-3.5" aria-hidden="true" />
                          Verificado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-amber-900 font-semibold text-xs bg-amber-100 px-2.5 py-1 rounded-full border border-amber-300 mb-1">
                          <Clock className="w-3.5 h-3.5" aria-hidden="true" />
                          Pendiente
                        </span>
                      )}
                      <div className="text-xs text-text-muted mt-1">
                        {pro.registry || 'MP'} ({pro.jurisdiction || 'Chaco'})
                      </div>
                    </td>
                  ))}
                </tr>

                {/* Honorario Particular */}
                <tr>
                  <th scope="row" className="py-3.5 pr-4 text-xs font-semibold text-text-main align-top">
                    Honorario particular
                  </th>
                  {professionals.map((pro) => {
                    const price = Number(pro.price) || 0;
                    const isLowest = professionals.length > 1 && price === lowestPrice;
                    return (
                      <td key={pro.id} className="py-3.5 px-4 align-top">
                        <div className="text-lg font-extrabold text-text-main">
                          $ {price.toLocaleString('es-AR')}
                        </div>
                        {isLowest && (
                          <span className="inline-block mt-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 border border-emerald-300 px-2 py-0.5 rounded-full">
                            Menor honorario
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Paquetes de Tratamiento */}
                <tr>
                  <th scope="row" className="py-3.5 pr-4 text-xs font-semibold text-text-main align-top">
                    <span className="inline-flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                      Paquetes de sesiones
                    </span>
                  </th>
                  {professionals.map((pro) => {
                    const packages = Array.isArray(pro.packages) ? pro.packages : [];
                    const maxDiscount = packages.reduce(
                      (max, p) => Math.max(max, Number(p.discountPercent) || 0),
                      0
                    );
                    return (
                      <td key={pro.id} className="py-3.5 px-4 align-top text-xs">
                        {packages.length > 0 ? (
                          <div>
                            <div className="font-semibold text-text-main">
                              {packages.length} {packages.length === 1 ? 'plan disponible' : 'planes disponibles'}
                            </div>
                            {maxDiscount > 0 && (
                              <div className="text-emerald-800 font-semibold mt-0.5">
                                Hasta {maxDiscount}% de descuento
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-text-muted">Solo consulta individual</span>
                        )}
                      </td>
                    );
                  })}
                </tr>

                {/* Localidad y Consultorio */}
                <tr>
                  <th scope="row" className="py-3.5 pr-4 text-xs font-semibold text-text-main align-top">
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                      Localidad y consultorio
                    </span>
                  </th>
                  {professionals.map((pro) => (
                    <td key={pro.id} className="py-3.5 px-4 align-top text-xs">
                      <div className="font-semibold text-text-main">{pro.location || '-'}</div>
                      <div className="text-text-muted mt-0.5">{pro.address || '-'}</div>
                    </td>
                  ))}
                </tr>

                {/* Accesibilidad Edilicia */}
                <tr>
                  <th scope="row" className="py-3.5 pr-4 text-xs font-semibold text-text-main align-top">
                    <span className="inline-flex items-center gap-1.5">
                      <Accessibility className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                      Accesibilidad edilicia
                    </span>
                  </th>
                  {professionals.map((pro) => (
                    <td key={pro.id} className="py-3.5 px-4 align-top">
                      {renderAccessibilityRow(pro)}
                    </td>
                  ))}
                </tr>

                {/* Disponibilidad */}
                <tr>
                  <th scope="row" className="py-3.5 pr-4 text-xs font-semibold text-text-main align-top">
                    <span className="inline-flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-primary-dark" aria-hidden="true" />
                      Próximo turno y duración
                    </span>
                  </th>
                  {professionals.map((pro) => (
                    <td key={pro.id} className="py-3.5 px-4 align-top">
                      {renderAvailabilityRow(pro)}
                    </td>
                  ))}
                </tr>

                {/* Acción */}
                <tr>
                  <th scope="row" className="py-4 pr-4 text-xs font-semibold text-text-main align-middle">
                    Acción
                  </th>
                  {professionals.map((pro) => (
                    <td key={pro.id} className="py-4 px-4 align-middle">
                      <button
                        type="button"
                        onClick={() => onSelectProfessional(pro.id)}
                        className="btn-primary text-xs py-2.5 px-4 gap-1.5"
                      >
                        Ver perfil y reservar
                        <ChevronRight className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer del Modal */}
        <div className="px-6 py-3 border-t border-borderSubtle bg-slate-50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary text-xs py-2 px-4"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
