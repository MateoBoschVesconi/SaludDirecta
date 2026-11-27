import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import {
  getAppointments,
  getContractedPackages,
  getNotifications,
  markNotificationRead,
  cancelAppointment,
  buildReceiptFromAppointment,
  getCancellationPolicyEvaluation,
} from '../services/patientServices';
import ReceiptModal from '../components/ReceiptModal';

export default function AppointmentsScreen({ route, navigation }) {
  const [activeTab, setActiveTab] = useState('turnos'); // 'turnos' | 'paquetes' | 'avisos'
  const [appointments, setAppointments] = useState([]);
  const [packages, setPackages] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [statusBanner, setStatusBanner] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const justBooked = Boolean(route.params?.justBooked);

  const loadAll = useCallback(() => {
    let isMounted = true;
    Promise.all([getAppointments(), getContractedPackages(), getNotifications()]).then(
      ([appts, pkgs, notifs]) => {
        if (!isMounted) return;
        setAppointments(appts);
        setPackages(pkgs);
        setNotifications(notifs);
      }
    );
    return () => {
      isMounted = false;
    };
  }, []);

  useFocusEffect(loadAll);

  const handleConfirmCancel = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      const res = await cancelAppointment(cancelTarget);
      setAppointments(res.appointments);
      const updatedPkgs = await getContractedPackages();
      setPackages(updatedPkgs);
      setStatusBanner(
        res.eligibleForFullRefund
          ? 'Turno cancelado con reintegro del 100% vía Mercado Pago y horario liberado.'
          : 'Turno cancelado (< 24 hs sin reintegro) y horario liberado.'
      );
      setCancelTarget(null);
    } finally {
      setIsCancelling(false);
    }
  };

  const handleMarkRead = async (id) => {
    const updated = await markNotificationRead(id);
    setNotifications(updated);
  };

  const unreadNotifs = notifications.filter((n) => !n.leida).length;
  const cancelEval = cancelTarget ? getCancellationPolicyEvaluation(cancelTarget) : null;

  const renderStatusPill = (status) => {
    const map = {
      confirmado: { bg: COLORS.successBg, border: COLORS.successBorder, text: COLORS.successText, label: 'Confirmado' },
      solicitado: { bg: COLORS.warningBg, border: COLORS.warningBorder, text: COLORS.warningText, label: 'Solicitado' },
      cumplido: { bg: COLORS.slate100, border: COLORS.borderSubtle, text: COLORS.textMain, label: 'Cumplido' },
      cancelado: { bg: COLORS.errorBg, border: COLORS.errorBorder, text: COLORS.errorText, label: 'Cancelado' },
      ausente: { bg: COLORS.errorBg, border: COLORS.errorBorder, text: COLORS.errorText, label: 'Ausente' },
    };
    const cfg = map[status] || map.confirmado;
    return (
      <View style={[styles.statusPill, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
        <Text style={[styles.statusPillText, { color: cfg.text }]}>{cfg.label}</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <View style={styles.headerBar}>
        <Text style={styles.screenTitle}>Mis Turnos y Planes</Text>
        <Text style={styles.screenSubtitle}>Consultas, paquetes de tratamiento y avisos</Text>
      </View>

      {/* Sub-pestañas accesibles */}
      <View style={styles.tabsRow} accessibilityRole="tablist">
        {[
          { key: 'turnos', label: `Turnos (${appointments.length})` },
          { key: 'paquetes', label: `Paquetes (${packages.length})` },
          { key: 'avisos', label: `Avisos${unreadNotifs > 0 ? ` (${unreadNotifs})` : ''}` },
        ].map((tab) => {
          const active = activeTab === tab.key;
          return (
            <TouchableOpacity
              key={tab.key}
              onPress={() => setActiveTab(tab.key)}
              style={[styles.tabBtn, active && styles.tabBtnActive]}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
            >
              <Text style={[styles.tabText, active && styles.tabTextActive]}>{tab.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {justBooked && activeTab === 'turnos' && (
          <View style={styles.successBanner}>
            <Ionicons name="checkmark-circle" size={18} color={COLORS.successText} />
            <Text style={styles.successBannerText}>
              ¡Turno reservado y pago acreditado con éxito! Ya podés consultar tu comprobante oficial.
            </Text>
          </View>
        )}

        {statusBanner ? (
          <View style={styles.infoBanner}>
            <Ionicons name="information-circle" size={18} color={COLORS.primaryDark} />
            <Text style={styles.infoBannerText}>{statusBanner}</Text>
          </View>
        ) : null}

        {/* PESTAÑA 1: TURNOS (HU9 + HU11) */}
        {activeTab === 'turnos' &&
          (appointments.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No tenés turnos registrados</Text>
              <TouchableOpacity
                onPress={() => navigation.navigate('Buscar')}
                style={styles.primaryBtn}
              >
                <Text style={styles.primaryBtnText}>Buscar Profesionales</Text>
              </TouchableOpacity>
            </View>
          ) : (
            appointments.map((appt) => {
              const canCancel = appt.status === 'confirmado' || appt.status === 'solicitado';
              return (
                <View key={appt.id} style={styles.card}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.apptId}>{appt.id}</Text>
                    {renderStatusPill(appt.status)}
                  </View>

                  <Text style={styles.apptDate}>
                    {appt.date} · {appt.time}
                  </Text>
                  <Text style={styles.apptPro}>
                    {appt.professionalName} · <Text style={styles.muted}>{appt.specialty}</Text>
                  </Text>
                  <Text style={styles.apptMeta}>
                    {appt.planTitle} · $ {Number(appt.price || 0).toLocaleString('es-AR')}
                  </Text>

                  <View style={styles.cardActions}>
                    <TouchableOpacity
                      onPress={() => setSelectedReceipt(buildReceiptFromAppointment(appt))}
                      style={styles.receiptBtn}
                      accessibilityRole="button"
                    >
                      <Ionicons name="document-text-outline" size={16} color={COLORS.primaryDark} />
                      <Text style={styles.receiptBtnText}>Ver Comprobante</Text>
                    </TouchableOpacity>

                    {canCancel && (
                      <TouchableOpacity
                        onPress={() => setCancelTarget(appt)}
                        style={styles.cancelBtn}
                        accessibilityRole="button"
                      >
                        <Text style={styles.cancelBtnText}>Cancelar Turno</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          ))}

        {/* PESTAÑA 2: PAQUETES HU12 */}
        {activeTab === 'paquetes' &&
          packages.map((pkg) => {
            const total = Number(pkg.totalSessions) || 1;
            const completed = Number(pkg.completedSessions) || 0;
            const booked = Number(pkg.bookedSessions) || 0;
            const toBook = Math.max(0, total - booked);
            const pct = Math.min(100, Math.round((completed / total) * 100));
            const allBooked = booked >= total;

            return (
              <View key={pkg.id} style={styles.card}>
                <View style={styles.cardTopRow}>
                  <Text style={styles.apptId}>{pkg.id}</Text>
                  <Text style={styles.pctBadge}>{pct}%</Text>
                </View>

                <Text style={styles.pkgTitle}>{pkg.title}</Text>
                <Text style={styles.apptPro}>
                  {pkg.professionalName} · {pkg.specialty}
                </Text>

                {/* Barra de progreso accesible */}
                <View
                  style={styles.progressTrack}
                  accessible
                  accessibilityRole="progressbar"
                  accessibilityValue={{ min: 0, max: 100, now: pct }}
                  accessibilityLabel={`Progreso: ${completed} de ${total} sesiones cumplidas (${pct}%)`}
                >
                  <View style={[styles.progressFill, { width: `${pct}%` }]} />
                </View>

                <View style={styles.countersRow}>
                  <Text style={styles.counterChipGreen}>{completed} cumplidas</Text>
                  <Text style={styles.counterChipBlue}>
                    {Math.max(0, booked - completed)} agendada(s)
                  </Text>
                  <Text style={styles.counterChipGray}>{toBook} por agendar</Text>
                </View>

                {/* Mapa de sesiones 1..N */}
                <View style={styles.pillsGrid}>
                  {Array.from({ length: total }, (_, idx) => {
                    const num = idx + 1;
                    const session = pkg.sessions?.find((s) => s.sessionNumber === num);
                    const isDone = session?.status === 'cumplido';
                    const isBooked = session?.status === 'confirmado';
                    return (
                      <View
                        key={num}
                        style={[
                          styles.sessionPill,
                          isDone && styles.sessionDone,
                          isBooked && styles.sessionBooked,
                        ]}
                      >
                        <Text
                          style={[
                            styles.sessionPillText,
                            isDone && { color: COLORS.successText },
                            isBooked && { color: COLORS.primaryDark },
                          ]}
                        >
                          S{num}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                {allBooked ? (
                  <View style={styles.limitNotice}>
                    <Text style={styles.limitNoticeText}>
                      Todas las {total} sesiones contratadas ya fueron reservadas (límite HU12).
                    </Text>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate('Booking', {
                        id: pkg.professionalId || 1,
                        planId: pkg.packageId || 'p2',
                        packageContractId: pkg.id,
                      })
                    }
                    style={styles.primaryBtn}
                    accessibilityRole="button"
                  >
                    <Ionicons name="calendar" size={16} color={COLORS.white} />
                    <Text style={styles.primaryBtnText}>
                      Agendar Sesión {booked + 1} de {total}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            );
          })}

        {/* PESTAÑA 3: NOTIFICACIONES Y RECORDATORIOS HU10 */}
        {activeTab === 'avisos' &&
          notifications.map((n) => (
            <View
              key={n.id}
              style={[styles.card, !n.leida && { borderColor: COLORS.primaryDark, backgroundColor: '#F0F9FF' }]}
            >
              <View style={styles.cardTopRow}>
                <Text style={styles.notifSubject}>{n.asunto}</Text>
                {!n.leida && (
                  <TouchableOpacity
                    onPress={() => handleMarkRead(n.id)}
                    style={styles.markReadBtn}
                    accessibilityRole="button"
                    accessibilityLabel="Marcar notificación como leída"
                  >
                    <Ionicons name="checkmark" size={15} color={COLORS.primaryDark} />
                    <Text style={styles.markReadText}>Leída</Text>
                  </TouchableOpacity>
                )}
              </View>
              <Text style={styles.notifMsg}>{n.mensaje}</Text>
            </View>
          ))}
      </ScrollView>

      {/* Modal Confirmación Cancelación (Cross-platform Web/iOS/Android) */}
      <Modal
        visible={Boolean(cancelTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setCancelTarget(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Cancelar Turno {cancelTarget?.id}</Text>
            <Text style={styles.modalBody}>
              {cancelEval?.eligibleForFullRefund
                ? `Restan ${cancelEval.hoursRemaining} hs (>= 24 hs). Se solicitará el REINTEGRO DEL 100% vía Mercado Pago y se liberará el horario.`
                : `Restan menos de 24 hs (${cancelEval?.hoursRemaining || 0} hs). Según las políticas vigentes, la seña queda retenida pero el horario se libera inmediatamente.`}
            </Text>
            <View style={styles.modalActions}>
              <TouchableOpacity
                onPress={() => setCancelTarget(null)}
                style={styles.modalSecondaryBtn}
              >
                <Text style={styles.modalSecondaryText}>Volver</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isCancelling}
                onPress={handleConfirmCancel}
                style={styles.modalDangerBtn}
              >
                <Text style={styles.modalDangerText}>
                  {isCancelling ? 'Cancelando...' : 'Confirmar Cancelación'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ReceiptModal
        receipt={selectedReceipt}
        isOpen={Boolean(selectedReceipt)}
        onClose={() => setSelectedReceipt(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: COLORS.canvas },
  headerBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    backgroundColor: COLORS.white,
  },
  screenTitle: { fontSize: 21, fontWeight: '800', color: COLORS.textMain },
  screenSubtitle: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
  tabsRow: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
    paddingHorizontal: 12,
  },
  tabBtn: {
    flex: 1,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: { borderBottomColor: COLORS.primaryDark },
  tabText: { fontSize: 12, fontWeight: '600', color: COLORS.textMuted },
  tabTextActive: { color: COLORS.primaryDark, fontWeight: '800' },
  scrollContent: { padding: 16, gap: 12, paddingBottom: 28 },
  successBanner: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  successBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.successText },
  infoBanner: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  infoBannerText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    gap: 6,
  },
  cardTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  apptId: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  statusPill: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, borderWidth: 1 },
  statusPillText: { fontSize: 11, fontWeight: '700' },
  apptDate: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  apptPro: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },
  muted: { fontWeight: '400', color: COLORS.textMuted },
  apptMeta: { fontSize: 12, color: COLORS.textMuted },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    gap: 8,
  },
  receiptBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 8,
  },
  receiptBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  cancelBtn: { minHeight: 40, justifyContent: 'center', paddingHorizontal: 10 },
  cancelBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.errorBtn },
  pctBadge: { fontSize: 16, fontWeight: '800', color: COLORS.primaryDark },
  pkgTitle: { fontSize: 16, fontWeight: '800', color: COLORS.textMain },
  progressTrack: {
    height: 12,
    borderRadius: 999,
    backgroundColor: COLORS.slate100,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    overflow: 'hidden',
    marginVertical: 4,
  },
  progressFill: { height: '100%', backgroundColor: COLORS.primaryDark, borderRadius: 999 },
  countersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  counterChipGreen: { fontSize: 11, fontWeight: '700', color: COLORS.successText },
  counterChipBlue: { fontSize: 11, fontWeight: '700', color: COLORS.primaryDark },
  counterChipGray: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  pillsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginVertical: 6 },
  sessionPill: {
    width: 36,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.canvas,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sessionDone: { backgroundColor: COLORS.successBg, borderColor: COLORS.successBorder },
  sessionBooked: { backgroundColor: COLORS.primaryLight, borderColor: COLORS.primaryBorder },
  sessionPillText: { fontSize: 11, fontWeight: '700', color: COLORS.textMuted },
  limitNotice: {
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    padding: 10,
  },
  limitNoticeText: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  primaryBtn: {
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  primaryBtnText: { color: COLORS.white, fontSize: 13, fontWeight: '700' },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 24,
    alignItems: 'center',
    gap: 12,
  },
  emptyTitle: { fontSize: 15, fontWeight: '700', color: COLORS.textMain },
  notifSubject: { flex: 1, fontSize: 14, fontWeight: '700', color: COLORS.textMain },
  notifMsg: { fontSize: 12, color: COLORS.textMuted, lineHeight: 17 },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: COLORS.white,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  markReadText: { fontSize: 11, fontWeight: '700', color: COLORS.primaryDark },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 18,
    gap: 12,
  },
  modalTitle: { fontSize: 17, fontWeight: '800', color: COLORS.textMain },
  modalBody: { fontSize: 13, color: COLORS.textMuted, lineHeight: 19 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 4 },
  modalSecondaryBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalSecondaryText: { fontSize: 13, fontWeight: '700', color: COLORS.textMain },
  modalDangerBtn: {
    flex: 1,
    minHeight: 44,
    borderRadius: 10,
    backgroundColor: COLORS.errorBtn,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalDangerText: { fontSize: 13, fontWeight: '700', color: COLORS.white },
});
