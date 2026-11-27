import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { getNextAvailableSlot, getProfessionalTimeWindows } from '../utils/searchEngine';

export default function ProfessionalCard({
  professional,
  onPressProfile,
  isSelectedForCompare = false,
  onToggleCompare,
  compareDisabled = false,
}) {
  if (!professional) return null;

  const proPrice = Number(professional.price) || 0;
  const packages = Array.isArray(professional.packages) ? professional.packages : [];
  const maxDiscount = packages.reduce(
    (max, pkg) => Math.max(max, Number(pkg.discountPercent) || 0),
    0
  );
  const nextSlot = getNextAvailableSlot(professional);
  const windows = getProfessionalTimeWindows(professional);

  const windowLabels = [];
  if (windows.morning) windowLabels.push('Mañana');
  if (windows.afternoon) windowLabels.push('Tarde');
  if (windows.saturday) windowLabels.push('Sábados');

  const accessibilityTags = [];
  if (professional.hasRampAccessibility) accessibilityTags.push('Rampa');
  if (professional.hasElevator) accessibilityTags.push('Ascensor');
  if (professional.hasAdaptedBathroom) accessibilityTags.push('Baño adaptado');

  const initials = String(professional.name || 'PS')
    .split(' ')
    .filter(Boolean)
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <View
      style={[
        styles.card,
        isSelectedForCompare && styles.cardSelected,
      ]}
      accessibilityRole="summary"
    >
      {/* Cabecera: Avatar + Nombre + Matrícula */}
      <View style={styles.headerRow}>
        <View style={styles.avatar} accessible={false}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        <View style={styles.headerInfo}>
          <Text style={styles.name}>{professional.name}</Text>

          <View
            style={[
              styles.badge,
              professional.isVerified ? styles.badgeVerified : styles.badgePending,
            ]}
          >
            <Ionicons
              name={professional.isVerified ? 'checkmark-circle' : 'time'}
              size={14}
              color={professional.isVerified ? COLORS.successText : COLORS.warningText}
            />
            <Text
              style={[
                styles.badgeText,
                { color: professional.isVerified ? COLORS.successText : COLORS.warningText },
              ]}
            >
              {professional.isVerified ? 'Verificado SISA' : 'Verificación Pendiente'} ·{' '}
              {professional.registry}
            </Text>
          </View>

          <View style={styles.metaRow}>
            <Text style={styles.professionText}>{professional.profession}</Text>
            <Text style={styles.dot}>·</Text>
            <Text style={styles.specialtyText} numberOfLines={1}>
              {professional.specialty}
            </Text>
            {professional.rating ? (
              <>
                <Text style={styles.dot}>·</Text>
                <Ionicons name="star" size={13} color={COLORS.warningBtn} />
                <Text style={styles.ratingText}> {Number(professional.rating).toFixed(1)}</Text>
              </>
            ) : null}
          </View>
        </View>
      </View>

      {/* Ubicación y próximo turno */}
      <View style={styles.detailsBlock}>
        <View style={styles.iconLine}>
          <Ionicons name="location-outline" size={15} color={COLORS.textMuted} />
          <Text style={styles.locationText} numberOfLines={1}>
            {[professional.address, professional.location].filter(Boolean).join(' · ')}
          </Text>
        </View>

        {(nextSlot || windowLabels.length > 0) && (
          <View style={styles.chipsWrap}>
            {nextSlot && (
              <View style={styles.slotChip}>
                <Ionicons name="calendar-outline" size={13} color={COLORS.primaryDark} />
                <Text style={styles.slotChipText}>
                  Próx. turno: {nextSlot.dayLabel} {nextSlot.time}
                </Text>
              </View>
            )}
            {windowLabels.map((lbl) => (
              <View key={lbl} style={styles.windowChip}>
                <Text style={styles.windowChipText}>{lbl}</Text>
              </View>
            ))}
          </View>
        )}

        <View style={styles.chipsWrap}>
          <Ionicons name="accessibility" size={15} color={COLORS.primaryDark} />
          {accessibilityTags.length > 0 ? (
            accessibilityTags.map((tag) => (
              <View key={tag} style={styles.accessChip}>
                <Text style={styles.accessChipText}>{tag}</Text>
              </View>
            ))
          ) : (
            <Text style={styles.mutedSmall}>Sin accesibilidad declarada</Text>
          )}
        </View>
      </View>

      {/* Honorario y Acciones */}
      <View style={styles.footerRow}>
        <View>
          <Text style={styles.priceValue}>$ {proPrice.toLocaleString('es-AR')}</Text>
          <Text style={styles.priceLabel}>Consulta particular</Text>
          {packages.length > 0 && maxDiscount > 0 && (
            <Text style={styles.discountText}>Paquetes hasta {maxDiscount}% OFF</Text>
          )}
        </View>

        <View style={styles.actionsRow}>
          {onToggleCompare && (
            <TouchableOpacity
              onPress={() => onToggleCompare(professional)}
              disabled={compareDisabled && !isSelectedForCompare}
              style={[
                styles.compareBtn,
                isSelectedForCompare && styles.compareBtnSelected,
                compareDisabled && !isSelectedForCompare && styles.compareBtnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityState={{
                selected: isSelectedForCompare,
                disabled: compareDisabled && !isSelectedForCompare,
              }}
              accessibilityLabel={
                isSelectedForCompare
                  ? `Quitar a ${professional.name} de la comparación`
                  : `Comparar a ${professional.name}`
              }
            >
              <Ionicons
                name="swap-horizontal"
                size={15}
                color={
                  isSelectedForCompare
                    ? COLORS.primaryDark
                    : compareDisabled
                    ? COLORS.textMuted
                    : COLORS.textMain
                }
              />
              <Text
                style={[
                  styles.compareBtnText,
                  isSelectedForCompare && { color: COLORS.primaryDark },
                  compareDisabled && !isSelectedForCompare && { color: COLORS.textMuted },
                ]}
              >
                {isSelectedForCompare ? 'Seleccionado' : 'Comparar'}
              </Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity
            onPress={onPressProfile}
            style={styles.profileBtn}
            accessibilityRole="button"
            accessibilityLabel={`Ver perfil y turnos de ${professional.name}`}
          >
            <Text style={styles.profileBtnText}>Ver perfil</Text>
            <Ionicons name="chevron-forward" size={16} color={COLORS.white} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    marginBottom: 12,
  },
  cardSelected: {
    borderColor: COLORS.primaryDark,
    borderWidth: 2,
    backgroundColor: '#F0F9FF',
  },
  headerRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 16,
  },
  headerInfo: {
    flex: 1,
    gap: 4,
  },
  name: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
    borderWidth: 1,
  },
  badgeVerified: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
  },
  badgePending: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    marginTop: 2,
  },
  professionText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  dot: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginHorizontal: 4,
  },
  specialtyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flexShrink: 1,
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  detailsBlock: {
    marginTop: 10,
    gap: 8,
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    fontSize: 12,
    color: COLORS.textMuted,
    flex: 1,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  slotChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  slotChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  windowChip: {
    backgroundColor: COLORS.slate100,
    borderColor: COLORS.borderSubtle,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  windowChipText: {
    fontSize: 11,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  accessChip: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  accessChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: COLORS.successText,
  },
  mutedSmall: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  footerRow: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.slate200,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 10,
  },
  priceValue: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  priceLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  discountText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successText,
    marginTop: 2,
  },
  actionsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compareBtn: {
    minHeight: 44,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.surface,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  compareBtnSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
  },
  compareBtnDisabled: {
    backgroundColor: COLORS.slate100,
    opacity: 0.65,
  },
  compareBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  profileBtn: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  profileBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
