import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { PROFESSIONALS } from '../data/professionalsData';
import { filterAndSortProfessionals, extractSearchFacets } from '../utils/searchEngine';
import ProfessionalCard from '../components/ProfessionalCard';
import CompareModal from '../components/CompareModal';

const PRICE_CAPS = [
  { label: 'Sin tope', value: '' },
  { label: 'Hasta $20.000', value: '20000' },
  { label: 'Hasta $25.000', value: '25000' },
  { label: 'Hasta $30.000', value: '30000' },
];

const AVAILABILITY_OPTIONS = [
  { label: 'Todas', value: 'cualquiera' },
  { label: 'Mañana', value: 'manana' },
  { label: 'Tarde', value: 'tarde' },
  { label: 'Sábados', value: 'sabado' },
];

const SORT_OPTIONS = [
  { label: 'Relevancia', value: 'relevance' },
  { label: 'Menor honorario', value: 'price_asc' },
  { label: 'Mejor calificación', value: 'rating_desc' },
];

function createInitialFilters(params = {}) {
  return {
    query: params.initialQuery || '',
    profession: params.initialProfession || '',
    location: params.initialLocation || '',
    maxPrice: '',
    availability: 'cualquiera',
    ramp: false,
    elevator: false,
    adaptedBathroom: false,
    onlyVerified: false,
    sortBy: 'relevance',
  };
}

export default function SearchScreen({ route, navigation }) {
  const [appliedNonce, setAppliedNonce] = useState(route.params?.filterNonce || 0);
  const [filters, setFilters] = useState(() => createInitialFilters(route.params));
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCompareIds, setSelectedCompareIds] = useState([]);
  const [isCompareOpen, setIsCompareOpen] = useState(false);

  // Sincronizar si el usuario llega desde HomeScreen con nuevos parámetros
  if (route.params?.filterNonce && route.params.filterNonce !== appliedNonce) {
    setAppliedNonce(route.params.filterNonce);
    setFilters(createInitialFilters(route.params));
  }

  const facets = useMemo(() => extractSearchFacets(PROFESSIONALS), []);

  const results = useMemo(
    () => filterAndSortProfessionals(PROFESSIONALS, filters),
    [filters]
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query.trim()) count += 1;
    if (filters.profession) count += 1;
    if (filters.location) count += 1;
    if (filters.maxPrice) count += 1;
    if (filters.availability !== 'cualquiera') count += 1;
    if (filters.ramp) count += 1;
    if (filters.elevator) count += 1;
    if (filters.adaptedBathroom) count += 1;
    if (filters.onlyVerified) count += 1;
    return count;
  }, [filters]);

  const resetFilters = () => {
    setFilters(createInitialFilters({}));
  };

  const selectedComparePros = useMemo(
    () =>
      PROFESSIONALS.filter((pro) =>
        selectedCompareIds.some((id) => String(id) === String(pro.id))
      ),
    [selectedCompareIds]
  );

  const handleToggleCompare = (pro) => {
    const targetId = String(pro.id);
    setSelectedCompareIds((prev) => {
      if (prev.includes(targetId)) {
        return prev.filter((id) => id !== targetId);
      }
      if (prev.length >= 3) return prev;
      return [...prev, targetId];
    });
  };

  const handleRemoveCompare = (proId) => {
    const targetId = String(proId);
    setSelectedCompareIds((prev) => {
      const next = prev.filter((id) => id !== targetId);
      if (next.length < 2) setIsCompareOpen(false);
      return next;
    });
  };

  const updateFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }));

  const renderFilterChip = (label, active, onPress) => (
    <TouchableOpacity
      key={label}
      onPress={onPress}
      style={[styles.chip, active && styles.chipActive]}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
    >
      <Text style={[styles.chipText, active && styles.chipTextActive]}>{label}</Text>
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.topPanel}>
      <View style={styles.searchBarRow}>
        <View style={styles.searchInputWrap}>
          <Ionicons name="search" size={18} color={COLORS.textMuted} />
          <TextInput
            value={filters.query}
            onChangeText={(text) => updateFilter({ query: text })}
            placeholder="Nombre, especialidad o localidad..."
            placeholderTextColor={COLORS.textMuted}
            style={styles.searchInput}
            accessibilityLabel="Buscar profesionales"
          />
          {filters.query.length > 0 && (
            <TouchableOpacity
              onPress={() => updateFilter({ query: '' })}
              accessibilityLabel="Limpiar texto de búsqueda"
            >
              <Ionicons name="close-circle" size={18} color={COLORS.textMuted} />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          onPress={() => setShowFilters((prev) => !prev)}
          style={[styles.filterToggleBtn, showFilters && styles.filterToggleBtnOpen]}
          accessibilityRole="button"
          accessibilityState={{ expanded: showFilters }}
        >
          <Ionicons
            name="options"
            size={18}
            color={showFilters ? COLORS.white : COLORS.primaryDark}
          />
          <Text
            style={[
              styles.filterToggleText,
              showFilters && { color: COLORS.white },
            ]}
          >
            Filtros{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Resumen resultados + SLA < 2s */}
      <View style={styles.statusRow}>
        <Text style={styles.resultsCount}>
          {results.length} {results.length === 1 ? 'profesional disponible' : 'profesionales disponibles'}
        </Text>
        <View style={styles.slaPill}>
          <Ionicons name="flash" size={12} color={COLORS.successText} />
          <Text style={styles.slaText}>SLA &lt; 2s</Text>
        </View>
      </View>

      {/* Panel colapsable de filtros combinables */}
      {showFilters && (
        <View style={styles.filtersBox}>
          <View style={styles.filtersHeader}>
            <Text style={styles.filtersTitle}>Filtros combinables (HU6)</Text>
            {activeFilterCount > 0 && (
              <TouchableOpacity onPress={resetFilters} accessibilityRole="button">
                <Text style={styles.resetText}>Limpiar todos</Text>
              </TouchableOpacity>
            )}
          </View>

          <Text style={styles.groupLabel}>Profesión</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {renderFilterChip('Todas', filters.profession === '', () =>
              updateFilter({ profession: '' })
            )}
            {facets.professions.map((prof) =>
              renderFilterChip(prof, filters.profession === prof, () =>
                updateFilter({ profession: filters.profession === prof ? '' : prof })
              )
            )}
          </ScrollView>

          <Text style={styles.groupLabel}>Localidad</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
            {renderFilterChip('Todas', filters.location === '', () =>
              updateFilter({ location: '' })
            )}
            {facets.locations.map((loc) =>
              renderFilterChip(loc, filters.location === loc, () =>
                updateFilter({ location: filters.location === loc ? '' : loc })
              )
            )}
          </ScrollView>

          <Text style={styles.groupLabel}>Tope de honorarios ($ ARS)</Text>
          <View style={styles.chipsWrap}>
            {PRICE_CAPS.map((cap) =>
              renderFilterChip(cap.label, filters.maxPrice === cap.value, () =>
                updateFilter({ maxPrice: cap.value })
              )
            )}
          </View>

          <Text style={styles.groupLabel}>Disponibilidad horaria</Text>
          <View style={styles.chipsWrap}>
            {AVAILABILITY_OPTIONS.map((opt) =>
              renderFilterChip(opt.label, filters.availability === opt.value, () =>
                updateFilter({ availability: opt.value })
              )
            )}
          </View>

          <Text style={styles.groupLabel}>Accesibilidad edilicia y verificación</Text>
          <View style={styles.chipsWrap}>
            {renderFilterChip('Rampa', filters.ramp, () =>
              updateFilter({ ramp: !filters.ramp })
            )}
            {renderFilterChip('Ascensor', filters.elevator, () =>
              updateFilter({ elevator: !filters.elevator })
            )}
            {renderFilterChip('Baño adaptado', filters.adaptedBathroom, () =>
              updateFilter({ adaptedBathroom: !filters.adaptedBathroom })
            )}
            {renderFilterChip('Solo verificados SISA', filters.onlyVerified, () =>
              updateFilter({ onlyVerified: !filters.onlyVerified })
            )}
          </View>

          <Text style={styles.groupLabel}>Ordenar resultados</Text>
          <View style={styles.chipsWrap}>
            {SORT_OPTIONS.map((opt) =>
              renderFilterChip(opt.label, filters.sortBy === opt.value, () =>
                updateFilter({ sortBy: opt.value })
              )
            )}
          </View>
        </View>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      <FlatList
        data={results}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={[
          styles.listContent,
          selectedComparePros.length > 0 && { paddingBottom: 95 },
        ]}
        renderItem={({ item }) => (
          <ProfessionalCard
            professional={item}
            onPressProfile={() => navigation.navigate('ProfessionalDetail', { id: item.id })}
            isSelectedForCompare={selectedCompareIds.includes(String(item.id))}
            onToggleCompare={handleToggleCompare}
            compareDisabled={selectedCompareIds.length >= 3}
          />
        )}
        ListEmptyComponent={
          <View style={styles.emptyCard}>
            <Ionicons name="options-outline" size={38} color={COLORS.textMuted} />
            <Text style={styles.emptyTitle}>No encontramos profesionales con esa combinación</Text>
            <Text style={styles.emptyBody}>
              Intentá ampliar el tope de honorarios o quitar alguno de los filtros activos.
            </Text>
            <TouchableOpacity onPress={resetFilters} style={styles.emptyResetBtn}>
              <Text style={styles.emptyResetText}>Limpiar filtros</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {/* Barra inferior de comparación */}
      {selectedComparePros.length > 0 && (
        <View style={styles.compareBar}>
          <View style={{ flex: 1 }}>
            <Text style={styles.compareBarTitle}>
              Comparar ({selectedComparePros.length}/3)
            </Text>
            <Text style={styles.compareBarNames} numberOfLines={1}>
              {selectedComparePros.map((p) => p.name).join(' · ')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setSelectedCompareIds([])}
            style={styles.clearCompareBtn}
            accessibilityRole="button"
          >
            <Text style={styles.clearCompareText}>Limpiar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            disabled={selectedComparePros.length < 2}
            onPress={() => setIsCompareOpen(true)}
            style={[
              styles.openCompareBtn,
              selectedComparePros.length < 2 && styles.openCompareDisabled,
            ]}
            accessibilityRole="button"
          >
            <Text style={styles.openCompareText}>Comparar</Text>
          </TouchableOpacity>
        </View>
      )}

      <CompareModal
        professionals={selectedComparePros}
        isOpen={isCompareOpen}
        onClose={() => setIsCompareOpen(false)}
        onRemove={handleRemoveCompare}
        onSelectProfessional={(proId) => {
          setIsCompareOpen(false);
          navigation.navigate('ProfessionalDetail', { id: proId });
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: COLORS.canvas,
  },
  listContent: {
    padding: 16,
    paddingBottom: 24,
  },
  topPanel: {
    marginBottom: 12,
    gap: 10,
  },
  searchBarRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  searchInputWrap: {
    flex: 1,
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    paddingHorizontal: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textMain,
  },
  filterToggleBtn: {
    minHeight: 46,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  filterToggleBtnOpen: {
    backgroundColor: COLORS.primaryDark,
  },
  filterToggleText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultsCount: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  slaPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  slaText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.successText,
  },
  filtersBox: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    gap: 8,
  },
  filtersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  filtersTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  resetText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  groupLabel: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.textMuted,
    marginTop: 4,
  },
  chipsScroll: {
    gap: 6,
    paddingVertical: 2,
  },
  chipsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  chip: {
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.canvas,
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  chipActive: {
    borderColor: COLORS.primaryDark,
    backgroundColor: COLORS.primaryLight,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  chipTextActive: {
    color: COLORS.primaryDark,
    fontWeight: '700',
  },
  emptyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    color: COLORS.textMuted,
    textAlign: 'center',
  },
  emptyResetBtn: {
    marginTop: 6,
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
  },
  emptyResetText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 13,
  },
  compareBar: {
    position: 'absolute',
    left: 12,
    right: 12,
    bottom: 12,
    backgroundColor: COLORS.white,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: COLORS.primaryDark,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    elevation: 5,
  },
  compareBarTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: COLORS.primaryDark,
  },
  compareBarNames: {
    fontSize: 12,
    color: COLORS.textMain,
  },
  clearCompareBtn: {
    minHeight: 40,
    paddingHorizontal: 10,
    justifyContent: 'center',
  },
  clearCompareText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  openCompareBtn: {
    minHeight: 42,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: COLORS.primaryDark,
    justifyContent: 'center',
  },
  openCompareDisabled: {
    backgroundColor: '#94A3B8',
  },
  openCompareText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
});
