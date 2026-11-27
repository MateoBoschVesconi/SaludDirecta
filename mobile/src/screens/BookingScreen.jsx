import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import {
  getProfessionalById,
  getBookedSlots,
  getContractedPackageById,
} from '../services/patientServices';

export default function BookingScreen({ route, navigation }) {
  const { id, planId = 'individual', packageContractId = null } = route.params || {};

  const [pro, setPro] = useState(null);
  const [loadingPro, setLoadingPro] = useState(true);
  const [existingContract, setExistingContract] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [bookedSlots, setBookedSlots] = useState([]);
  const [loadedKey, setLoadedKey] = useState('');

  useEffect(() => {
    let isMounted = true;
    Promise.all([
      getProfessionalById(id),
      packageContractId ? getContractedPackageById(packageContractId) : Promise.resolve(null),
    ]).then(([foundPro, foundContract]) => {
      if (!isMounted) return;
      setPro(foundPro);
      setExistingContract(foundContract);
      if (foundPro?.availableSlots?.[0]?.date) {
        setSelectedDate(foundPro.availableSlots[0].date);
      }
      setLoadingPro(false);
    });
    return () => {
      isMounted = false;
    };
  }, [id, packageContractId]);

  const currentSlotKey = pro && selectedDate ? `${pro.name}|${selectedDate}` : '';
  const loadingSlots = Boolean(currentSlotKey && loadedKey !== currentSlotKey);

  useEffect(() => {
    if (!pro || !selectedDate) return undefined;
    let isMounted = true;
    const key = `${pro.name}|${selectedDate}`;
    getBookedSlots(pro.name, selectedDate)
      .then((slots) => {
        if (isMounted) setBookedSlots(slots);
      })
      .finally(() => {
        if (isMounted) setLoadedKey(key);
      });
    return () => {
      isMounted = false;
    };
  }, [pro, selectedDate]);

  const selectedPackage = useMemo(
    () => pro?.packages?.find((p) => p.id === planId),
    [pro, planId]
  );

  if (loadingPro) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.muted}>Cargando disponibilidad...</Text>
      </View>
    );
  }

  if (!pro) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.errorTitle}>Profesional no encontrado</Text>
      </View>
    );
  }

  const isContractLimitReached = Boolean(
    existingContract && existingContract.bookedSessions >= existingContract.totalSessions
  );

  const planTitle = existingContract
    ? `${existingContract.title} (Sesión ${existingContract.bookedSessions + 1} de ${existingContract.totalSessions})`
    : selectedPackage
    ? selectedPackage.title
    : 'Consulta Individual';

  const totalAmount = existingContract
    ? 0
    : selectedPackage
    ? Math.round(pro.price * selectedPackage.sessions * (1 - selectedPackage.discountPercent / 100))
    : pro.price;

  const currentSlotGroup = pro.availableSlots?.find((s) => s.date === selectedDate);

  const handleProceed = () => {
    if (!selectedDate || !selectedTime || isContractLimitReached) return;
    navigation.navigate('Checkout', {
      professionalId: pro.id,
      professionalName: pro.name,
      specialty: pro.specialty,
      registry: pro.registry,
      jurisdiction: pro.jurisdiction,
      planTitle,
      selectedDate,
      selectedTime,
      totalAmount,
      packageContractId: existingContract?.id || null,
      packageId: selectedPackage?.id || existingContract?.packageId || null,
      totalSessions: selectedPackage?.sessions || existingContract?.totalSessions || 1,
    });
  };

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Text style={styles.heading}>Seleccioná fecha y horario</Text>
        <Text style={styles.subHeading}>
          {pro.name} · {planTitle}
        </Text>

        {isContractLimitReached && (
          <View style={styles.limitAlert} accessibilityLiveRegion="assertive">
            <Ionicons name="alert-circle" size={20} color={COLORS.errorText} />
            <Text style={styles.limitAlertText}>
              Límite de Sesiones Contratadas Alcanzado (HU12): ya reservaste todas las{' '}
              {existingContract.totalSessions} sesiones de este paquete.
            </Text>
          </View>
        )}

        {/* Días */}
        <View style={styles.card}>
          <Text style={styles.stepTitle}>1. Elegí el día de atención</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.daysRow}>
            {pro.availableSlots?.map((slot) => {
              const active = selectedDate === slot.date;
              const [dayShort, dayNum] = String(slot.dayLabel || slot.date).split(' ');
              return (
                <TouchableOpacity
                  key={slot.date}
                  onPress={() => {
                    setSelectedDate(slot.date);
                    setSelectedTime('');
                  }}
                  style={[styles.dayCard, active && styles.dayCardActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.dayShort, active && { color: COLORS.primaryLight }]}>
                    {dayShort}
                  </Text>
                  <Text style={[styles.dayNum, active && { color: COLORS.white }]}>
                    {dayNum || slot.date.slice(-2)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <Text style={[styles.stepTitle, { marginTop: 14 }]}>2. Franjas horarias disponibles</Text>

          {loadingSlots ? (
            <Text style={styles.muted}>Consultando disponibilidad en tiempo real...</Text>
          ) : currentSlotGroup && currentSlotGroup.times?.length > 0 ? (
            <View style={styles.timesGrid}>
              {currentSlotGroup.times.map((time) => {
                const isBooked = bookedSlots.includes(time);
                const isSelected = selectedTime === time;

                return (
                  <TouchableOpacity
                    key={time}
                    disabled={isBooked}
                    onPress={() => !isBooked && setSelectedTime(time)}
                    style={[
                      styles.timeBtn,
                      isBooked && styles.timeBtnBooked,
                      isSelected && styles.timeBtnSelected,
                    ]}
                    accessibilityRole="radio"
                    accessibilityState={{ checked: isSelected, disabled: isBooked }}
                  >
                    <Text
                      style={[
                        styles.timeBtnText,
                        isBooked && styles.timeTextBooked,
                        isSelected && { color: COLORS.primaryDark, fontWeight: '800' },
                      ]}
                    >
                      {time} {isBooked ? '(Ocupado)' : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <Text style={styles.muted}>No hay horarios para la fecha elegida.</Text>
          )}
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <View>
          <Text style={styles.totalLabel}>Total a abonar:</Text>
          <Text style={styles.totalValue}>$ {Number(totalAmount).toLocaleString('es-AR')}</Text>
          {selectedTime ? (
            <Text style={styles.selectedInfo}>
              {currentSlotGroup?.dayLabel} · {selectedTime}
            </Text>
          ) : null}
        </View>

        <TouchableOpacity
          disabled={!selectedDate || !selectedTime || isContractLimitReached}
          onPress={handleProceed}
          style={[
            styles.continueBtn,
            (!selectedDate || !selectedTime || isContractLimitReached) && styles.disabledBtn,
          ]}
          accessibilityRole="button"
        >
          <Text style={styles.continueBtnText}>Continuar</Text>
          <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  centerBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  muted: { fontSize: 13, color: COLORS.textMuted },
  errorTitle: { fontSize: 16, fontWeight: '700', color: COLORS.textMain },
  scrollContent: { padding: 16, gap: 12 },
  heading: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  subHeading: { fontSize: 13, color: COLORS.textMuted },
  limitAlert: {
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
  },
  limitAlertText: { flex: 1, fontSize: 12, fontWeight: '700', color: COLORS.errorText },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    gap: 10,
  },
  stepTitle: { fontSize: 14, fontWeight: '700', color: COLORS.textMain },
  daysRow: { gap: 8, paddingVertical: 4 },
  dayCard: {
    width: 72,
    minHeight: 68,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  dayCardActive: {
    backgroundColor: COLORS.primaryDark,
    borderColor: COLORS.primaryDark,
  },
  dayShort: { fontSize: 12, color: COLORS.textMuted, fontWeight: '600' },
  dayNum: { fontSize: 18, fontWeight: '800', color: COLORS.textMain, marginTop: 2 },
  timesGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeBtn: {
    minWidth: '47%',
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  timeBtnBooked: {
    backgroundColor: COLORS.slate100,
    borderColor: COLORS.slate200,
  },
  timeBtnSelected: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryDark,
    borderWidth: 2,
  },
  timeBtnText: { fontSize: 13, fontWeight: '600', color: COLORS.textMain },
  timeTextBooked: { color: COLORS.textMuted, textDecorationLine: 'line-through' },
  stickyFooter: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: { fontSize: 11, color: COLORS.textMuted },
  totalValue: { fontSize: 20, fontWeight: '800', color: COLORS.textMain },
  selectedInfo: { fontSize: 12, fontWeight: '700', color: COLORS.primaryDark },
  continueBtn: {
    minHeight: 46,
    paddingHorizontal: 20,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  disabledBtn: { backgroundColor: '#94A3B8' },
  continueBtnText: { color: COLORS.white, fontSize: 14, fontWeight: '700' },
});
