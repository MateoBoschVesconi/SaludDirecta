import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Switch,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { useAuth } from '../context/AuthContext';
import {
  bookAppointment,
  contractPackage,
  bookSessionForPackage,
  CANCELLATION_POLICY_TEXT,
} from '../services/patientServices';
import ReceiptModal from '../components/ReceiptModal';

const SIM_OPTIONS = [
  { label: 'Aprobado (200)', value: 'approved' },
  { label: 'Rechazado', value: 'rejected' },
  { label: 'Colisión (409)', value: 'collision' },
];

export default function CheckoutScreen({ route, navigation }) {
  const bookingData = route.params;
  const { user } = useAuth();

  const [paymentMode, setPaymentMode] = useState('total'); // 'total' | 'sena'
  const [paymentMethod, setPaymentMethod] = useState('credit_card'); // 'credit_card' | 'wallet' | 'transfer'
  const [cardHolder, setCardHolder] = useState(user?.nombre || 'Federico Zeniquel');
  const [cardNumber, setCardNumber] = useState('4509 8812 3456 7890');
  const [cardDni, setCardDni] = useState('41354968');
  const [acceptPolicy, setAcceptPolicy] = useState(true);
  const [simulateOutcome, setSimulateOutcome] = useState('approved');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [completedReceipt, setCompletedReceipt] = useState(null);

  if (!bookingData) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.muted}>No hay reserva activa.</Text>
      </View>
    );
  }

  const totalAmount = Number(bookingData.totalAmount) || 0;
  const isSena = paymentMode === 'sena';
  const amountToPayNow = isSena ? Math.round(totalAmount * 0.3) : totalAmount;
  const balanceDue = isSena ? totalAmount - amountToPayNow : 0;

  const handlePayAndConfirm = async () => {
    if (!acceptPolicy) {
      setErrorMessage('Debés aceptar las políticas de cancelación y reintegro.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      if (simulateOutcome === 'collision') {
        throw new Error(
          'El horario seleccionado acaba de ser tomado por otro paciente (Conflicto de concurrencia).'
        );
      }
      if (simulateOutcome === 'rejected') {
        throw new Error(
          'Pago rechazado por la entidad emisora de la tarjeta. Verificá los datos o probá otro medio.'
        );
      }

      const paymentId = `MP-${Math.floor(100000 + Math.random() * 900000)}`;
      const { appointment, receipt } = await bookAppointment({
        ...bookingData,
        paymentMode,
        paymentMethod,
        paymentId,
        payer: {
          name: cardHolder || user?.nombre || 'Paciente Particular',
          dni: cardDni || 'Sin informar',
        },
      });

      if (bookingData.packageContractId) {
        await bookSessionForPackage(bookingData.packageContractId, appointment);
      } else if (Number(bookingData.totalSessions) > 1 || bookingData.packageId) {
        await contractPackage({
          packageId: bookingData.packageId,
          title: bookingData.planTitle,
          totalSessions: bookingData.totalSessions || 4,
          professionalId: bookingData.professionalId,
          professionalName: bookingData.professionalName,
          specialty: bookingData.specialty,
          patientName: cardHolder || user?.nombre || 'Paciente Particular',
          patientEmail: user?.email || 'paciente@saluddirecta.ar',
          totalPrice: totalAmount,
          paymentId,
          firstAppointment: appointment,
        });
      }

      setCompletedReceipt(receipt);
    } catch (err) {
      setErrorMessage(err.message || 'Error al procesar el pago.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {errorMessage ? (
          <View style={styles.errorBox} accessibilityLiveRegion="assertive">
            <Ionicons name="warning" size={18} color={COLORS.errorText} />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        {/* Detalle del Turno */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Detalle del Turno</Text>
          <Text style={styles.planTitle}>{bookingData.planTitle}</Text>
          <Text style={styles.subText}>
            {bookingData.professionalName} · {bookingData.specialty}
          </Text>
          <Text style={styles.datePill}>
            {bookingData.selectedDate} · {bookingData.selectedTime}
          </Text>

          <Text style={[styles.sectionHeading, { marginTop: 8 }]}>Modalidad de Pago (RF-13)</Text>
          <View style={styles.modeRow}>
            <TouchableOpacity
              onPress={() => setPaymentMode('total')}
              style={[styles.modeCard, paymentMode === 'total' && styles.modeCardSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: paymentMode === 'total' }}
            >
              <Text style={styles.modeTitle}>Pago Total (100%)</Text>
              <Text style={styles.modePrice}>$ {totalAmount.toLocaleString('es-AR')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setPaymentMode('sena')}
              style={[styles.modeCard, paymentMode === 'sena' && styles.modeCardSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: paymentMode === 'sena' }}
            >
              <Text style={styles.modeTitle}>Seña Reserva (30%)</Text>
              <Text style={styles.modePrice}>
                $ {Math.round(totalAmount * 0.3).toLocaleString('es-AR')}
              </Text>
            </TouchableOpacity>
          </View>

          {isSena && (
            <Text style={styles.balanceHint}>
              Saldo restante en consultorio: $ {balanceDue.toLocaleString('es-AR')}
            </Text>
          )}
        </View>

        {/* Medio de Pago */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Medio de Pago · Mercado Pago</Text>
          <View style={styles.methodRow}>
            {[
              { id: 'credit_card', label: 'Tarjeta', icon: 'card' },
              { id: 'wallet', label: 'Mercado Pago', icon: 'wallet' },
              { id: 'transfer', label: 'DEBIN', icon: 'business' },
            ].map((m) => {
              const active = paymentMethod === m.id;
              return (
                <TouchableOpacity
                  key={m.id}
                  onPress={() => setPaymentMethod(m.id)}
                  style={[styles.methodBtn, active && styles.methodBtnSelected]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Ionicons
                    name={m.icon}
                    size={16}
                    color={active ? COLORS.primaryDark : COLORS.textMuted}
                  />
                  <Text
                    style={[styles.methodLabel, active && { color: COLORS.primaryDark }]}
                  >
                    {m.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {paymentMethod === 'credit_card' && (
            <View style={styles.cardInputs}>
              <Text style={styles.inputLabel}>Número de tarjeta</Text>
              <TextInput
                value={cardNumber}
                onChangeText={setCardNumber}
                keyboardType="numeric"
                style={styles.input}
                accessibilityLabel="Número de tarjeta"
              />
              <Text style={styles.inputLabel}>Titular</Text>
              <TextInput
                value={cardHolder}
                onChangeText={setCardHolder}
                style={styles.input}
                accessibilityLabel="Nombre del titular de la tarjeta"
              />
              <Text style={styles.inputLabel}>DNI</Text>
              <TextInput
                value={cardDni}
                onChangeText={setCardDni}
                keyboardType="numeric"
                style={styles.input}
                accessibilityLabel="DNI del titular"
              />
            </View>
          )}
        </View>

        {/* Política 24 hs */}
        <View style={styles.card}>
          <Text style={styles.sectionHeading}>Política de Cancelación (HU11)</Text>
          <Text style={styles.policyText}>{CANCELLATION_POLICY_TEXT}</Text>
          <View style={styles.policySwitchRow}>
            <Text style={styles.policySwitchLabel}>
              Acepto la política de cancelación y la Ley 25.326
            </Text>
            <Switch
              value={acceptPolicy}
              onValueChange={setAcceptPolicy}
              trackColor={{ false: COLORS.borderSubtle, true: COLORS.primaryBorder }}
              thumbColor={acceptPolicy ? COLORS.primaryDark : COLORS.white}
            />
          </View>
        </View>

        {/* Sandbox simulación */}
        <View style={styles.sandboxCard}>
          <Text style={styles.sandboxTitle}>Simulador Sandbox Mercado Pago</Text>
          <View style={styles.simRow}>
            {SIM_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                onPress={() => setSimulateOutcome(opt.value)}
                style={[
                  styles.simChip,
                  simulateOutcome === opt.value && styles.simChipActive,
                ]}
              >
                <Text
                  style={[
                    styles.simChipText,
                    simulateOutcome === opt.value && { color: COLORS.white },
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity
          disabled={isProcessing}
          onPress={handlePayAndConfirm}
          style={[styles.payBtn, isProcessing && { backgroundColor: '#94A3B8' }]}
          accessibilityRole="button"
        >
          <Ionicons name="checkmark-circle" size={19} color={COLORS.white} />
          <Text style={styles.payBtnText}>
            {isProcessing
              ? 'Procesando pago...'
              : `Abonar $ ${amountToPayNow.toLocaleString('es-AR')} y Confirmar`}
          </Text>
        </TouchableOpacity>
      </View>

      <ReceiptModal
        receipt={completedReceipt}
        isOpen={Boolean(completedReceipt)}
        onClose={() => {
          setCompletedReceipt(null);
          navigation.navigate('MainTabs', {
            screen: 'Mis Turnos',
            params: { justBooked: true },
          });
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  muted: { fontSize: 13, color: COLORS.textMuted },
  scrollContent: { padding: 16, gap: 12 },
  errorBox: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  errorText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.errorText },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    gap: 8,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: COLORS.primaryDark,
  },
  planTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  subText: { fontSize: 13, color: COLORS.textMuted },
  datePill: { fontSize: 13, fontWeight: '700', color: COLORS.primaryDark },
  modeRow: { flexDirection: 'row', gap: 8 },
  modeCard: {
    flex: 1,
    borderWidth: 2,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 10,
  },
  modeCardSelected: { borderColor: COLORS.primaryDark, backgroundColor: '#F0F9FF' },
  modeTitle: { fontSize: 12, fontWeight: '700', color: COLORS.textMain },
  modePrice: { fontSize: 16, fontWeight: '800', color: COLORS.primaryDark, marginTop: 4 },
  balanceHint: { fontSize: 12, fontWeight: '700', color: COLORS.warningText },
  methodRow: { flexDirection: 'row', gap: 6 },
  methodBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
    paddingVertical: 6,
  },
  methodBtnSelected: { borderColor: COLORS.primaryDark, backgroundColor: COLORS.primaryLight },
  methodLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  cardInputs: { gap: 6, marginTop: 4 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: COLORS.textMain },
  input: {
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 42,
    fontSize: 13,
    color: COLORS.textMain,
  },
  policyText: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  policySwitchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  policySwitchLabel: { flex: 1, fontSize: 12, fontWeight: '600', color: COLORS.textMain },
  sandboxCard: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  sandboxTitle: { fontSize: 12, fontWeight: '800', color: COLORS.warningText },
  simRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  simChip: {
    borderWidth: 1,
    borderColor: COLORS.warningBorder,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  simChipActive: { backgroundColor: COLORS.warningBtn, borderColor: COLORS.warningBtn },
  simChipText: { fontSize: 11, fontWeight: '700', color: COLORS.warningText },
  stickyFooter: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  payBtn: {
    minHeight: 50,
    borderRadius: 12,
    backgroundColor: COLORS.successBtn,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  payBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '800' },
});
