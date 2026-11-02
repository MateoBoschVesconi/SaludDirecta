import React from 'react';
import { ShieldCheck, AlertCircle } from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 mt-20 border-t border-slate-800" role="contentinfo">
      <div className="max-w-6xl mx-auto px-4 py-10">
        {/* Banner de Advertencia Médica Obligatoria (HU7 / Requisito Legal) */}
        <div className="bg-slate-800/80 border border-amber-500/30 rounded-xl p-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center gap-3 text-amber-200 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-amber-400" aria-hidden="true" />
          <p className="leading-relaxed">
            <strong className="text-amber-300">Aviso importante:</strong> Salud Directa es una plataforma tecnológica de vinculación particular y gestión de turnos. No presta servicios de urgencias médicas ni emite diagnósticos. En caso de emergencia, comuníquese inmediatamente al <strong>107</strong> (SAME) o concurra a la guardia más cercana.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pb-8 border-b border-slate-800 text-sm">
          <div>
            <h2 className="text-white font-bold text-base mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" aria-hidden="true" />
              Salud Directa
            </h2>
            <p className="text-slate-400 text-xs leading-relaxed">
              Plataforma de vinculación transparente entre pacientes sin cobertura y profesionales particulares con matrículas verificadas ante organismos oficiales (SISA / REFEPS).
            </p>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Marco Legal y Privacidad</h3>
            <ul className="space-y-2 text-xs text-slate-400">
              <li>Cumplimiento estricto de la <strong>Ley 25.326</strong> de Protección de Datos Personales.</li>
              <li>No se almacena historia clínica ni diagnósticos médicos sensibles en la plataforma.</li>
              <li>Honorarios profesionales de consulta 100% transparentes y obligatorios.</li>
            </ul>
          </div>

          <div>
            <h3 className="text-white font-semibold text-sm mb-3">Accesibilidad y Estándares</h3>
            <p className="text-slate-400 text-xs leading-relaxed">
              Diseñado bajo directrices de accesibilidad web <strong>WCAG 2.1 Nivel AA</strong> (RNF-07) para garantizar el acceso universal y la navegación por teclado.
            </p>
          </div>
        </div>

        <div className="pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <p>© {CURRENT_YEAR} Salud Directa — Proyecto TFI UTN-FRRe.</p>
          <p>Desarrollado con React & Tailwind CSS.</p>
        </div>
      </div>
    </footer>
  );
}
