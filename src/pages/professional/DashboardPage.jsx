import React, { useState, useMemo } from 'react';
import { Calendar, Users, DollarSign, UserX, Download, CheckCircle, Clock, AlertTriangle, XCircle, Filter } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLocalAppointments, updateAppointmentStatus, saveLocalAppointments } from '../../api/appointmentService';

const SEED_APPOINTMENTS = [
  {
    id: 'TUR-1001',
    patientName: 'Gonzalo Silva',
    professionalName: 'Lic. Mateo Gómez',
    time: '09:00 hs',
    date: '2026-11-05',
    planTitle: 'Consulta Particular',
    status: 'cumplido',
    price: 25000,
  },
  {
    id: 'TUR-1002',
    patientName: 'Mariana Duarte',
    professionalName: 'Lic. Mateo Gómez',
    time: '10:30 hs',
    date: '2026-11-05',
    planTitle: 'Plan Integral (Sesión 3/8)',
    status: 'confirmado',
    price: 21000,
  },
  {
    id: 'TUR-1003',
    patientName: 'Esteban Paredes',
    professionalName: 'Lic. Mateo Gómez',
    time: '11:30 hs',
    date: '2026-11-05',
    planTitle: 'Consulta Particular',
    status: 'confirmado',
    price: 25000,
  },
  {
    id: 'TUR-1004',
    patientName: 'Camila Benítez',
    professionalName: 'Lic. Mateo Gómez',
    time: '16:00 hs',
    date: '2026-11-05',
    planTitle: 'Consulta Particular',
    status: 'confirmado',
    price: 25000,
  },
];

export default function DashboardPage() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState('todos');
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const [appointments, setAppointments] = useState(() => {
    const list = getLocalAppointments();
    if (list && list.length > 0) {
      return list;
    }
    saveLocalAppointments(SEED_APPOINTMENTS);
    return SEED_APPOINTMENTS;
  });

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
      setFeedbackMsg(`Turno ${appointmentId} actualizado a estado "${newStatus}".`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err) {
      alert(err.message || 'Error al cambiar estado.');
    }
  };

  // Métricas calculadas dinámicamente
  const metricsData = useMemo(() => {
    const total = appointments.length;
    const cumplidos = appointments.filter((a) => a.status === 'cumplido').length;
    const confirmados = appointments.filter((a) => a.status === 'confirmado').length;
    const ausentes = appointments.filter((a) => a.status === 'ausente').length;

    const ingresos = appointments
      .filter((a) => a.status === 'cumplido' || a.status === 'confirmado')
      .reduce((acc, curr) => acc + (Number(curr.price) || 0), 0);

    const ausentismoRate = total > 0 ? ((ausentes / total) * 100).toFixed(1) : '0.0';

    return {
      ocupacion: `${Math.min(100, Math.round(((cumplidos + confirmados) / Math.max(1, total)) * 100))}%`,
      ausentismo: `${ausentismoRate}%`,
      ingresos: `$ ${ingresos.toLocaleString('es-AR')}`,
      programadosHoy: `${confirmados} programados`,
      cumplidos,
      confirmados,
      ausentes,
      totalIngresosNum: ingresos,
    };
  }, [appointments]);

  const metrics = [
    { title: 'Ocupación de Agenda', value: metricsData.ocupacion, change: 'Turnos activos asignados', icon: Users, color: 'text-primary-dark', bg: 'bg-sky-50' },
    { title: 'Tasa de Ausentismo', value: metricsData.ausentismo, change: `${metricsData.ausentes} turnos sin concurrencia`, icon: UserX, color: 'text-amber-800', bg: 'bg-amber-50' },
    { title: 'Ingresos del Período', value: metricsData.ingresos, change: 'Honorarios cobrados/confirmados', icon: DollarSign, color: 'text-emerald-800', bg: 'bg-emerald-50' },
    { title: 'Turnos Pendientes Hoy', value: metricsData.programadosHoy, change: `${metricsData.cumplidos} cumplidos registrados`, icon: Calendar, color: 'text-purple-700', bg: 'bg-purple-50' },
  ];

  const filteredAppointments = useMemo(() => {
    if (filterStatus === 'todos') return appointments;
    return appointments.filter((a) => a.status === filterStatus);
  }, [appointments, filterStatus]);

  const handleExportCSV = () => {
    const headers = ['ID', 'Fecha', 'Horario', 'Paciente', 'Modalidad', 'Monto', 'Estado'];
    const rows = appointments.map((a) => [
      a.id,
      a.date || 'N/A',
      a.time || 'N/A',
      `"${a.patientName || a.patient || 'Paciente Particular'}"`,
      `"${a.planTitle || a.type || 'Consulta Particular'}"`,
      a.price || a.amount || 0,
      a.status,
    ]);

    const csvContent = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `reporte_turnos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'confirmado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-100 px-2.5 py-0.5 rounded-full border border-sky-300">
            <Clock className="w-3 h-3" aria-hidden="true" /> Confirmado
          </span>
        );
      case 'cumplido':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded-full border border-emerald-300">
            <CheckCircle className="w-3 h-3" aria-hidden="true" /> Cumplido
          </span>
        );
      case 'ausente':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-800 bg-rose-100 px-2.5 py-0.5 rounded-full border border-rose-300">
            <AlertTriangle className="w-3 h-3" aria-hidden="true" /> Ausente
          </span>
        );
      case 'cancelado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full border border-slate-300">
            <XCircle className="w-3 h-3" aria-hidden="true" /> Cancelado
          </span>
        );
      case 'solicitado':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full border border-amber-300">
            <Clock className="w-3 h-3" aria-hidden="true" /> Solicitado
          </span>
        );
      default:
        return <span className="text-xs">{status}</span>;
    }
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
          className="btn-secondary text-xs py-2.5 px-4 flex items-center gap-2 self-start sm:self-auto focus-visible:ring-2 focus-visible:ring-primary-dark"
          aria-label="Descargar reporte en planilla CSV"
        >
          <Download className="w-4 h-4 text-slate-600" aria-hidden="true" />
          Exportar a Planilla de Cálculo (.csv)
        </button>
      </div>

      {feedbackMsg && (
        <div className="bg-sky-50 border border-sky-300 rounded-xl p-3 text-xs text-sky-900 font-semibold flex items-center gap-2 animate-in fade-in">
          <CheckCircle className="w-4 h-4 text-primary-dark" aria-hidden="true" />
          <span>{feedbackMsg}</span>
        </div>
      )}

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

      {/* Agenda del Día & Gestión de Turnos (HU9) */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-borderSubtle">
          <div>
            <h2 className="text-base font-bold text-text-main flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary-dark" aria-hidden="true" />
              Gestión de Turnos y Pacientes
            </h2>
            <p className="text-xs text-text-muted">Actualizá el estado de la consulta en tiempo real</p>
          </div>

          {/* Filtro por Estado */}
          <div className="flex items-center gap-2">
            <Filter className="w-3.5 h-3.5 text-text-muted" aria-hidden="true" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field text-xs py-1.5 px-2.5 max-w-[170px]"
              aria-label="Filtrar por estado del turno"
            >
              <option value="todos">Todos los estados</option>
              <option value="confirmado">Confirmados</option>
              <option value="cumplido">Cumplidos</option>
              <option value="ausente">Ausentes</option>
              <option value="cancelado">Cancelados</option>
            </select>
          </div>
        </div>

        {filteredAppointments.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-xs">
            No hay turnos registrados con el filtro seleccionado.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm" role="table" aria-label="Turnos del profesional">
              <thead>
                <tr className="border-b border-borderSubtle text-xs text-text-muted uppercase">
                  <th scope="col" className="pb-3 font-semibold">Horario / Fecha</th>
                  <th scope="col" className="pb-3 font-semibold">Paciente</th>
                  <th scope="col" className="pb-3 font-semibold">Modalidad</th>
                  <th scope="col" className="pb-3 font-semibold">Monto</th>
                  <th scope="col" className="pb-3 font-semibold">Estado</th>
                  <th scope="col" className="pb-3 font-semibold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-borderSubtle">
                {filteredAppointments.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 font-semibold text-text-main">
                      <div>{row.time}</div>
                      <div className="text-[11px] font-normal text-text-muted">{row.date}</div>
                    </td>
                    <td className="py-3 text-text-main font-medium">
                      {row.patientName || row.patient || 'Paciente Particular'}
                    </td>
                    <td className="py-3 text-xs text-text-muted">
                      {row.planTitle || row.type || 'Consulta Particular'}
                    </td>
                    <td className="py-3 font-mono font-medium text-text-main">
                      $ {(Number(row.price || row.amount) || 0).toLocaleString('es-AR')}
                    </td>
                    <td className="py-3">
                      {getStatusBadge(row.status)}
                    </td>
                    <td className="py-3 text-right">
                      {row.status === 'confirmado' && (
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleStatusChange(row.id, 'cumplido')}
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors"
                            title="Marcar consulta como realizada"
                          >
                            Cumplido
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStatusChange(row.id, 'ausente')}
                            className="bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors"
                            title="Marcar paciente ausente sin aviso"
                          >
                            Ausente
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm('¿Desea cancelar este turno? Se liberará el cupo.')) {
                                handleStatusChange(row.id, 'cancelado');
                              }
                            }}
                            className="text-medical-error hover:text-red-700 text-[11px] font-bold px-2 py-1 rounded transition-colors"
                            title="Cancelar turno"
                          >
                            Cancelar
                          </button>
                        </div>
                      )}
                      {row.status === 'solicitado' && (
                        <button
                          type="button"
                          onClick={() => handleStatusChange(row.id, 'confirmado')}
                          className="bg-primary-dark hover:bg-sky-900 text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors"
                        >
                          Confirmar
                        </button>
                      )}
                      {(row.status === 'cumplido' || row.status === 'ausente' || row.status === 'cancelado') && (
                        <span className="text-xs text-text-muted italic">Sin acciones</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

