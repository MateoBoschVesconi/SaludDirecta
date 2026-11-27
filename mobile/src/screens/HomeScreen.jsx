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
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import AiOrientationCard from '../components/AiOrientationCard';
import isotipoImg from '../../assets/isotipo.png';

const LOCATIONS = [
  'Resistencia, Chaco',
  'Corrientes Capital, Corrientes',
  'Barranqueras, Chaco',
];

const FEATURED_SPECIALTIES = [
  { label: 'Kinesiología', icon: 'fitness-outline' },
  { label: 'Nutrición', icon: 'nutrition-outline' },
  { label: 'Psicología', icon: 'happy-outline' },
  { label: 'Fonoaudiología', icon: 'mic-outline' },
  { label: 'Odontología', icon: 'medkit-outline' },
];

export default function HomeScreen({ navigation }) {
  const [query, setQuery] = useState('');
  const [selectedLocation, setSelectedLocation] = useState('');

  const handleSearch = () => {
    navigation.navigate('Buscar', {
      initialQuery: query.trim(),
      initialProfession: '',
      initialLocation: selectedLocation,
      filterNonce: Date.now(),
    });
  };

  const handleQuickProfession = (profession) => {
    navigation.navigate('Buscar', {
      initialQuery: '',
      initialProfession: profession,
      initialLocation: selectedLocation,
      filterNonce: Date.now(),
    });
  };

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        {/* Marca */}
        <View style={styles.brandRow}>
          <Image
            source={isotipoImg}
            style={styles.brandLogoImg}
            resizeMode="contain"
            accessible={false}
          />
          <View>
            <Text style={styles.brandTitle}>
              SALUD<Text style={styles.brandTitleAccent}>DIRECTA</Text>
            </Text>
            <Text style={styles.brandSubtitle}>Atención Particular · Matrículas Verificadas SISA</Text>
          </View>
        </View>

        <Text style={styles.heroTitle}>Encontrá tu profesional particular</Text>
        <Text style={styles.heroSubtitle}>
          Consultas sin coseguros ocultos, honorarios publicados y reserva online al instante.
        </Text>

        {/* Buscador rápido HU6 */}
        <View style={styles.searchCard}>
          <View style={styles.searchInputRow}>
            <Ionicons name="search" size={18} color={COLORS.textMuted} />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Especialidad, profesional o localidad..."
              placeholderTextColor={COLORS.textMuted}
              style={styles.searchInput}
              returnKeyType="search"
              onSubmitEditing={handleSearch}
              accessibilityLabel="Buscar por especialidad o profesional"
            />
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.locationRow}
          >
            <TouchableOpacity
              onPress={() => setSelectedLocation('')}
              style={[
                styles.locChip,
                selectedLocation === '' && styles.locChipActive,
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedLocation === '' }}
            >
              <Text
                style={[
                  styles.locChipText,
                  selectedLocation === '' && styles.locChipTextActive,
                ]}
              >
                Todas las localidades
              </Text>
            </TouchableOpacity>
            {LOCATIONS.map((loc) => {
              const active = selectedLocation === loc;
              return (
                <TouchableOpacity
                  key={loc}
                  onPress={() => setSelectedLocation(active ? '' : loc)}
                  style={[styles.locChip, active && styles.locChipActive]}
                  accessibilityRole="button"
                  accessibilityState={{ selected: active }}
                >
                  <Text style={[styles.locChipText, active && styles.locChipTextActive]}>
                    {loc}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <TouchableOpacity
            onPress={handleSearch}
            style={styles.searchBtn}
            accessibilityRole="button"
          >
            <Ionicons name="search" size={17} color={COLORS.white} />
            <Text style={styles.searchBtnText}>Buscar Profesionales</Text>
          </TouchableOpacity>
        </View>

        {/* Módulo HU7: Orientación Asistida por IA */}
        <AiOrientationCard
          onSelectProfession={(profession) => handleQuickProfession(profession)}
          onSelectProfessional={(proId) =>
            navigation.navigate('ProfessionalDetail', { id: proId })
          }
          onGoToSearch={() => navigation.navigate('Buscar')}
        />

        {/* Especialidades destacadas */}
        <View style={styles.sectionBlock}>
          <Text style={styles.sectionTitle}>Especialidades destacadas</Text>
          <View style={styles.specialtiesGrid}>
            {FEATURED_SPECIALTIES.map((item) => (
              <TouchableOpacity
                key={item.label}
                onPress={() => handleQuickProfession(item.label)}
                style={styles.specialtyChip}
                accessibilityRole="button"
                accessibilityLabel={`Buscar profesionales de ${item.label}`}
              >
                <Ionicons name={item.icon} size={17} color={COLORS.primaryDark} />
                <Text style={styles.specialtyChipText}>{item.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 28,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  brandLogoImg: {
    width: 40,
    height: 40,
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
    letterSpacing: 0.4,
  },
  brandTitleAccent: {
    color: COLORS.primaryDark,
  },
  brandSubtitle: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  heroTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  heroSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 16,
    lineHeight: 20,
  },
  searchCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    marginBottom: 16,
    gap: 10,
  },
  searchInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
    minHeight: 46,
    backgroundColor: COLORS.canvas,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
  },
  locationRow: {
    gap: 8,
    paddingVertical: 2,
  },
  locChip: {
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  locChipActive: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
  },
  locChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMuted,
  },
  locChipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  searchBtn: {
    minHeight: 46,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  searchBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '700',
  },
  sectionBlock: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    letterSpacing: 0.6,
  },
  specialtiesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  specialtyChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
    minHeight: 44,
  },
  specialtyChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
});
