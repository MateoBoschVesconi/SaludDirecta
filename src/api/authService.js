import axiosClient from './axiosClient';

/**
 * Servicio de Autenticación integrado con el Backend .NET 8 (HU1 - Ley 25.326)
 */
export const authService = {
  /**
   * Inicio de sesión de usuario (paciente o profesional)
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ token: string, user: Object, expiraEnUtc: string }>}
   */
  async login(credentials) {
    const response = await axiosClient.post('/auth/login', {
      email: credentials.email,
      password: credentials.password,
    });
    return response.data;
  },

  /**
   * Registro de nuevo usuario (paciente o profesional con matrícula)
   * @param {Object} userData - { nombre, email, telefono, password, rol, profesion, matricula, jurisdiccion, consentimientoAceptado }
   * @returns {Promise<{ token: string, user: Object, expiraEnUtc: string }>}
   */
  async register(userData) {
    const response = await axiosClient.post('/auth/register', {
      nombre: userData.nombre,
      email: userData.email,
      telefono: userData.telefono,
      password: userData.password,
      rol: userData.rol,
      profesion: userData.profesion || null,
      matricula: userData.matricula || null,
      jurisdiccion: userData.jurisdiccion || null,
      consentimientoAceptado: Boolean(userData.consentimientoAceptado),
    });
    return response.data;
  },

  /**
   * Obtener perfil del usuario autenticado vía JWT
   * @returns {Promise<Object>}
   */
  async getMe() {
    const response = await axiosClient.get('/auth/me');
    return response.data;
  },
};

export default authService;
