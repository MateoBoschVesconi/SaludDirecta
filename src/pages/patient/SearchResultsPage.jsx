import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  ChevronLeft,
  Search,
  SlidersHorizontal,
  X,
  RotateCcw,
  Zap,
  Scale,
  ArrowUpDown,
  Sparkles,
} from 'lucide-react';
import { profesionalService } from '../../api/profesionalService';
import ProfessionalCard from '../../components/ProfessionalCard';
import ProfessionalCompareModal from '../../components/patient/ProfessionalCompareModal';
import {
  filterAndSortProfessionals,
  extractSearchFacets,
  normalizeText,
} from '../../utils/professionalSearch';

const WEEKDAYS = [
  { code: 'Lun', label: 'Lunes' },
  { code: 'Mar', label: 'Martes' },
  { code: 'Mié', label: 'Miércoles' },
  { code: 'Jue', label: 'Jueves' },
  { code: 'Vie', label: 'Viernes' },
  { code: 'Sáb', label: 'Sábado' },
];

const AVAILABILITY_LABELS = {
  manana: 'Turno Mañana',
  tarde: 'Turno Tarde',
  sabado: 'Atiende Sábados',
};

function parseFiltersFromSearchParams(params) {
  return {
    query: params.get('q') || '',
    profession: params.get('profesion') || params.get('categoria') || '',
    specialty: params.get('especialidad') || '',
    location: params.get('localidad') || '',
    minPrice: params.get('precioMin') || '',
    maxPrice: params.get('precioMax') || '',
    availability: params.get('disponibilidad') || 'cualquiera',
    dayOfWeek: params.get('dia') || '',
    ramp: params.get('rampa') === 'true',
    elevator: params.get('ascensor') === 'true',
    adaptedBathroom: params.get('bano') === 'true',
    onlyVerified: params.get('verificados') === 'true',
    onlyWithPackages: params.get('paquetes') === 'true',
    sortBy: params.get('orden') || 'relevance',
  };
}

function serializeFiltersToSearchParams(filters) {
  const next = new URLSearchParams();
  if (filters.query?.trim()) next.set('q', filters.query);
  if (filters.profession) next.set('profesion', filters.profession);
  if (filters.specialty) next.set('especialidad', filters.specialty);
  if (filters.location) next.set('localidad', filters.location);
  if (filters.minPrice) next.set('precioMin', String(filters.minPrice));
  if (filters.maxPrice) next.set('precioMax', String(filters.maxPrice));
  if (filters.availability && filters.availability !== 'cualquiera') {
    next.set('disponibilidad', filters.availability);
  }
  if (filters.dayOfWeek) next.set('dia', filters.dayOfWeek);
  if (filters.ramp) next.set('rampa', 'true');
  if (filters.elevator) next.set('ascensor', 'true');
  if (filters.adaptedBathroom) next.set('bano', 'true');
  if (filters.onlyVerified) next.set('verificados', 'true');
  if (filters.onlyWithPackages) next.set('paquetes', 'true');
  if (filters.sortBy && filters.sortBy !== 'relevance') next.set('orden', filters.sortBy);
  return next;
}

export default function SearchResultsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  const [professionalsList, setProfessionalsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialLoadMs, setInitialLoadMs] = useState(12);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Comparador (hasta 3 profesionales lado a lado)
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const startedAt = performance.now();

    profesionalService.getProfessionals().then((list) => {
      if (isMounted) {
        const elapsed = Math.max(1, Math.round(performance.now() - startedAt));
        setProfessionalsList(list);
        setInitialLoadMs(elapsed);
        setLoading(false);
      }
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filters = useMemo(
    () => parseFiltersFromSearchParams(searchParams),
    [searchParams]
  );

  const updateFilters = useCallback(
    (patch) => {
      const merged = { ...filters, ...patch };
      setSearchParams(serializeFiltersToSearchParams(merged), { replace: true });
    },
    [filters, setSearchParams]
  );

  const resetFilters = useCallback(() => {
    setSearchParams(new URLSearchParams(), { replace: true });
  }, [setSearchParams]);

  const facets = useMemo(
    () => extractSearchFacets(professionalsList),
    [professionalsList]
  );

  // Especialidades dinámicas filtradas por la profesión seleccionada
  const availableSpecialties = useMemo(() => {
    if (!filters.profession) return facets.specialties;
    const normProf = normalizeText(filters.profession);
    const matching = new Set();
    for (const pro of professionalsList) {
      if (pro?.isPublished === false) continue;
      if (normalizeText(pro.profession).includes(normProf) && pro.specialty) {
        matching.add(pro.specialty);
      }
    }
    const list = [...matching].sort((a, b) => a.localeCompare(b, 'es'));
    return list.length > 0 ? list : facets.specialties;
  }, [professionalsList, facets.specialties, filters.profession]);

  const sliderMinPrice = facets.priceBounds.min;
  const sliderMaxPrice = Math.max(50000, facets.priceBounds.max);

  const filteredProfessionals = useMemo(
    () => filterAndSortProfessionals(professionalsList, filters),
    [professionalsList, filters]
  );

  // Chips de filtros activos
  const activeFilterChips = useMemo(() => {
    const chips = [];
    if (filters.query.trim()) {
      chips.push({ key: 'query', label: `Búsqueda: "${filters.query.trim()}"`, reset: { query: '' } });
    }
    if (filters.profession) {
      chips.push({
        key: 'profession',
        label: `Profesión: ${filters.profession}`,
        reset: { profession: '', specialty: '' },
      });
    }
    if (filters.specialty) {
      chips.push({ key: 'specialty', label: `Especialidad: ${filters.specialty}`, reset: { specialty: '' } });
    }
    if (filters.location) {
      chips.push({ key: 'location', label: `Localidad: ${filters.location}`, reset: { location: '' } });
    }
    if (filters.minPrice) {
      chips.push({
        key: 'minPrice',
        label: `Desde $${Number(filters.minPrice).toLocaleString('es-AR')}`,
        reset: { minPrice: '' },
      });
    }
    if (filters.maxPrice) {
      chips.push({
        key: 'maxPrice',
        label: `Hasta $${Number(filters.maxPrice).toLocaleString('es-AR')}`,
        reset: { maxPrice: '' },
      });
    }
    if (filters.availability !== 'cualquiera') {
      chips.push({
        key: 'availability',
        label: AVAILABILITY_LABELS[filters.availability] || filters.availability,
        reset: { availability: 'cualquiera' },
      });
    }
    if (filters.dayOfWeek) {
      chips.push({ key: 'dayOfWeek', label: `Día: ${filters.dayOfWeek}`, reset: { dayOfWeek: '' } });
    }
    if (filters.ramp) chips.push({ key: 'ramp', label: 'Rampa de acceso', reset: { ramp: false } });
    if (filters.elevator) chips.push({ key: 'elevator', label: 'Ascensor', reset: { elevator: false } });
    if (filters.adaptedBathroom) {
      chips.push({ key: 'adaptedBathroom', label: 'Baño adaptado', reset: { adaptedBathroom: false } });
    }
    if (filters.onlyVerified) {
      chips.push({ key: 'onlyVerified', label: 'Solo matrículas verificadas', reset: { onlyVerified: false } });
    }
    if (filters.onlyWithPackages) {
      chips.push({ key: 'onlyWithPackages', label: 'Con paquetes de sesiones', reset: { onlyWithPackages: false } });
    }
    return chips;
  }, [filters]);

  const activeFilterCount = activeFilterChips.length;

  const selectedComparePros = useMemo(
    () =>
      professionalsList.filter((pro) =>
        selectedCompareIds.some((id) => String(id) === String(pro.id))
      ),
    [professionalsList, selectedCompareIds]
  );

  const handleToggleCompare = useCallback((pro) => {
    const targetId = String(pro.id);
    setSelectedCompareIds((prev) => {
      if (prev.includes(targetId)) {
        return prev.filter((id) => id !== targetId);
      }
      if (prev.length >= 3) {
        return prev;
      }
      return [...prev, targetId];
    });
  }, []);

  const handleRemoveFromCompare = useCallback((proId) => {
    const targetId = String(proId);
    setSelectedCompareIds((prev) => {
      const next = prev.filter((id) => id !== targetId);
      if (next.length < 2) {
        setIsCompareOpen(false);
      }
      return next;
    });
  }, []);

  return (
    <div className="max-w-6xl mx-auto mt-6 px-4 pb-24 animate-in fade-in duration-300">
      <button
        type="button"
        onClick={() => navigate('/')}
        className="text-text-muted hover:text-text-main flex items-center text-sm font-semibold mb-4 transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-primary-dark"
      >
        <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Volver al inicio
      </button>

      {/* Cabecera, Buscador Rápido y Ordenamiento */}
      <div className="card p-4 mb-5 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center gap-3">
          {/* Input de búsqueda de texto */}
          <div className="relative flex-1">
            <label htmlFor="results-search-query" className="sr-only">
              Buscar por nombre, especialidad, localidad o prestación
            </label>
            <Search className="w-4 h-4 text-text-muted absolute left-3.5 top-3.5" aria-hidden="true" />
            <input
              id="results-search-query"
              type="search"
              value={filters.query}
              onChange={(e) => updateFilters({ query: e.target.value })}
              placeholder="Buscar por profesional, especialidad, localidad..."
              className="input-field pl-10 py-2.5"
            />
          </div>

          {/* Ordenamiento */}
          <div className="flex items-center gap-2">
            <label htmlFor="results-sort-by" className="text-xs font-semibold text-text-muted flex items-center gap-1 whitespace-nowrap">
              <ArrowUpDown className="w-3.5 h-3.5" aria-hidden="true" />
              Ordenar:
            </label>
            <select
              id="results-sort-by"
              value={filters.sortBy}
              onChange={(e) => updateFilters({ sortBy: e.target.value })}
              className="input-field py-2.5 px-3 text-xs font-medium min-w-[175px]"
            >
              <option value="relevance">Relevancia y verificados</option>
              <option value="price_asc">Menor honorario primero</option>
              <option value="price_desc">Mayor honorario primero</option>
              <option value="rating_desc">Mejor calificación</option>
            </select>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen((prev) => !prev)}
              aria-expanded={mobileFiltersOpen}
              aria-controls="combinable-filters-panel"
              className="lg:hidden btn-secondary py-2.5 px-3.5 text-xs gap-1.5 whitespace-nowrap"
            >
              <SlidersHorizontal className="w-4 h-4 text-primary-dark" aria-hidden="true" />
              Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
            </button>
          </div>
        </div>

        {/* Estado de resultados + SLA RNF-05 */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-borderSubtle"
          role="status"
          aria-live="polite"
        >
          <h1 className="text-lg font-bold text-text-main">
            {loading
              ? 'Buscando profesionales...'
              : `${filteredProfessionals.length} ${
                  filteredProfessionals.length === 1
                    ? 'profesional disponible'
                    : 'profesionales disponibles'
                }`}
            {!loading && professionalsList.length > 0 && (
              <span className="text-xs font-normal text-text-muted ml-2">
                (de {professionalsList.length} publicados)
              </span>
            )}
          </h1>

          {!loading && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full">
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              Respuesta en {initialLoadMs} ms (SLA &lt; 2s)
            </span>
          )}
        </div>

        {/* Chips de Filtros Activos */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-text-muted">
              Filtros activos:
            </span>
            {activeFilterChips.map((chip) => (
              <button
                key={chip.key}
                type="button"
                onClick={() => updateFilters(chip.reset)}
                className="inline-flex items-center gap-1.5 bg-sky-50 hover:bg-sky-100 text-primary-dark border border-sky-200 px-2.5 py-1 rounded-full text-xs font-medium transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark"
                aria-label={`Quitar filtro ${chip.label}`}
              >
                <span>{chip.label}</span>
                <X className="w-3.5 h-3.5" aria-hidden="true" />
              </button>
            ))}
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs font-semibold text-medical-error hover:underline ml-1 inline-flex items-center gap-1 p-1 rounded"
            >
              <RotateCcw className="w-3 h-3" aria-hidden="true" />
              Limpiar todos
            </button>
          </div>
        )}
      </div>

      {/* Grilla Principal: Filtros Combinables (izq) + Resultados (der) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Lateral de Filtros Combinables */}
        <aside
          id="combinable-filters-panel"
          aria-label="Filtros combinables"
          className={`lg:col-span-4 card space-y-5 ${
            mobileFiltersOpen ? 'block' : 'hidden lg:block'
          }`}
        >
          <div className="flex items-center justify-between pb-3 border-b border-borderSubtle">
            <h2 className="text-sm font-bold text-text-main flex items-center gap-2">
              <SlidersHorizontal className="w-4 h-4 text-primary-dark" aria-hidden="true" />
              Filtros combinables
            </h2>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={resetFilters}
                className="text-xs font-semibold text-primary-dark hover:underline focus-visible:ring-2 focus-visible:ring-primary-dark rounded px-1"
              >
                Restablecer
              </button>
            )}
          </div>

          {/* Profesión */}
          <div>
            <label htmlFor="filter-profession" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1.5">
              Profesión
            </label>
            <select
              id="filter-profession"
              value={filters.profession}
              onChange={(e) => updateFilters({ profession: e.target.value, specialty: '' })}
              className="input-field py-2.5 text-xs"
            >
              <option value="">Todas las profesiones</option>
              {facets.professions.map((prof) => (
                <option key={prof} value={prof}>
                  {prof}
                </option>
              ))}
            </select>
          </div>

          {/* Especialidad */}
          <div>
            <label htmlFor="filter-specialty" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1.5">
              Especialidad
            </label>
            <select
              id="filter-specialty"
              value={filters.specialty}
              onChange={(e) => updateFilters({ specialty: e.target.value })}
              className="input-field py-2.5 text-xs"
            >
              <option value="">Todas las especialidades</option>
              {availableSpecialties.map((spec) => (
                <option key={spec} value={spec}>
                  {spec}
                </option>
              ))}
            </select>
          </div>

          {/* Localidad */}
          <div>
            <label htmlFor="filter-location" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1.5">
              Localidad / Ciudad
            </label>
            <select
              id="filter-location"
              value={filters.location}
              onChange={(e) => updateFilters({ location: e.target.value })}
              className="input-field py-2.5 text-xs"
            >
              <option value="">Todas las localidades</option>
              {facets.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Rango de Honorarios ($ ARS) */}
          <div className="space-y-2.5 pt-2 border-t border-borderSubtle">
            <span className="block text-xs font-bold text-text-main uppercase tracking-wider">
              Honorarios de consulta ($ ARS)
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label htmlFor="filter-min-price" className="block text-[11px] font-medium text-text-muted mb-1">
                  Mínimo
                </label>
                <input
                  id="filter-min-price"
                  type="number"
                  min={0}
                  step={1000}
                  value={filters.minPrice}
                  onChange={(e) => updateFilters({ minPrice: e.target.value })}
                  placeholder={`$${sliderMinPrice.toLocaleString('es-AR')}`}
                  className="input-field py-2 px-3 text-xs"
                />
              </div>
              <div>
                <label htmlFor="filter-max-price" className="block text-[11px] font-medium text-text-muted mb-1">
                  Máximo
                </label>
                <input
                  id="filter-max-price"
                  type="number"
                  min={0}
                  step={1000}
                  value={filters.maxPrice}
                  onChange={(e) => updateFilters({ maxPrice: e.target.value })}
                  placeholder={`$${sliderMaxPrice.toLocaleString('es-AR')}`}
                  className="input-field py-2 px-3 text-xs"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-text-muted mb-1">
                <label htmlFor="filter-max-price-range">Tope rápido:</label>
                <span className="font-semibold text-text-main">
                  {filters.maxPrice
                    ? `Hasta $ ${Number(filters.maxPrice).toLocaleString('es-AR')}`
                    : 'Sin tope'}
                </span>
              </div>
              <input
                id="filter-max-price-range"
                type="range"
                min={sliderMinPrice}
                max={sliderMaxPrice}
                step={1000}
                value={filters.maxPrice ? Number(filters.maxPrice) : sliderMaxPrice}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  updateFilters({ maxPrice: val >= sliderMaxPrice ? '' : String(val) });
                }}
                className="w-full accent-primary-dark cursor-pointer"
              />
            </div>
          </div>

          {/* Disponibilidad */}
          <div className="space-y-3 pt-2 border-t border-borderSubtle">
            <div>
              <label htmlFor="filter-availability" className="block text-xs font-bold text-text-main uppercase tracking-wider mb-1.5">
                Disponibilidad horaria
              </label>
              <select
                id="filter-availability"
                value={filters.availability}
                onChange={(e) => updateFilters({ availability: e.target.value })}
                className="input-field py-2.5 text-xs"
              >
                <option value="cualquiera">Cualquier horario</option>
                <option value="manana">Turno Mañana (08 a 13 hs)</option>
                <option value="tarde">Turno Tarde (13 a 20 hs)</option>
                <option value="sabado">Atiende Sábados</option>
              </select>
            </div>

            <div>
              <span className="block text-[11px] font-semibold text-text-muted mb-1.5">
                Día específico de atención:
              </span>
              <div className="grid grid-cols-6 gap-1.5" role="group" aria-label="Filtrar por día de atención">
                {WEEKDAYS.map((day) => {
                  const active = filters.dayOfWeek === day.code;
                  return (
                    <button
                      key={day.code}
                      type="button"
                      aria-pressed={active}
                      aria-label={day.label}
                      onClick={() =>
                        updateFilters({ dayOfWeek: active ? '' : day.code })
                      }
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark ${
                        active
                          ? 'bg-primary-dark text-white border-primary-dark'
                          : 'bg-white text-text-main border-borderSubtle hover:bg-slate-50'
                      }`}
                    >
                      {day.code}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Accesibilidad del consultorio */}
          <fieldset className="space-y-2 pt-2 border-t border-borderSubtle">
            <legend className="text-xs font-bold text-text-main uppercase tracking-wider mb-1">
              Accesibilidad edilicia
            </legend>
            <label className="flex items-center gap-2.5 text-xs text-text-main cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={filters.ramp}
                onChange={(e) => updateFilters({ ramp: e.target.checked })}
                className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
              />
              Rampa de acceso
            </label>
            <label className="flex items-center gap-2.5 text-xs text-text-main cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={filters.elevator}
                onChange={(e) => updateFilters({ elevator: e.target.checked })}
                className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
              />
              Ascensor habilitado
            </label>
            <label className="flex items-center gap-2.5 text-xs text-text-main cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={filters.adaptedBathroom}
                onChange={(e) => updateFilters({ adaptedBathroom: e.target.checked })}
                className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
              />
              Baño adaptado
            </label>
          </fieldset>

          {/* Confianza y Planes */}
          <fieldset className="space-y-2 pt-2 border-t border-borderSubtle">
            <legend className="text-xs font-bold text-text-main uppercase tracking-wider mb-1">
              Validación y planes
            </legend>
            <label className="flex items-center gap-2.5 text-xs text-text-main cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={filters.onlyVerified}
                onChange={(e) => updateFilters({ onlyVerified: e.target.checked })}
                className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
              />
              Solo matrículas verificadas SISA / REFEPS
            </label>
            <label className="flex items-center gap-2.5 text-xs text-text-main cursor-pointer py-0.5">
              <input
                type="checkbox"
                checked={filters.onlyWithPackages}
                onChange={(e) => updateFilters({ onlyWithPackages: e.target.checked })}
                className="rounded text-primary-dark focus:ring-primary-dark w-4 h-4"
              />
              Ofrece paquetes de tratamiento
            </label>
          </fieldset>
        </aside>

        {/* Listado de Resultados */}
        <section className="lg:col-span-8 space-y-4" aria-label="Resultados de búsqueda">
          {loading ? (
            <div className="card text-center py-12">
              <div
                className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-dark mx-auto mb-3"
                aria-hidden="true"
              ></div>
              <p className="text-sm text-text-muted">Buscando profesionales disponibles...</p>
            </div>
          ) : filteredProfessionals.length === 0 ? (
            <div className="card text-center py-12 space-y-3">
              <SlidersHorizontal className="w-10 h-10 text-slate-400 mx-auto" aria-hidden="true" />
              <h2 className="text-lg font-bold text-text-main">
                No se encontraron profesionales con esa combinación
              </h2>
              <p className="text-sm text-text-muted max-w-md mx-auto">
                Probá ampliar el tope de honorarios, quitar algún requisito de accesibilidad o limpiar todos los filtros aplicados.
              </p>
              <button
                type="button"
                onClick={resetFilters}
                className="btn-primary w-auto text-xs py-2.5 px-5 mx-auto gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                Limpiar filtros
              </button>
              <div className="pt-2">
                <Link
                  to="/#orientacion-ia"
                  className="text-primary-dark font-semibold text-xs hover:underline inline-flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary-dark rounded px-2 py-1"
                >
                  <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
                  ¿No sabés qué especialidad consultar? Probá la Orientación Asistida por IA
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-4" role="feed" aria-label="Lista de profesionales">
              {filteredProfessionals.map((pro) => {
                const isSelected = selectedCompareIds.includes(String(pro.id));
                return (
                  <ProfessionalCard
                    key={pro.id}
                    professional={pro}
                    onClick={() => navigate(`/profesional/${pro.id}`)}
                    isSelectedForCompare={isSelected}
                    onToggleCompare={handleToggleCompare}
                    compareDisabled={selectedCompareIds.length >= 3}
                  />
                );
              })}
            </div>
          )}
        </section>
      </div>

      {/* Barra Flotante Inferior de Comparación */}
      {selectedComparePros.length > 0 && (
        <div
          className="fixed bottom-4 left-4 right-4 z-30 max-w-4xl mx-auto bg-white border-2 border-primary-dark rounded-2xl p-3.5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-in slide-in-from-bottom-3"
          role="region"
          aria-label="Selección para comparar profesionales"
        >
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-primary-dark flex items-center gap-1.5">
              <Scale className="w-4 h-4" aria-hidden="true" />
              Comparar ({selectedComparePros.length}/3):
            </span>
            {selectedComparePros.map((pro) => (
              <span
                key={pro.id}
                className="inline-flex items-center gap-1.5 bg-sky-50 text-text-main border border-sky-200 px-2.5 py-1 rounded-full text-xs font-medium"
              >
                {pro.name}
                <button
                  type="button"
                  onClick={() => handleRemoveFromCompare(pro.id)}
                  className="text-text-muted hover:text-medical-error rounded-full"
                  aria-label={`Quitar a ${pro.name} de la comparativa`}
                >
                  <X className="w-3.5 h-3.5" aria-hidden="true" />
                </button>
              </span>
            ))}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setSelectedCompareIds([])}
              className="btn-secondary text-xs py-2 px-3"
            >
              Limpiar
            </button>
            <button
              type="button"
              disabled={selectedComparePros.length < 2}
              onClick={() => setIsCompareOpen(true)}
              className={`text-xs font-semibold py-2 px-4 rounded-lg inline-flex items-center gap-1.5 transition-colors focus-visible:ring-2 focus-visible:ring-primary-dark ${
                selectedComparePros.length < 2
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                  : 'bg-primary-dark text-white hover:bg-sky-800 shadow-sm'
              }`}
            >
              Comparar seleccionados ({selectedComparePros.length})
            </button>
          </div>
        </div>
      )}

      {/* Modal de Comparativa Lado a Lado */}
      <ProfessionalCompareModal
        professionals={selectedComparePros}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onRemove={handleRemoveFromCompare}
        onSelectProfessional={(proId) => {
          setIsCompareOpen(false);
          navigate(`/profesional/${proId}`);
        }}
      />
    </div>
  );
}
