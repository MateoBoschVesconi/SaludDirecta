import React from 'react';
import {
  Modal,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { getNextAvailableSlot, getProfessionalTimeWindows } from '../utils/searchEngine';

export default function CompareModal({
  professionals = [],
  isOpen,
  onClose,
  onRemove,
  onSelectProfessional,
}) {
  if (!isOpen || !professionals || professionals.length === 0) {
    return null;
  }

  const lowestPrice = Math.min(...professionals.map((p) => Number(p.price) || 0));

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons name="swap-horizontal" size={20} color={COLORS.primaryDark} />
            <Text style={styles.headerTitle}>
              Comparativa ({professionals.length})
            </Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerrar comparativa"
          >
            <Ionicons name="close" size={22} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>

        <ScrollView horizontal contentContainerStyle={styles.horizontalScroll}>
          {professionals.map((pro) => {
            const price = Number(pro.price) || 0;
            const isLowest = professionals.length > 1 && price === lowestPrice;
            const packages = Array.isArray(pro.packages) ? pro.packages : [];
            const maxDiscount = packages.reduce(
              (m, p) => Math.max(m, Number(p.discountPercent) || 0),
              0
            );
            const nextSlot = getNextAvailableSlot(pro);
            const windows = getProfessionalTimeWindows(pro);
            const windowText =
              [
                windows.morning && 'Mañana',
                windows.afternoon && 'Tarde',
                windows.saturday && 'Sábados',
              ]
                .filter(Boolean)
                .join(' · ') || 'Consultar';

            return (
              <View key={pro.id} style={styles.columnCard}>
                <View style={styles.colHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.colName}>{pro.name}</Text>
                    <Text style={styles.colProfession}>{pro.profession}</Text>
                    <Text style={styles.colSpecialty}>{pro.specialty}</Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onRemove?.(pro.id)}
                    style={styles.removeBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Quitar a ${pro.name} de la comparación`}
                  >
                    <Ionicons name="close" size={18} color={COLORS.errorBtn} />
                  </TouchableOpacity>
                </View>

                <View style={styles.rowBlock}>
                  <Text style={styles.rowLabel}>Verificación SISA / REFEPS</Text>
                  <Text
                    style={[
                      styles.rowValue,
                      { color: pro.isVerified ? COLORS.successText : COLORS.warningText },
                    ]}
                  >
                    {pro.isVerified ? 'Verificado' : 'Pendiente'} · {pro.registry} ({pro.jurisdiction})
                  </Text>
                </View>

                <View style={styles.rowBlock}>
                  <Text style={styles.rowLabel}>Honorario particular</Text>
                  <Text style={styles.priceBig}>$ {price.toLocaleString('es-AR')}</Text>
                  {isLowest && (
                    <View style={styles.lowestChip}>
                      <Text style={styles.lowestChipText}>Menor honorario</Text>
                    </View>
                  )}
                </View>

                <View style={styles.rowBlock}>
                  <Text style={styles.rowLabel}>Paquetes de tratamiento</Text>
                  <Text style={styles.rowValue}>
                    {packages.length > 0
                      ? `${packages.length} plan(es) · Hasta ${maxDiscount}% OFF`
                      : 'Solo consulta individual'}
                  </Text>
                </View>

                <View style={styles.rowBlock}>
                  <Text style={styles.rowLabel}>Ubicación</Text>
                  <Text style={styles.rowValue}>{pro.location}</Text>
                  <Text style={styles.rowSub}>{pro.address}</Text>
                </View>

                <View style={styles.rowBlock}>
                  <Text style={styles.rowLabel}>Accesibilidad edilicia</Text>
                  <Text style={styles.rowValue}>Rampa: {pro.hasRampAccessibility ? 'Sí' : 'No informado'}</Text>
                  <Text style={styles.rowValue}>Ascensor: {pro.hasElevator ? 'Sí' : 'No informado'}</Text>
                  <Text style={styles.rowValue}>Baño adaptado: {pro.hasAdaptedBathroom ? 'Sí' : 'No informado'}</Text>
                </View>

                <View style={styles.rowBlock}>
                  <Text style={styles.rowLabel}>Disponibilidad</Text>
                  <Text style={styles.rowValue}>
                    {nextSlot ? `${nextSlot.dayLabel} ${nextSlot.time}` : 'Consultar agenda'}
                  </Text>
                  <Text style={styles.rowSub}>
                    {windowText} · Sesión {Number(pro.sessionDurationMinutes) || 45} min
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => onSelectProfessional?.(pro.id)}
                  style={styles.selectBtn}
                  accessibilityRole="button"
                >
                  <Text style={styles.selectBtnText}>Ver perfil y reservar</Text>
                  <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
                </TouchableOpacity>
              </View>
            );
          })}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderSubtle,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  horizontalScroll: {
    padding: 16,
    gap: 14,
  },
  columnCard: {
    width: 265,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    gap: 10,
  },
  colHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate200,
  },
  colName: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  colProfession: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  colSpecialty: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  removeBtn: {
    minWidth: 36,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowBlock: {
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.slate100,
  },
  rowLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginBottom: 2,
  },
  rowValue: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  rowSub: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  priceBig: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  lowestChip: {
    alignSelf: 'flex-start',
    marginTop: 4,
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 999,
  },
  lowestChipText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successText,
  },
  selectBtn: {
    minHeight: 46,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 'auto',
  },
  selectBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
});
