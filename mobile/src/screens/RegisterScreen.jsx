import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Switch,
  Modal,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { registerUser } from '../services/patientServices';
import isotipoImg from '../../assets/isotipo.png';

export default function RegisterScreen({ navigation }) {
  const { login } = useAuth();
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [password, setPassword] = useState('');
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleRegister = async () => {
    if (!nombre.trim() || !email.trim() || !telefono.trim() || !password) {
      setError('Completá todos los campos obligatorios.');
      return;
    }
    if (!consentAccepted) {
      setError('Debés aceptar expresamente el Consentimiento Informado (Ley 25.326).');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const data = await registerUser({
        nombre: nombre.trim(),
        email: email.trim(),
        telefono: telefono.trim(),
        password,
      });
      await login(data.user, data.token);
      navigation.navigate('MainTabs', { screen: 'Inicio' });
    } catch (err) {
      setError(err.message || 'No se pudo completar el registro.');
    } finally {
      setIsSubmitting(false);
    }
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
        <Text style={styles.title}>Crear Cuenta (Paciente)</Text>
        <Text style={styles.subtitle}>Registrate para reservar turnos transparentes</Text>

        {error ? (
          <View style={styles.errorBox} accessibilityLiveRegion="polite">
            <Ionicons name="alert-circle" size={16} color={COLORS.errorText} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <Text style={styles.label}>Nombre completo</Text>
        <TextInput
          value={nombre}
          onChangeText={setNombre}
          placeholder="Ej: Laura Martínez"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Correo electrónico</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          placeholder="usuario@ejemplo.com"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Teléfono de contacto</Text>
        <TextInput
          value={telefono}
          onChangeText={setTelefono}
          keyboardType="phone-pad"
          placeholder="Ej: 3624123456"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />

        <Text style={styles.label}>Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Mínimo 8 caracteres"
          placeholderTextColor={COLORS.textMuted}
          style={styles.input}
        />

        <View style={styles.consentRow}>
          <Switch
            value={consentAccepted}
            onValueChange={setConsentAccepted}
            trackColor={{ false: COLORS.borderSubtle, true: COLORS.primaryBorder }}
            thumbColor={consentAccepted ? COLORS.primaryDark : COLORS.white}
            accessibilityLabel="Aceptar Consentimiento Informado Ley 25.326"
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.consentText}>
              Acepto expresamente el{' '}
              <Text
                onPress={() => setShowConsentModal(true)}
                style={styles.consentLink}
              >
                Consentimiento Informado (Ley 25.326)
              </Text>{' '}
              para gestión administrativa de turnos.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          disabled={isSubmitting}
          onPress={handleRegister}
          style={styles.primaryBtn}
          accessibilityRole="button"
        >
          <Text style={styles.primaryBtnText}>
            {isSubmitting ? 'Registrando...' : 'Completar Registro'}
          </Text>
        </TouchableOpacity>
      </View>

      <Modal
        visible={showConsentModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowConsentModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Consentimiento Informado — Ley 25.326</Text>
            <ScrollView style={{ maxHeight: 240 }}>
              <Text style={styles.modalBody}>
                Conforme a la Ley Nacional N° 25.326, Salud Directa recolecta tus datos de contacto únicamente para coordinar consultas particulares presenciales. Bajo ninguna circunstancia almacena diagnósticos médicos ni historia clínica (RNF-02). Podés solicitar acceso o supresión total desde la pestaña Cuenta.
              </Text>
            </ScrollView>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setShowConsentModal(false)}
                style={styles.modalSecondary}
              >
                <Text style={styles.modalSecondaryText}>Cerrar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setConsentAccepted(true);
                  setShowConsentModal(false);
                }}
                style={styles.modalPrimary}
              >
                <Text style={styles.primaryBtnText}>Aceptar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 16, backgroundColor: COLORS.canvas },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 20,
    gap: 8,
  },
  brandLogo: { width: 52, height: 52, alignSelf: 'center', marginBottom: 4 },
  title: { fontSize: 22, fontWeight: '800', color: COLORS.textMain, textAlign: 'center' },
  subtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', marginBottom: 4 },
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
    minHeight: 44,
    fontSize: 14,
    color: COLORS.textMain,
  },
  consentRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6 },
  consentText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  consentLink: { color: COLORS.primaryDark, fontWeight: '700', textDecorationLine: 'underline' },
  primaryBtn: {
    minHeight: 48,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: { backgroundColor: COLORS.white, borderRadius: 16, padding: 18, gap: 12 },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textMain },
  modalBody: { fontSize: 13, color: COLORS.textMuted, lineHeight: 20 },
  modalActions: { flexDirection: 'row', gap: 10 },
  modalSecondary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSecondaryText: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  modalPrimary: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
