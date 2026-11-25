import axiosClient from './axiosClient';

const USERS_STORAGE_KEY = 'salud_directa_registered_users';

export const getRegisteredUsers = () => {
  try {
    const raw = localStorage.getItem(USERS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveRegisteredUser = (userWithCredentials) => {
  const users = getRegisteredUsers();
  const index = users.findIndex(
    (u) => u.email?.toLowerCase() === userWithCredentials.email?.toLowerCase()
  );
  if (index >= 0) {
    users[index] = { ...users[index], ...userWithCredentials };
  } else {
    users.push(userWithCredentials);
  }
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
};

export const findRegisteredUserByEmail = (email) => {
  const users = getRegisteredUsers();
  return users.find((u) => u.email?.toLowerCase() === email?.toLowerCase()) || null;
};

/**
 * Servicio de Autenticación integrado con el Backend .NET 8 y fallback persistente
 */
export const authService = {
  /**
   * Inicio de sesión de usuario (paciente o profesional)
   * @param {Object} credentials - { email, password, rol }
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
