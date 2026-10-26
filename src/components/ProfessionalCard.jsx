import React from 'react';
import { CheckCircle2, ChevronRight } from 'lucide-react';

export default function ProfessionalCard({ name, specialty, registry, price, onClick }) {
  // Create initials for avatar
  const initials = name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
  
  return (
    <div 
      className="card hover:shadow-md transition-shadow cursor-pointer flex items-center justify-between group"
      onClick={onClick}
    >
      <div className="flex gap-4 items-center">
        <div className="w-14 h-14 rounded-full bg-primary text-white flex items-center justify-center font-bold text-lg shadow-sm">
          {initials}
        </div>
        <div>
          <h3 className="font-bold text-text-main text-lg">{name}</h3>
          <p className="text-sm text-gray-500 mb-1">{specialty}</p>
          <div className="badge-success inline-flex">
            <CheckCircle2 className="w-3.5 h-3.5" />
            SISA {registry}
          </div>
        </div>
      </div>
      
      <div className="text-right flex flex-col items-end">
        <div className="font-bold text-xl text-text-main mb-1">
          $ {price.toLocaleString('es-AR')}
        </div>
        <div className="text-primary text-sm font-medium flex items-center group-hover:underline">
          Ver Turno <ChevronRight className="w-4 h-4 ml-0.5" />
        </div>
      </div>
    </div>
  );
}
