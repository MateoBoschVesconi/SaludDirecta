import axiosClient from './axiosClient';

/**
 * Servicio de Agenda y Disponibilidad integrado con el Backend .NET 8 (HU8)
 */
export const agendaService = {
  /**
   * Obtiene la configuración semanal de la agenda y parámetros
   */
  async getMiAgenda() {
    const response = await axiosClient.get('/profesionales/me/agenda');
    return response.data;
  },

  /**
   * Actualiza franjas semanales y ajustes de descanso y anticipación
   * @param {Object} agendaData - { franjas: [{ diaSemana: 0-6, desde: "08:00", hasta: "12:00" }], descansoEntreSesionesMinutos, anticipacionMinimaHoras }
   */
  async guardarAgenda(agendaData) {
    const response = await axiosClient.put('/profesionales/me/agenda', {
      franjas: agendaData.franjas || [],
      descansoEntreSesionesMinutos: Number(agendaData.descansoEntreSesionesMinutos) || 15,
      anticipacionMinimaHoras: Number(agendaData.anticipacionMinimaHoras) || 2,
    });
    return response.data;
  },

  /**
   * Lista los períodos de ausencia programados
   */
  async getMisAusencias() {
    const response = await axiosClient.get('/profesionales/me/ausencias');
    return response.data;
  },

  /**
   * Registra un nuevo período de ausencia que bloquea la agenda
   * @param {Object} ausencia - { desde: "yyyy-MM-dd", hasta: "yyyy-MM-dd", motivo: string }
   */
  async crearAusencia(ausencia) {
    const response = await axiosClient.post('/profesionales/me/ausencias', {
      desde: ausencia.desde,
      hasta: ausencia.hasta,
      motivo: ausencia.motivo,
    });
    return response.data;
  },

  /**
   * Elimina un período de ausencia propio
   */
  async eliminarAusencia(id) {
    await axiosClient.delete(`/profesionales/me/ausencias/${id}`);
  },

  /**
   * Consulta pública de horarios disponibles calculados en tiempo real
   * Respeta franjas, ausencias, descansos y anticipación mínima.
   * @param {string} profesionalId
   * @param {string} fecha - "yyyy-MM-dd"
   * @param {string} [prestacionId]
   */
  async getHorariosDisponibles(profesionalId, fecha, prestacionId = null) {
    const params = { fecha };
    if (prestacionId) {
      params.prestacionId = prestacionId;
    }
    const response = await axiosClient.get(`/profesionales/${profesionalId}/horarios-disponibles`, {
      params,
    });
    return response.data;
  },
};

export default agendaService;
