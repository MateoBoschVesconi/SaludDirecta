import React, { useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { ChevronLeft, MapPin, SlidersHorizontal } from 'lucide-react';
import { PROFESSIONALS } from '../../data/mockData';
import ProfessionalCard from '../../components/ProfessionalCard';

export default function SearchResultsPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const query = searchParams.get('q') || '';
  const category = searchParams.get('categoria') || '';

  const [filterAccessibility, setFilterAccessibility] = useState(false);
  const [maxPrice] = useState(50000);

  const filteredProfessionals = useMemo(() => {
    return PROFESSIONALS.filter((pro) => {
      const matchText = query === '' || 
        pro.name.toLowerCase().includes(query.toLowerCase()) ||
        pro.specialty.toLowerCase().includes(query.toLowerCase()) ||
        pro.description.toLowerCase().includes(query.toLowerCase());

      const matchCategory = category === '' ||
        pro.profession.toLowerCase().includes(category.toLowerCase()) ||
        pro.specialty.toLowerCase().includes(category.toLowerCase());

      const matchAccessibility = !filterAccessibility || pro.hasRampAccessibility;
      const matchPrice = pro.price <= maxPrice;

      return matchText && matchCategory && matchAccessibility && matchPrice;
    });
  }, [query, category, filterAccessibility, maxPrice]);

  return (
    <div className="max-w-4xl mx-auto mt-6 px-4 animate-in fade-in duration-300">
      <button
        onClick={() => navigate('/')}
        className="text-text-muted hover:text-text-main flex items-center text-sm font-semibold mb-4 transition-colors p-1 rounded focus-visible:ring-2 focus-visible:ring-primary-dark"
      >
        <ChevronLeft className="w-4 h-4 mr-1" aria-hidden="true" /> Volver al buscador
      </button>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-text-main">
            {filteredProfessionals.length} {filteredProfessionals.length === 1 ? 'profesional disponible' : 'profesionales disponibles'}
          </h1>
          <p className="text-text-muted flex items-center text-sm mt-1">
            <MapPin className="w-4 h-4 mr-1 text-slate-500" aria-hidden="true" /> Resistencia, Chaco
            {category && <span className="ml-2 font-medium text-primary-dark">· Especialidad: {category}</span>}
          </p>
        </div>

        {/* Panel rápido de filtros */}
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 bg-white border border-borderSubtle px-3 py-2 rounded-lg text-xs font-medium cursor-pointer hover:border-slate-400 select-none">
            <input
              type="checkbox"
              checked={filterAccessibility}
              onChange={(e) => setFilterAccessibility(e.target.checked)}
              className="rounded text-primary-dark focus:ring-primary-dark"
            />
            Accesibilidad edilicia (Rampa/Ascensor)
          </label>
        </div>
      </div>

      {filteredProfessionals.length === 0 ? (
        <div className="card text-center py-12">
          <SlidersHorizontal className="w-10 h-10 text-slate-400 mx-auto mb-3" aria-hidden="true" />
          <h2 className="text-lg font-bold text-text-main mb-1">No se encontraron profesionales</h2>
          <p className="text-sm text-text-muted mb-4">Intentá ampliar tu búsqueda o quitar los filtros aplicados.</p>
          <button
            onClick={() => {
              setFilterAccessibility(false);
              navigate('/resultados');
            }}
            className="text-primary-dark font-semibold text-sm hover:underline"
          >
            Limpiar filtros
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4" role="feed" aria-label="Lista de profesionales">
          {filteredProfessionals.map((pro) => (
            <ProfessionalCard
              key={pro.id}
              name={pro.name}
              specialty={pro.specialty}
              registry={pro.registry}
              price={pro.price}
              onClick={() => navigate(`/profesional/${pro.id}`)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
