import React, { useState } from 'react';
import { 
  Package, 
  Plus, 
  Edit3, 
  Trash2, 
  Sparkles, 
  DollarSign, 
  Calendar, 
  CreditCard, 
  ToggleLeft,
  ToggleRight
} from 'lucide-react';

const DEFAULT_PACKAGES = [
  {
    id: 'pkg-1',
    title: 'Plan Recuperación Traumatológica (4 Sesiones)',
    sessions: 4,
    discountPercent: 10,
    totalPrice: 90000,
    paymentConditions: 'Pago total anticipado mediante pasarela con 10% OFF incluido.',
    description: 'Evaluación postural, plan terapéutico inicial y 3 sesiones de rehabilitación manual.',
    isActive: true,
  },
  {
    id: 'pkg-2',
    title: 'Plan Integral de Columna (8 Sesiones)',
    sessions: 8,
    discountPercent: 16,
    totalPrice: 168000,
    paymentConditions: '50% al reservar el turno inicial y 50% al comenzar la sesión 5.',
    description: 'Tratamiento completo de columna vertebral, ejercicios miofasciales y pautas ergonómicas.',
    isActive: true,
  },
  {
    id: 'pkg-3',
    title: 'Plan Mantenimiento y Prevención (12 Sesiones)',
    sessions: 12,
    discountPercent: 20,
    totalPrice: 240000,
    paymentConditions: 'Abonable en 2 cuotas mensuales consecutivas.',
    description: 'Acompañamiento a mediano plazo para deportistas y pacientes con dolencias crónicas.',
    isActive: false,
  }
];

export default function PackagesManagementPage() {
  // Obtener honorario base de consulta individual fijado en HU4
  const proProfile = JSON.parse(localStorage.getItem('salud_directa_pro_profile') || '{}');
  const basePrice = Number(proProfile.consultationPrice || 25000);

  // Lista de paquetes persistida
  const [packages, setPackages] = useState(() => {
    try {
      const saved = localStorage.getItem('salud_directa_pro_packages');
      return saved ? JSON.parse(saved) : DEFAULT_PACKAGES;
    } catch {
      return DEFAULT_PACKAGES;
    }
  });

  // Estado para el modal de Crear / Editar
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPackageId, setEditingPackageId] = useState(null);

  // Formulario del paquete
  const [formTitle, setFormTitle] = useState('');
  const [formSessions, setFormSessions] = useState(4);
  const [formDiscount, setFormDiscount] = useState(10);
  const [formPaymentConditions, setFormPaymentConditions] = useState('Pago total anticipado con pasarela de pagos.');
  const [formDescription, setFormDescription] = useState('');
  const [formIsActive, setFormIsActive] = useState(true);
  const [formError, setFormError] = useState('');

  // Cálculos automáticos reactivos
  const rawTotal = basePrice * Number(formSessions);
  const calculatedTotal = Math.round(rawTotal * (1 - Number(formDiscount) / 100));
  const calculatedPerSession = Math.round(calculatedTotal / Number(formSessions));
  const calculatedSavings = rawTotal - calculatedTotal;

  const saveToStorage = (updatedList) => {
    setPackages(updatedList);
    localStorage.setItem('salud_directa_pro_packages', JSON.stringify(updatedList));
  };

  const handleOpenCreateModal = () => {
    setEditingPackageId(null);
    setFormTitle('');
    setFormSessions(4);
    setFormDiscount(10);
    setFormPaymentConditions('Pago total anticipado mediante pasarela.');
    setFormDescription('Tratamiento kinesiológico focalizado con seguimiento evolutivo.');
    setFormIsActive(true);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (pkg) => {
    setEditingPackageId(pkg.id);
    setFormTitle(pkg.title);
    setFormSessions(pkg.sessions);
    setFormDiscount(pkg.discountPercent);
    setFormPaymentConditions(pkg.paymentConditions);
    setFormDescription(pkg.description);
    setFormIsActive(pkg.isActive);
    setFormError('');
    setIsModalOpen(true);
  };

  const handleToggleActive = (id) => {
    const updated = packages.map((p) => (p.id === id ? { ...p, isActive: !p.isActive } : p));
    saveToStorage(updated);
  };

  const handleDeletePackage = (id) => {
    if (confirm('¿Estás seguro de que deseás eliminar este paquete de tratamiento?')) {
      const updated = packages.filter((p) => p.id !== id);
      saveToStorage(updated);
    }
  };

  const handleSavePackage = (e) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      setFormError('El título del paquete es obligatorio.');
      return;
    }
    if (formSessions < 2) {
      setFormError('Un paquete debe incluir como mínimo 2 sesiones.');
      return;
    }
    if (!formPaymentConditions.trim()) {
      setFormError('Las condiciones de pago son obligatorias (Criterio 1 - HU5).');
      return;
    }

    const nextId = editingPackageId || `pkg-${packages.length + 1}`;
    const packageData = {
      id: nextId,
      title: formTitle,
      sessions: Number(formSessions),
      discountPercent: Number(formDiscount),
      totalPrice: calculatedTotal,
      paymentConditions: formPaymentConditions,
      description: formDescription,
      isActive: formIsActive,
    };

    let updatedList;
    if (editingPackageId) {
      updatedList = packages.map((p) => (p.id === editingPackageId ? packageData : p));
    } else {
      updatedList = [packageData, ...packages];
    }

    saveToStorage(updatedList);
    setIsModalOpen(false);
  };

  const activeCount = packages.filter((p) => p.isActive).length;

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-16 animate-in fade-in duration-300">
      {/* Cabecera */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-borderSubtle">
        <div>
          <h1 className="text-2xl font-bold text-text-main flex items-center gap-2">
            <Package className="w-6 h-6 text-primary-dark" aria-hidden="true" />
            Paquetes de Tratamiento (HU5)
          </h1>
          <p className="text-sm text-text-muted">
            Configurá planes de sesiones múltiples con desglose transparente y descuentos por tratamiento prolongado.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="btn-primary py-2.5 px-4 text-xs font-semibold flex items-center gap-2 self-start sm:self-auto shadow-sm"
        >
          <Plus className="w-4 h-4" aria-hidden="true" />
          Crear Nuevo Paquete
        </button>
      </div>

      {/* Métricas / Resumen de Honorarios Base */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <div className="text-xs text-text-muted font-medium mb-1 flex items-center justify-between">
            <span>Honorario Individual Base</span>
            <DollarSign className="w-4 h-4 text-emerald-600" aria-hidden="true" />
          </div>
          <div className="text-2xl font-extrabold text-text-main">
            $ {basePrice.toLocaleString('es-AR')}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Definido en tu perfil (HU4)</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-text-muted font-medium mb-1 flex items-center justify-between">
            <span>Paquetes Activos</span>
            <Package className="w-4 h-4 text-primary-dark" aria-hidden="true" />
          </div>
          <div className="text-2xl font-extrabold text-primary-dark">
            {activeCount} de {packages.length}
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Visibles en tu ficha pública</div>
        </div>

        <div className="card p-4">
          <div className="text-xs text-text-muted font-medium mb-1 flex items-center justify-between">
            <span>Descuento Promedio</span>
            <Sparkles className="w-4 h-4 text-amber-500" aria-hidden="true" />
          </div>
          <div className="text-2xl font-extrabold text-text-main">
            {packages.length > 0 
              ? Math.round(packages.reduce((acc, p) => acc + p.discountPercent, 0) / packages.length) 
              : 0}% OFF
          </div>
          <div className="text-[11px] text-text-muted mt-0.5">Incentivo a la continuidad</div>
        </div>
      </div>

      {/* Lista de Paquetes Configurados */}
      <div className="space-y-4">
        <h2 className="text-base font-bold text-text-main flex items-center gap-2">
          <span>Tus Paquetes Publicados</span>
          <span className="text-xs font-normal text-text-muted">({packages.length})</span>
        </h2>

        {packages.length === 0 ? (
          <div className="card text-center py-12">
            <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" aria-hidden="true" />
            <h3 className="font-bold text-text-main text-sm">No tenés paquetes de tratamiento creados</h3>
            <p className="text-xs text-text-muted mb-4">
              Ofrecé previsibilidad a tus pacientes armando planes de 4, 8 o 12 sesiones con descuento.
            </p>
            <button onClick={handleOpenCreateModal} className="btn-primary max-w-xs mx-auto text-xs py-2">
              Crear Primer Paquete
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4" role="feed" aria-label="Lista de paquetes de tratamiento">
            {packages.map((pkg) => {
              const nominalPrice = basePrice * pkg.sessions;
              const savings = nominalPrice - pkg.totalPrice;
              const perSessionPrice = Math.round(pkg.totalPrice / pkg.sessions);

              return (
                <div 
                  key={pkg.id} 
                  className={`card p-5 transition-all flex flex-col justify-between border-2 ${
                    pkg.isActive ? 'border-primary-light hover:shadow-md' : 'border-slate-200 bg-slate-50/70 opacity-80'
                  }`}
                >
                  <div>
                    {/* Header de la tarjeta */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div>
                        <span className="bg-sky-100 text-primary-dark font-extrabold text-[10px] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                          <Calendar className="w-3 h-3" aria-hidden="true" />
                          {pkg.sessions} Sesiones
                        </span>
                        <h3 className="font-bold text-text-main text-base mt-1.5 leading-snug">{pkg.title}</h3>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <span className="bg-emerald-100 text-emerald-800 text-xs font-extrabold px-2 py-0.5 rounded-full inline-flex items-center gap-0.5">
                          <Sparkles className="w-3 h-3" aria-hidden="true" />
                          {pkg.discountPercent}% OFF
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-text-muted mb-4 leading-relaxed line-clamp-2">
                      {pkg.description || 'Sin descripción detallada.'}
                    </p>

                    {/* Desglose de Costos (Criterio 1 y 2 - HU5) */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-1.5 text-xs mb-4">
                      <div className="flex justify-between text-text-muted">
                        <span>Valor sin descuento ({pkg.sessions} x ${basePrice.toLocaleString('es-AR')}):</span>
                        <span className="line-through">$ {nominalPrice.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="flex justify-between items-baseline font-bold text-text-main">
                        <span>Total del paquete:</span>
                        <span className="text-xl font-extrabold text-primary-dark">$ {pkg.totalPrice.toLocaleString('es-AR')}</span>
                      </div>
                      <div className="flex justify-between text-[11px] text-emerald-700 font-semibold pt-1 border-t border-slate-200">
                        <span>Valor por sesión:</span>
                        <span>$ {perSessionPrice.toLocaleString('es-AR')} / sesión (Ahorro: ${savings.toLocaleString('es-AR')})</span>
                      </div>
                    </div>

                    {/* Condiciones de Pago */}
                    <div className="text-[11px] text-text-muted flex items-start gap-1.5 mb-4">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400 flex-shrink-0 mt-0.5" aria-hidden="true" />
                      <span><strong>Condición de pago:</strong> {pkg.paymentConditions}</span>
                    </div>
                  </div>

                  {/* Acciones del profesional */}
                  <div className="pt-3 border-t border-borderSubtle flex items-center justify-between text-xs">
                    <button
                      type="button"
                      onClick={() => handleToggleActive(pkg.id)}
                      className={`flex items-center gap-1.5 font-semibold transition-colors ${
                        pkg.isActive ? 'text-emerald-700 hover:text-emerald-800' : 'text-slate-500 hover:text-text-main'
                      }`}
                      aria-label={pkg.isActive ? 'Pausar paquete' : 'Activar paquete'}
                    >
                      {pkg.isActive ? (
                        <>
                          <ToggleRight className="w-5 h-5 text-emerald-600" aria-hidden="true" />
                          <span>Público</span>
                        </>
                      ) : (
                        <>
                          <ToggleLeft className="w-5 h-5 text-slate-400" aria-hidden="true" />
                          <span>Pausado</span>
                        </>
                      )}
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(pkg)}
                        className="text-text-muted hover:text-primary-dark font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Edit3 className="w-3.5 h-3.5" aria-hidden="true" /> Editar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePackage(pkg.id)}
                        className="text-text-muted hover:text-medical-error font-medium px-2 py-1 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" aria-hidden="true" /> Eliminar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Accesible para Crear o Editar Paquete */}
      {isModalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in"
          role="dialog"
          aria-modal="true"
          aria-labelledby="modal-package-title"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-borderSubtle mb-4">
              <h2 id="modal-package-title" className="text-lg font-bold text-text-main flex items-center gap-2">
                <Package className="w-5 h-5 text-primary-dark" aria-hidden="true" />
                {editingPackageId ? 'Editar Paquete de Tratamiento' : 'Nuevo Paquete de Tratamiento'}
              </h2>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-text-main text-lg font-bold p-1"
                aria-label="Cerrar modal"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="bg-red-50 border border-red-300 text-red-800 text-xs rounded-xl p-3 mb-4">
                {formError}
              </div>
            )}

            <form onSubmit={handleSavePackage} className="space-y-4 text-xs">
              <div>
                <label htmlFor="pkg-title" className="block font-bold text-text-main uppercase tracking-wider mb-1">
                  Nombre del Paquete *
                </label>
                <input
                  id="pkg-title"
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ej: Plan Integral de Rehabilitación (8 Sesiones)"
                  className="input-field text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="pkg-sessions" className="block font-bold text-text-main uppercase tracking-wider mb-1">
                    Cantidad de Sesiones *
                  </label>
                  <input
                    id="pkg-sessions"
                    type="number"
                    min="2"
                    max="30"
                    required
                    value={formSessions}
                    onChange={(e) => setFormSessions(Math.max(2, Number(e.target.value)))}
                    className="input-field text-xs font-semibold"
                  />
                </div>

                <div>
                  <label htmlFor="pkg-discount" className="block font-bold text-text-main uppercase tracking-wider mb-1">
                    Descuento Aplicado (%) *
                  </label>
                  <input
                    id="pkg-discount"
                    type="number"
                    min="0"
                    max="50"
                    required
                    value={formDiscount}
                    onChange={(e) => setFormDiscount(Math.max(0, Math.min(50, Number(e.target.value))))}
                    className="input-field text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Simulación en vivo del precio y desglose */}
              <div className="bg-sky-50 border border-sky-200 rounded-xl p-3 space-y-1.5 text-xs text-text-main">
                <div className="flex justify-between text-text-muted">
                  <span>Precio regular ({formSessions} x ${basePrice.toLocaleString('es-AR')}):</span>
                  <span>$ {rawTotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between font-bold text-primary-dark text-sm pt-1 border-t border-sky-200">
                  <span>Total final con {formDiscount}% OFF:</span>
                  <span>$ {calculatedTotal.toLocaleString('es-AR')}</span>
                </div>
                <div className="flex justify-between text-[11px] text-emerald-800 font-semibold">
                  <span>Costo por sesión:</span>
                  <span>$ {calculatedPerSession.toLocaleString('es-AR')} (Ahorro paciente: ${calculatedSavings.toLocaleString('es-AR')})</span>
                </div>
              </div>

              <div>
                <label htmlFor="pkg-conditions" className="block font-bold text-text-main uppercase tracking-wider mb-1">
                  Condiciones de Pago (Obligatorio - HU5) *
                </label>
                <input
                  id="pkg-conditions"
                  type="text"
                  required
                  value={formPaymentConditions}
                  onChange={(e) => setFormPaymentConditions(e.target.value)}
                  placeholder="Ej: Pago total anticipado o 50% al iniciar y 50% en sesión 4"
                  className="input-field text-xs"
                />
              </div>

              <div>
                <label htmlFor="pkg-desc" className="block font-bold text-text-main uppercase tracking-wider mb-1">
                  Detalle / Qué incluye el tratamiento
                </label>
                <textarea
                  id="pkg-desc"
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Explicá brevemente a qué patologías o metas está dirigido..."
                  className="input-field text-xs resize-none"
                />
              </div>

              <div className="pt-2">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={formIsActive}
                    onChange={(e) => setFormIsActive(e.target.checked)}
                    className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
                  />
                  <span className="font-semibold text-text-main">Publicar inmediatamente este paquete en mi perfil público</span>
                </label>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-borderSubtle">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="btn-secondary py-2 px-4 text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="bg-primary-dark text-white font-semibold py-2 px-5 rounded-lg text-xs hover:bg-sky-800 transition-colors shadow-sm"
                >
                  {editingPackageId ? 'Guardar Cambios' : 'Crear Paquete'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
