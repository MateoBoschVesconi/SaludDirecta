import axiosClient from './axiosClient';

/**
 * Servicio de Profesionales integrado con el Backend .NET 8 (HU2 y HU4)
 */
export const profesionalService = {
  // --- HU2: Verificación de Matrícula (REFEPS / SISA) ---

  /**
   * Ejecuta la verificación de la matrícula declarada contra el registro oficial
   * @returns {Promise<{ estado: string, distintivo: boolean, motivo: string, fuente?: string, verificadaEn?: string }>}
   */
  async verificarMatricula() {
    const response = await axiosClient.post('/profesionales/me/verificacion');
    return response.data;
  },

  /**
   * Consulta el estado de la última verificación del profesional autenticado
   */
  async getMiVerificacion() {
    const response = await axiosClient.get('/profesionales/me/verificacion');
    return response.data;
  },

  /**
   * Consulta pública de distintivo de verificación oficial para un profesional
   */
  async getDistintivo(profesionalId) {
    const response = await axiosClient.get(`/profesionales/${profesionalId}/distintivo`);
    return response.data;
  },

  // --- HU4: Perfil, Honorarios Obligatorios y Prestaciones ---

  /**
   * Obtiene el perfil completo del profesional autenticado
   */
  async getMiPerfil() {
    const response = await axiosClient.get('/profesionales/me/perfil');
    return response.data;
  },

  /**
   * Guarda o actualiza los datos del consultorio y accesibilidad (HU4)
   */
  async guardarPerfil(perfilData) {
    const response = await axiosClient.put('/profesionales/me/perfil', {
      especialidad: perfilData.especialidad || null,
      descripcion: perfilData.descripcion || null,
      direccion: perfilData.direccion || null,
      ciudad: perfilData.ciudad || null,
      telefono: perfilData.telefono || null,
      duracionSesionMinutos: Number(perfilData.duracionSesionMinutos) || 45,
      tieneRampa: Boolean(perfilData.tieneRampa),
      tieneAscensor: Boolean(perfilData.tieneAscensor),
      tieneBanoAdaptado: Boolean(perfilData.tieneBanoAdaptado),
    });
    return response.data;
  },

  /**
   * Fija o modifica el honorario de la consulta (con auditoría y registro en historial)
   */
  async cambiarHonorario(honorario) {
    const response = await axiosClient.put('/profesionales/me/perfil/honorario', {
      honorario: Number(honorario),
    });
    return response.data;
  },

  /**
   * Publica el perfil en el buscador (exige tener honorario fijado)
   */
  async publicarPerfil() {
    const response = await axiosClient.post('/profesionales/me/perfil/publicar');
    return response.data;
  },

  /**
   * Oculta el perfil del buscador
   */
  async despublicarPerfil() {
    const response = await axiosClient.post('/profesionales/me/perfil/despublicar');
    return response.data;
  },

  /**
   * Consulta el historial de cambios de honorarios para auditoría (RNF-04)
   */
  async getHistorialHonorarios() {
    const response = await axiosClient.get('/profesionales/me/perfil/honorarios/historial');
    return response.data;
  },

  // --- Prestaciones y Paquetes de Atención ---

  /**
   * Lista las prestaciones activas del profesional
   */
  async getMisPrestaciones() {
    const response = await axiosClient.get('/profesionales/me/prestaciones');
    return response.data;
  },

  /**
   * Da de alta una nueva prestación
   */
  async crearPrestacion(prestacion) {
    const response = await axiosClient.post('/profesionales/me/prestaciones', {
      nombre: prestacion.nombre,
      duracionMinutos: Number(prestacion.duracionMinutos) || 45,
    });
    return response.data;
  },

  /**
   * Modifica una prestación propia
   */
  async actualizarPrestacion(id, prestacion) {
    const response = await axiosClient.put(`/profesionales/me/prestaciones/${id}`, {
      nombre: prestacion.nombre,
      duracionMinutos: Number(prestacion.duracionMinutos) || 45,
    });
    return response.data;
  },

  /**
   * Baja lógica de una prestación
   */
  async eliminarPrestacion(id) {
    await axiosClient.delete(`/profesionales/me/prestaciones/${id}`);
  },

  /**
   * Consulta pública de perfil para pacientes
   */
  async getPerfilPublico(profesionalId) {
    const response = await axiosClient.get(`/profesionales/${profesionalId}/perfil`);
    return response.data;
  },
};

export default profesionalService;
