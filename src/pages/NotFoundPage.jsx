import React from 'react';
import { Link } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export default function NotFoundPage() {
  return (
    <div className="max-w-md mx-auto mt-16 px-4 text-center">
      <div className="p-4 bg-sky-50 text-primary-dark rounded-full w-16 h-16 mx-auto flex items-center justify-center mb-4">
        <HelpCircle className="w-8 h-8" aria-hidden="true" />
      </div>
      <h1 className="text-3xl font-extrabold text-text-main mb-2">404</h1>
      <h2 className="text-lg font-bold text-text-main mb-2">Página no encontrada</h2>
      <p className="text-sm text-text-muted mb-6">
        La dirección solicitada no existe o fue movida a otra ubicación.
      </p>
      <Link to="/" className="btn-primary max-w-xs mx-auto flex items-center justify-center gap-2">
        <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Volver al Inicio
      </Link>
    </div>
  );
}

