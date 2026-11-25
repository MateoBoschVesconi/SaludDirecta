import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Calendar,
  Users,
  DollarSign,
  UserX,
  Download,
  CheckCircle,
  Clock,
  AlertTriangle,
  XCircle,
  Filter,
  FileText,
  Package,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getLocalAppointments, updateAppointmentStatus, fetchMyAppointments } from '../../api/appointmentService';
import { getReceiptByPaymentId, createFallbackReceipt } from '../../api/paymentService';
import { getProfessionalContractedPackages } from '../../api/packageTrackingService';
import PaymentReceiptModal from '../../components/common/PaymentReceiptModal';
import PackageProgressBar from '../../components/patient/PackageProgressBar';

export default function DashboardPage() {
  const { user } = useAuth();
  const [filterStatus, setFilterStatus] = useState('todos');
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [contractedPackages, setContractedPackages] = useState(() => getProfessionalContractedPackages(user?.nombre));

  const [appointments, setAppointments] = useState(() => {
    const list = getLocalAppointments();
    if (list && list.length > 0) {
      return list;
    }
    return [];
  });

  // Sincronizar turnos con Backend .NET 8 (/api/turnos/me) o filtrar los del profesional logueado
  useEffect(() => {
    let isMounted = true;
    fetchMyAppointments().then((data) => {
      if (isMounted && data) {
        if (user?.nombre) {
          const filtered = data.filter(
            (t) => t.professionalName?.toLowerCase() === user.nombre.toLowerCase()
          );
          setAppointments(filtered.length > 0 ? filtered : data);
        } else {
          setAppointments(data);
        }
      }
    });
    return () => {
      isMounted = false;
    };
  }, [user]);

  // Visualización del comprobante oficial (Criterio 2 - HU11: Disponible para ambas partes)
  const handleViewReceipt = (row) => {
    const existing = getReceiptByPaymentId(row.paymentId || row.id);
    if (existing) {
      setSelectedReceipt(existing);
      return;
    }

    setSelectedReceipt(createFallbackReceipt(row));
  };

  const handleStatusChange = async (appointmentId, newStatus) => {
    try {
      await updateAppointmentStatus(appointmentId, newStatus);
      setAppointments((prev) =>
        prev.map((a) => (a.id === appointmentId ? { ...a, status: newStatus } : a))
      );
      // Sincronizar el avance de los paquetes en tiempo real (Criterio 1 - HU12)
      setContractedPackages(getProfessionalContractedPackages(user?.nombre));
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
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewReceipt(row)}
                          className="text-text-muted hover:text-primary-dark p-1 rounded hover:bg-slate-200/60 transition-colors mr-1"
                          aria-label="Ver comprobante de pago oficial"
                          title="Ver comprobante de pago oficial (Mercado Pago)"
                        >
                          <FileText className="w-4 h-4" aria-hidden="true" />
                        </button>

                        {row.status === 'confirmado' && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleStatusChange(row.id, 'cumplido')}
                              className="bg-emerald-700 hover:bg-emerald-800 text-white text-[11px] font-bold px-2.5 py-1 rounded transition-colors"
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
                          </>
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
                          <span className="text-xs text-text-muted italic">Cerrado</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Seguimiento de Paquetes y Planes Prolongados (HU12 / RF-14) */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-3 border-b border-borderSubtle">
          <div>
            <h2 className="text-base font-bold text-text-main flex items-center gap-2">
              <Package className="w-4 h-4 text-primary-dark" aria-hidden="true" />
              Seguimiento de Tratamientos y Paquetes Activos (HU12)
            </h2>
            <p className="text-xs text-text-muted">
              Evolución de sesiones contratadas y cumplimiento de planes prolongados
            </p>
          </div>
          <Link
            to="/profesional/paquetes"
            className="text-xs text-primary-dark hover:text-sky-900 font-semibold flex items-center gap-1 focus-visible:ring-2 focus-visible:ring-primary-dark p-1 rounded"
          >
            Configurar Planes y Paquetes <ArrowRight className="w-3.5 h-3.5" aria-hidden="true" />
          </Link>
        </div>

        {contractedPackages.length === 0 ? (
          <div className="text-center py-8 text-text-muted text-xs">
            No hay pacientes con paquetes de tratamiento en curso en este momento.
          </div>
        ) : (
          <div className="space-y-6">
            {contractedPackages.map((pkg) => (
              <PackageProgressBar
                key={pkg.id}
                packageData={pkg}
              />
            ))}
          </div>
        )}
      </div>

      {/* Visor de Comprobante Oficial (Criterio 2 - HU11) */}
      <PaymentReceiptModal
        receipt={selectedReceipt}
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
      />
    </div>
  );
}

