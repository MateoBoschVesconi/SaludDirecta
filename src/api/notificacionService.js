import axiosClient from './axiosClient';

/**
 * Servicio de Notificaciones y Recordatorios integrado con el Backend .NET 8 (HU10)
 */
export const notificacionService = {
  /**
   * Obtiene la bandeja de notificaciones del usuario autenticado (paciente o profesional)
   * Ordenadas de la más nueva a la más antigua.
   * @returns {Promise<Array<{ id: string, turnoId: string, tipo: string, asunto: string, mensaje: string, estado: string, leida: boolean, programadaPara: string, enviadaEn?: string, creadoEn: string }>>}
   */
  async getMisNotificaciones() {
    try {
      const response = await axiosClient.get('/notificaciones/me');
      return response.data;
    } catch {
      // Fallback a localStorage para pruebas o si backend está offline
      try {
        const saved = localStorage.getItem('salud_directa_notificaciones');
        return saved ? JSON.parse(saved) : [];
      } catch {
        return [];
      }
    }
  },

  /**
   * Marca una notificación como leída
   * @param {string} id
   */
  async marcarLeida(id) {
    try {
      await axiosClient.post(`/notificaciones/${id}/leida`);
    } catch {
      // Fallback local
      try {
        const saved = localStorage.getItem('salud_directa_notificaciones');
        if (saved) {
          const list = JSON.parse(saved);
          const updated = list.map((n) => (n.id === id ? { ...n, leida: true } : n));
          localStorage.setItem('salud_directa_notificaciones', JSON.stringify(updated));
        }
      } catch {
        // Ignorar
      }
    }
  },
};

export default notificacionService;
