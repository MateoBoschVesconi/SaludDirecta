import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  Share,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import { exportarMisDatos, eliminarMiCuenta } from '../services/patientServices';
import isotipoImg from '../../assets/isotipo.png';

export default function AccountScreen({ navigation }) {
  const { user, isAuthenticated, login, logout } = useAuth();

  const [personalData, setPersonalData] = useState(null);
  const [dataSource, setDataSource] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState('');

  const [deletePassword, setDeletePassword] = useState('');
  const [confirmIrreversible, setConfirmIrreversible] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const handleQuickDemo = async () => {
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
  };

  const handleLoadData = async () => {
    setLoadingData(true);
    setDataError('');
    try {
      const res = await exportarMisDatos();
      setPersonalData(res.data);
      setDataSource(res.source);
    } catch (err) {
      setDataError(err.message || 'No se pudieron consultar tus datos.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleShareJson = async () => {
    if (!personalData) return;
    await Share.share({
      message: JSON.stringify(personalData, null, 2),
    }).catch(() => {});
  };

  const handleDeleteAccount = async () => {
    if (!deletePassword.trim() || !confirmIrreversible) {
      setDeleteError('Ingresá tu contraseña y confirmá que comprendés que el borrado es irreversible.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const res = await eliminarMiCuenta(deletePassword);
      await logout();
      setPersonalData(null);
      setDeletePassword('');
      setConfirmIrreversible(false);
      navigation.navigate('Login', {
        accountDeleted: true,
        turnosCancelados: res.turnosCancelados,
      });
    } catch (err) {
      setDeleteError(err.message || 'No se pudo eliminar la cuenta.');
    } finally {
      setIsDeleting(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.safeArea} edges={['top']}>
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.guestCard}>
            <Image
              source={isotipoImg}
              style={styles.guestLogo}
              resizeMode="contain"
              accessibilityLabel="Logotipo de Salud Directa"
            />
            <Text style={styles.guestTitle}>Tu Cuenta en Salud Directa</Text>
            <Text style={styles.guestSubtitle}>
              Iniciá sesión para gestionar tus turnos, consultar tus datos personales (Ley 25.326) y recibir recordatorios.
            </Text>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={styles.primaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.primaryBtnText}>Iniciar Sesión</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Register')}
              style={styles.secondaryBtn}
              accessibilityRole="button"
            >
              <Text style={styles.secondaryBtnText}>Crear Cuenta Nueva</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={handleQuickDemo}
              style={styles.demoBtn}
              accessibilityRole="button"
            >
              <Text style={styles.demoBtnText}>Acceso Rápido Demo Paciente</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Perfil del titular */}
        <View style={styles.card}>
          <View style={styles.profileRow}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {String(user?.nombre || 'P').slice(0, 2).toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName}>{user?.nombre}</Text>
              <Text style={styles.userEmail}>{user?.email}</Text>
            </View>
          </View>
          <View style={styles.rnfBadge}>
            <Ionicons name="lock-closed" size={14} color={COLORS.successText} />
            <Text style={styles.rnfBadgeText}>Sin historia clínica ni diagnósticos (RNF-02)</Text>
          </View>
        </View>

        {/* Derecho de Acceso (HU14) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Derecho de Acceso (Ley 25.326 · HU14)</Text>
          <Text style={styles.sectionDesc}>
            Consultá toda la información almacenada sobre tu cuenta, turnos y notificaciones.
          </Text>

          {dataError ? <Text style={styles.errorText}>{dataError}</Text> : null}

          <TouchableOpacity
            disabled={loadingData}
            onPress={handleLoadData}
            style={styles.primaryBtn}
            accessibilityRole="button"
          >
            <Ionicons name="document-text-outline" size={17} color={COLORS.white} />
            <Text style={styles.primaryBtnText}>
              {loadingData
                ? 'Consultando...'
                : personalData
                ? 'Actualizar mis datos'
                : 'Consultar mis datos almacenados'}
            </Text>
          </TouchableOpacity>

          {personalData && (
            <View style={styles.snapshotBox}>
              <Text style={styles.snapshotSource}>
                Origen: {dataSource === 'api' ? 'API .NET 8' : 'Respaldo local'}
              </Text>
              <Text style={styles.snapshotLine}>Titular: {personalData.cuenta?.nombre}</Text>
              <Text style={styles.snapshotLine}>Correo: {personalData.cuenta?.email}</Text>
              <Text style={styles.snapshotLine}>
                Turnos registrados: {personalData.turnos?.length || 0}
              </Text>
              <Text style={styles.snapshotLine}>
                Notificaciones: {personalData.notificaciones?.length || 0}
              </Text>

              <TouchableOpacity onPress={handleShareJson} style={styles.shareBtn}>
                <Ionicons name="share-social" size={16} color={COLORS.primaryDark} />
                <Text style={styles.shareBtnText}>Compartir copia en JSON</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Derecho de Supresión (HU14) */}
        <View style={styles.dangerCard}>
          <Text style={styles.dangerTitle}>Derecho de Supresión — Eliminar Cuenta</Text>
          <Text style={styles.dangerDesc}>
            Cancela tus turnos activos, anonimiza tu cuenta, libera tu correo y registra el evento anónimo ELIMINACION_CUENTA (Ley 25.326).
          </Text>

          {deleteError ? <Text style={styles.errorText}>{deleteError}</Text> : null}

          <Text style={styles.inputLabel}>Contraseña actual</Text>
          <TextInput
            value={deletePassword}
            onChangeText={setDeletePassword}
            secureTextEntry
            placeholder="Ingresá tu contraseña"
            placeholderTextColor={COLORS.textMuted}
            style={styles.dangerInput}
            accessibilityLabel="Confirmar contraseña para eliminar cuenta"
          />

          <View style={styles.switchRow}>
            <Text style={styles.switchLabel}>
              Entiendo que esta acción es irreversible y cancelará mis turnos activos.
            </Text>
            <Switch
              value={confirmIrreversible}
              onValueChange={setConfirmIrreversible}
              trackColor={{ false: COLORS.borderSubtle, true: COLORS.errorBorder }}
              thumbColor={confirmIrreversible ? COLORS.errorBtn : COLORS.white}
            />
          </View>

          <TouchableOpacity
            disabled={isDeleting || !deletePassword.trim() || !confirmIrreversible}
            onPress={handleDeleteAccount}
            style={[
              styles.dangerBtn,
              (isDeleting || !deletePassword.trim() || !confirmIrreversible) && styles.disabledBtn,
            ]}
            accessibilityRole="button"
          >
            <Ionicons name="trash" size={16} color={COLORS.white} />
            <Text style={styles.primaryBtnText}>
              {isDeleting ? 'Eliminando...' : 'Eliminar mi cuenta definitivamente'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Cerrar sesión */}
        <TouchableOpacity
          onPress={logout}
          style={styles.logoutBtn}
          accessibilityRole="button"
        >
          <Ionicons name="log-out-outline" size={18} color={COLORS.errorBtn} />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.canvas },
  scrollContent: { padding: 16, gap: 14, paddingBottom: 32 },
  guestCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 22,
    alignItems: 'center',
    gap: 10,
  },
  guestLogo: { width: 64, height: 64 },
  guestTitle: { fontSize: 20, fontWeight: '800', color: COLORS.textMain, textAlign: 'center' },
  guestSubtitle: { fontSize: 13, color: COLORS.textMuted, textAlign: 'center', lineHeight: 19 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    gap: 10,
  },
  profileRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: { color: COLORS.white, fontSize: 16, fontWeight: '800' },
  userName: { fontSize: 17, fontWeight: '800', color: COLORS.textMain },
  userEmail: { fontSize: 13, color: COLORS.textMuted },
  rnfBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  rnfBadgeText: { fontSize: 11, fontWeight: '700', color: COLORS.successText },
  sectionTitle: { fontSize: 15, fontWeight: '800', color: COLORS.textMain },
  sectionDesc: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  primaryBtn: {
    width: '100%',
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  secondaryBtn: {
    width: '100%',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: { color: COLORS.textMain, fontSize: 13, fontWeight: '700' },
  demoBtn: {
    width: '100%',
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  demoBtnText: { color: COLORS.primaryDark, fontSize: 13, fontWeight: '700' },
  snapshotBox: {
    backgroundColor: COLORS.canvas,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    padding: 12,
    gap: 4,
  },
  snapshotSource: { fontSize: 11, fontWeight: '800', color: COLORS.primaryDark, marginBottom: 4 },
  snapshotLine: { fontSize: 12, color: COLORS.textMain },
  shareBtn: {
    marginTop: 8,
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  dangerCard: {
    backgroundColor: '#FEF2F2',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    padding: 16,
    gap: 10,
  },
  dangerTitle: { fontSize: 15, fontWeight: '800', color: COLORS.errorText },
  dangerDesc: { fontSize: 12, color: COLORS.errorText, lineHeight: 17 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: COLORS.errorText, textTransform: 'uppercase' },
  dangerInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 44,
    fontSize: 13,
    color: COLORS.textMain,
  },
  switchRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  switchLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.errorText },
  dangerBtn: {
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: COLORS.errorBtn,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disabledBtn: { opacity: 0.45 },
  errorText: { fontSize: 12, fontWeight: '700', color: COLORS.errorText },
  logoutBtn: {
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.errorBorder,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  logoutText: { fontSize: 13, fontWeight: '700', color: COLORS.errorBtn },
});
