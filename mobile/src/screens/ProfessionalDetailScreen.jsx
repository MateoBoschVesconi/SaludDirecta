import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { getProfessionalById } from '../services/patientServices';

export default function ProfessionalDetailScreen({ route, navigation }) {
  const { id } = route.params || {};
  const [pro, setPro] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState('individual');

  useEffect(() => {
    let isMounted = true;
    getProfessionalById(id).then((found) => {
      if (isMounted) {
        setPro(found);
        setLoading(false);
      }
    });
    return () => {
      isMounted = false;
    };
  }, [id]);

  if (loading) {
    return (
      <View style={styles.centerBox}>
        <Text style={styles.mutedText}>Cargando perfil profesional...</Text>
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

  const accessibilityDetails = [
    pro.hasRampAccessibility && 'Rampa de acceso',
    pro.hasElevator && 'Ascensor',
    pro.hasAdaptedBathroom && 'Baño adaptado',
  ].filter(Boolean);

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Ficha Principal (HU4) */}
        <View style={styles.card}>
          <Text style={styles.proName}>{pro.name}</Text>
          <View
            style={[
              styles.badge,
              pro.isVerified !== false ? styles.badgeVerified : styles.badgePending,
            ]}
          >
            <Ionicons
              name={pro.isVerified !== false ? 'checkmark-circle' : 'time'}
              size={14}
              color={pro.isVerified !== false ? COLORS.successText : COLORS.warningText}
            />
            <Text
              style={[
                styles.badgeText,
                { color: pro.isVerified !== false ? COLORS.successText : COLORS.warningText },
              ]}
            >
              {pro.isVerified !== false ? 'Matrícula Verificada SISA' : 'Verificación Pendiente'} ·{' '}
              {pro.registry} ({pro.jurisdiction})
            </Text>
          </View>

          <Text style={styles.specialty}>{pro.specialty}</Text>
          <View style={styles.iconLine}>
            <Ionicons name="location-outline" size={15} color={COLORS.textMuted} />
            <Text style={styles.addressText}>
              {pro.address}, {pro.location}
            </Text>
          </View>

          <View style={styles.accessBox}>
            <View style={styles.accessHeader}>
              <Ionicons name="accessibility" size={16} color={COLORS.primaryDark} />
              <Text style={styles.accessTitle}>Accesibilidad edilicia</Text>
            </View>
            <Text style={styles.accessText}>
              {accessibilityDetails.length > 0
                ? accessibilityDetails.map((d) => `✓ ${d}`).join('  ·  ')
                : 'Sin condiciones declaradas'}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Sobre el profesional</Text>
          <Text style={styles.description}>{pro.description}</Text>
        </View>

        {/* Honorarios Obligatorios y Paquetes (HU4 + HU5) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Opciones de atención y honorarios</Text>
          <Text style={styles.mutedSmall}>
            Valores finales transparentes para atención particular. Seleccioná una opción:
          </Text>

          {/* Consulta Individual */}
          <TouchableOpacity
            onPress={() => setSelectedPlan('individual')}
            style={[
              styles.planCard,
              selectedPlan === 'individual' && styles.planCardSelected,
            ]}
            accessibilityRole="radio"
            accessibilityState={{ checked: selectedPlan === 'individual' }}
          >
            <View style={{ flex: 1 }}>
              <Text style={styles.planTitle}>Consulta Individual</Text>
              <Text style={styles.planDesc}>Atención presencial en consultorio (1 sesión)</Text>
            </View>
            <Text style={styles.planPrice}>$ {Number(pro.price).toLocaleString('es-AR')}</Text>
          </TouchableOpacity>

          {/* Paquetes */}
          {pro.packages?.map((pkg) => {
            const totalPkgPrice = Math.round(
              pro.price * pkg.sessions * (1 - pkg.discountPercent / 100)
            );
            const perSession = Math.round(totalPkgPrice / pkg.sessions);
            const isSelected = selectedPlan === pkg.id;

            return (
              <TouchableOpacity
                key={pkg.id}
                onPress={() => setSelectedPlan(pkg.id)}
                style={[styles.planCard, isSelected && styles.planCardSelected]}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <View style={{ flex: 1 }}>
                  <View style={styles.pkgTitleRow}>
                    <Text style={styles.planTitle}>{pkg.title}</Text>
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>{pkg.discountPercent}% OFF</Text>
                    </View>
                  </View>
                  <Text style={styles.planDesc}>Incluye {pkg.sessions} sesiones</Text>
                  {pkg.paymentConditions ? (
                    <Text style={styles.pkgCond}>· {pkg.paymentConditions}</Text>
                  ) : null}
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.planPrice}>$ {totalPkgPrice.toLocaleString('es-AR')}</Text>
                  <Text style={styles.perSession}>$ {perSession.toLocaleString('es-AR')} / sesión</Text>
                </View>
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>

      <View style={styles.stickyFooter}>
        <TouchableOpacity
          onPress={() =>
            navigation.navigate('Booking', {
              id: pro.id,
              planId: selectedPlan,
            })
          }
          style={styles.bookBtn}
          accessibilityRole="button"
        >
          <Ionicons name="calendar" size={18} color={COLORS.white} />
          <Text style={styles.bookBtnText}>Continuar con la Reserva</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  mutedText: {
    fontSize: 14,
    color: COLORS.textMuted,
  },
  errorTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  scrollContent: {
    padding: 16,
    gap: 14,
    paddingBottom: 24,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 16,
    gap: 8,
  },
  proName: {
    fontSize: 22,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
    fontSize: 12,
    fontWeight: '700',
  },
  specialty: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.primaryDark,
  },
  iconLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  addressText: {
    fontSize: 13,
    color: COLORS.textMuted,
    flex: 1,
  },
  accessBox: {
    marginTop: 6,
    backgroundColor: COLORS.canvas,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 10,
    padding: 10,
    gap: 4,
  },
  accessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  accessTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  accessText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.successText,
  },
  sectionLabel: {
    marginTop: 6,
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  description: {
    fontSize: 14,
    color: COLORS.textMain,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  mutedSmall: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginBottom: 4,
  },
  planCard: {
    borderWidth: 2,
    borderColor: COLORS.borderSubtle,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 10,
    backgroundColor: COLORS.white,
  },
  planCardSelected: {
    borderColor: COLORS.primaryDark,
    backgroundColor: '#F0F9FF',
  },
  planTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
    flexShrink: 1,
  },
  pkgTitleRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 6,
  },
  discountBadge: {
    backgroundColor: COLORS.successBg,
    borderRadius: 999,
    paddingHorizontal: 7,
    paddingVertical: 2,
  },
  discountBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: COLORS.successText,
  },
  planDesc: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  pkgCond: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  planPrice: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  perSession: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successText,
  },
  stickyFooter: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
  },
  bookBtn: {
    minHeight: 48,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  bookBtnText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '700',
  },
});
