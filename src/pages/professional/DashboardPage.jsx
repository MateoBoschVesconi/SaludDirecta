import React from 'react';
import { Calendar, Users, DollarSign, UserX, Download, CheckCircle, Clock } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

export default function DashboardPage() {
  const { user } = useAuth();

  const metrics = [
    { title: 'Ocupación de Agenda', value: '84%', change: '+6% este mes', icon: Users, color: 'text-primary-dark', bg: 'bg-sky-50' },
    { title: 'Tasa de Ausentismo', value: '4.2%', change: '-1.8% vs promedio', icon: UserX, color: 'text-emerald-700', bg: 'bg-emerald-50' },
    { title: 'Ingresos del Período', value: '$ 420.000', change: '18 consultas cobradas', icon: DollarSign, color: 'text-blue-700', bg: 'bg-blue-50' },
    { title: 'Turnos Hoy', value: '6 programados', change: 'Próximo: 10:30 hs', icon: Calendar, color: 'text-purple-700', bg: 'bg-purple-50' },
  ];

  const todayAppointments = [
    { id: '1', patient: 'Gonzalo Silva', time: '09:00 hs', type: 'Consulta Particular', status: 'cumplido', amount: 25000 },
    { id: '2', patient: 'Mariana Duarte', time: '10:30 hs', type: 'Plan Integral (Sesión 3/8)', status: 'confirmado', amount: 21000 },
    { id: '3', patient: 'Esteban Paredes', time: '11:30 hs', type: 'Consulta Particular', status: 'confirmado', amount: 25000 },
    { id: '4', patient: 'Camila Benítez', time: '16:00 hs', type: 'Consulta Particular', status: 'confirmado', amount: 25000 },
  ];

  const handleExportCSV = () => {
    alert('Exportando reporte del período en formato compatible con planilla de cálculo (CSV/Excel)...');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Header del Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-text-main">
            Hola, {user?.nombre || 'Profesional'} 👋
          </h1>
          <p className="text-sm text-text-muted">Resumen operativo de tu agenda e ingresos particulares</p>
        </div>

        <button
          onClick={handleExportCSV}
          className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2 self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-slate-600" aria-hidden="true" />
          Exportar a Planilla de Cálculo
        </button>
      </div>

      {/* Grid de Métricas Clave (HU13) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map((m, idx) => {
          const Icon = m.icon;
          return (
            <div key={idx} className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold text-text-muted">{m.title}</span>
                <div className={`p-2 rounded-lg ${m.bg} ${m.color}`}>
                  <Icon className="w-4 h-4" aria-hidden="true" />
                </div>
              </div>
              <div className="text-2xl font-extrabold text-text-main mb-1">{m.value}</div>
              <div className="text-[11px] font-medium text-text-muted">{m.change}</div>
            </div>
          );
        })}
      </div>

      {/* Agenda del Día */}
      <div className="card">
        <div className="flex items-center justify-between mb-4 pb-3 border-b border-borderSubtle">
          <h2 className="text-base font-bold text-text-main flex items-center gap-2">
            <Clock className="w-4 h-4 text-primary-dark" aria-hidden="true" />
            Agenda de Pacientes de Hoy
          </h2>
          <span className="text-xs font-semibold text-text-muted">Jueves 05 Nov 2026</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm" role="table" aria-label="Turnos del día">
            <thead>
              <tr className="border-b border-borderSubtle text-xs text-text-muted uppercase">
                <th scope="col" className="pb-3 font-semibold">Horario</th>
                <th scope="col" className="pb-3 font-semibold">Paciente</th>
                <th scope="col" className="pb-3 font-semibold">Modalidad</th>
                <th scope="col" className="pb-3 font-semibold">Monto</th>
                <th scope="col" className="pb-3 font-semibold">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-borderSubtle">
              {todayAppointments.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                  <td className="py-3 font-semibold text-text-main">{row.time}</td>
                  <td className="py-3 text-text-main">{row.patient}</td>
                  <td className="py-3 text-xs text-text-muted">{row.type}</td>
                  <td className="py-3 font-mono font-medium text-text-main">$ {row.amount.toLocaleString('es-AR')}</td>
                  <td className="py-3">
                    {row.status === 'cumplido' ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full">
                        <CheckCircle className="w-3 h-3" aria-hidden="true" /> Cumplido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" aria-hidden="true" /> Confirmado
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

