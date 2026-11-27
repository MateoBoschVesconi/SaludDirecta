import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { loginUser } from '../services/patientServices';
import isotipoImg from '../../assets/isotipo.png';

export default function LoginScreen({ route, navigation }) {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountDeleted = Boolean(route.params?.accountDeleted);
  const turnosCancelados = route.params?.turnosCancelados || 0;

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setError('Completá tu correo electrónico y contraseña.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const data = await loginUser({ email: email.trim(), password });
      await login(data.user, data.token);
      navigation.navigate('MainTabs', { screen: 'Inicio' });
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDemo = async () => {
    await login(
      {
        id: 'pac-1',
        nombre: 'Federico Zeniquel',
        email: 'federico.zeniquel@saluddirecta.ar',
        telefono: '3624123456',
        rol: 'paciente',
      },
      'mock_mobile_demo_jwt'
    );
    navigation.navigate('MainTabs', { screen: 'Inicio' });
  };

  return (
    <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.card}>
        <Image
          source={isotipoImg}
          style={styles.brandLogo}
          resizeMode="contain"
          accessible={false}
        />
        <Text style={styles.title}>Iniciar Sesión (Paciente)</Text>
        <Text style={styles.subtitle}>Accedé a Salud Directa con tu cuenta particular</Text>

        {accountDeleted && (
          <View style={styles.successBox}>
            <Text style={styles.successText}>
              Tu cuenta fue eliminada definitivamente según la Ley 25.326.
              {turnosCancelados > 0
                ? ` Se cancelaron ${turnosCancelados} turno(s) activo(s).`
                : ''}
            </Text>
          </View>
        )}

        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={16} color={COLORS.errorText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="usuario@ejemplo.com"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          accessibilityLabel="Correo electrónico"
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="••••••••"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
          accessibilityLabel="Contraseña"
        />

        <TouchableOpacity
          disabled={isSubmitting}
          onPress={handleLogin}
          style={styles.primaryBtn}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>
            {isSubmitting ? 'Ingresando...' : 'Ingresar'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleDemo}
          style={styles.demoBtn}
          accessibilityRole="button"
        >
          <Text style={styles.demoBtnText}>Demo Paciente (Acceso Rápido)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => navigation.navigate('Register')}
          style={styles.linkBtn}
        >
          <Text style={styles.linkText}>¿No tenés cuenta? Registrate acá</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: COLORS.canvas, justifyContent: 'center' },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 20,
    gap: 10,
  },
  brandLogo: { width: 56, height: 56, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textMain, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 6 },
  successBox: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
  },
  successText: { fontSize: 12, fontWeight: '700', color: COLORS.successText },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.errorText },
  label: { fontSize: 11, fontWeight: '700', textTransform: 'uppercase', color: COLORS.textMain },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    fontSize: 14,
    color: COLORS.textMain,
    backgroundColor: COLORS.white,
  },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  demoBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoBtnText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '700' },
  linkBtn: { minHeight: 40, justifyContent: 'center', alignItems: 'center' },
  linkText: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },
});
