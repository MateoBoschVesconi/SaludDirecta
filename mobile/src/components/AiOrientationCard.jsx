import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Switch,
  Linking,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import { orientarPaciente } from '../services/patientServices';

const QUICK_EXAMPLES = [
  'Tengo dolor lumbar y contractura al trabajar',
  'Quiero mejorar mi alimentación y bajar colesterol',
  'Siento ansiedad, estrés y me cuesta dormir',
];

export default function AiOrientationCard({
  onSelectProfession,
  onSelectProfessional,
  onGoToSearch,
}) {
  const [query, setQuery] = useState('');
  const [simulateUnavailable, setSimulateUnavailable] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [validationError, setValidationError] = useState('');
  const [result, setResult] = useState(null);

  const handleAnalyze = async () => {
    try {
      setIsLoading(true);
      setValidationError('');
      const res = await orientarPaciente(query, { simulateUnavailable });
      setResult(res);
    } catch (err) {
      setResult(null);
      setValidationError(err.message || 'No pudimos procesar tu consulta.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setQuery('');
    setResult(null);
    setValidationError('');
  };

  const handleCallEmergency = (href) => {
    Linking.openURL(href).catch(() => {});
  };

  return (
    <View style={styles.container}>
      <View style={styles.pillBadge}>
        <Ionicons name="sparkles" size={14} color={COLORS.primaryDark} />
        <Text style={styles.pillBadgeText}>Orientación Asistida por IA (HU7)</Text>
      </View>

      <Text style={styles.title}>¿No sabés qué profesional consultar?</Text>
      <Text style={styles.subtitle}>
        Describí en tus propias palabras qué necesitás para recibir sugerencias de especialidades.
      </Text>

      {/* Banner obligatorio de no diagnóstico (Criterio 2 / Ley 25.326) */}
      <View style={styles.disclaimerBanner} accessible>
        <Ionicons name="shield-checkmark" size={18} color={COLORS.warningText} />
        <Text style={styles.disclaimerText}>
          <Text style={styles.bold}>No constituye un diagnóstico médico. </Text>
          Solo orienta tu búsqueda. Ante emergencias llamá al <Text style={styles.bold}>107 (SAME)</Text>. No se almacena historia clínica (Ley 25.326).
        </Text>
      </View>

      {/* Campo de texto en lenguaje natural */}
      <View style={styles.labelRow}>
        <Text style={styles.inputLabel}>Tu necesidad o consulta</Text>
        <Text style={styles.charCounter}>{query.length}/400</Text>
      </View>

      <TextInput
        value={query}
        onChangeText={(text) => {
          setQuery(text);
          if (validationError) setValidationError('');
        }}
        placeholder="Ej: Tengo dolor de espalda desde hace unos días..."
        placeholderTextColor={COLORS.textMuted}
        multiline
        maxLength={400}
        numberOfLines={3}
        style={styles.textArea}
        accessibilityLabel="Descripción de necesidad en lenguaje natural"
      />

      {/* Ejemplos rápidos */}
      <View style={styles.examplesWrap}>
        {QUICK_EXAMPLES.map((ex) => (
          <TouchableOpacity
            key={ex}
            onPress={() => {
              setQuery(ex);
              setValidationError('');
              setResult(null);
            }}
            style={styles.exampleChip}
            accessibilityRole="button"
            accessibilityLabel={`Usar ejemplo: ${ex}`}
          >
            <Text style={styles.exampleChipText}>“{ex}”</Text>
          </TouchableOpacity>
        ))}
      </View>

      {validationError ? (
        <View style={styles.errorBox} accessibilityLiveRegion="polite">
          <Ionicons name="alert-circle" size={16} color={COLORS.errorText} />
          <Text style={styles.errorText}>{validationError}</Text>
        </View>
      ) : null}

      {/* Switch de prueba de resiliencia (Criterio 4) */}
      <View style={styles.switchRow}>
        <Text style={styles.switchLabel}>Simular indisponibilidad de IA (prueba de resiliencia)</Text>
        <Switch
          value={simulateUnavailable}
          onValueChange={setSimulateUnavailable}
          trackColor={{ false: COLORS.borderSubtle, true: COLORS.primaryBorder }}
          thumbColor={simulateUnavailable ? COLORS.primaryDark : COLORS.white}
          accessibilityLabel="Simular indisponibilidad del servicio de IA"
        />
      </View>

      {/* Botones */}
      <View style={styles.actionsRow}>
        {(query.trim().length > 0 || result) && (
          <TouchableOpacity
            onPress={handleClear}
            style={styles.secondaryBtn}
            accessibilityRole="button"
            accessibilityLabel="Limpiar orientación"
          >
            <Text style={styles.secondaryBtnText}>Limpiar</Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          onPress={handleAnalyze}
          disabled={!query.trim() || isLoading}
          style={[
            styles.primaryBtn,
            (!query.trim() || isLoading) && styles.disabledBtn,
          ]}
          accessibilityRole="button"
          accessibilityState={{ disabled: !query.trim() || isLoading }}
        >
          <Ionicons name="sparkles" size={16} color={COLORS.white} />
          <Text style={styles.primaryBtnText}>
            {isLoading ? 'Analizando...' : 'Orientar mi búsqueda'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Estado EMERGENCIA (Criterio 3) */}
      {result?.status === 'emergency' && (
        <View style={styles.emergencyBox} accessibilityLiveRegion="assertive">
          <View style={styles.emergencyHeader}>
            <Ionicons name="warning" size={22} color={COLORS.errorText} />
            <Text style={styles.emergencyTitle}>
              Derivación Prioritaria a Emergencias — No esperes un turno programado
            </Text>
          </View>
          <Text style={styles.emergencyBody}>
            Tu mensaje describe señales que requieren atención de guardia o contención inmediata. Comunicate ahora con:
          </Text>
          <View style={styles.emergencyContacts}>
            {result.emergencyContacts?.map((c) => (
              <TouchableOpacity
                key={c.number}
                onPress={() => handleCallEmergency(c.href)}
                style={styles.emergencyCallBtn}
                accessibilityRole="button"
                accessibilityLabel={`Llamar a ${c.label} al ${c.number}`}
              >
                <Ionicons name="call" size={18} color={COLORS.white} />
                <Text style={styles.emergencyCallLabel}>{c.label}</Text>
                <Text style={styles.emergencyCallNumber}>{c.number}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Estado OK: Sugerencias (Criterio 1 + Criterio 2) */}
      {result?.status === 'ok' && (
        <View style={styles.resultsBlock} accessibilityLiveRegion="polite">
          <View style={styles.inlineWarning}>
            <Ionicons name="information-circle" size={15} color={COLORS.warningText} />
            <Text style={styles.inlineWarningText}>
              Orientación informativa — No constituye un diagnóstico médico
            </Text>
          </View>

          {result.suggestions.map((item) => (
            <View key={item.profession} style={styles.suggestionCard}>
              <View style={styles.suggestionTop}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.suggestionTitle}>{item.profession}</Text>
                  <Text style={styles.suggestionFocus}>{item.specialtyFocus}</Text>
                </View>
                <View style={styles.affinityPill}>
                  <Text style={styles.affinityPillText}>{item.affinityLabel}</Text>
                </View>
              </View>

              <Text style={styles.suggestionReason}>{item.reason}</Text>

              {item.professionals?.map((pro) => (
                <View key={pro.id} style={styles.proMiniCard}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.proMiniName}>{pro.name}</Text>
                    <Text style={styles.proMiniMeta}>
                      {pro.isVerified ? '✓ Verificado SISA' : 'Verificación Pendiente'} ·{' '}
                      {pro.location} · $ {Number(pro.price).toLocaleString('es-AR')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => onSelectProfessional?.(pro.id)}
                    style={styles.miniProfileBtn}
                    accessibilityRole="button"
                    accessibilityLabel={`Ver perfil de ${pro.name}`}
                  >
                    <Text style={styles.miniProfileBtnText}>Ver perfil</Text>
                  </TouchableOpacity>
                </View>
              ))}

              <TouchableOpacity
                onPress={() => onSelectProfession?.(item.profession)}
                style={styles.allInProfBtn}
                accessibilityRole="button"
              >
                <Text style={styles.allInProfText}>
                  Ver todos en {item.profession} con filtros
                </Text>
                <Ionicons name="arrow-forward" size={14} color={COLORS.primaryDark} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      {/* Estado INDISPONIBLE (Criterio 4) */}
      {result?.status === 'unavailable' && (
        <View style={styles.unavailableBox} accessibilityLiveRegion="polite">
          <Text style={styles.unavailableTitle}>Orientación temporalmente no disponible</Text>
          <Text style={styles.unavailableText}>{result.error}</Text>
          <TouchableOpacity
            onPress={onGoToSearch}
            style={styles.primaryBtn}
            accessibilityRole="button"
          >
            <Ionicons name="options" size={16} color={COLORS.white} />
            <Text style={styles.primaryBtnText}>Usar buscador con filtros combinables</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Estado SIN COINCIDENCIA */}
      {result?.status === 'no_match' && (
        <View style={styles.noMatchBox}>
          <Text style={styles.noMatchTitle}>
            No pudimos identificar una única especialidad con certeza.
          </Text>
          <Text style={styles.noMatchText}>
            Podés ampliar los detalles o buscar directamente por profesión, localidad y honorarios en el buscador combinable.
          </Text>
          <TouchableOpacity
            onPress={onGoToSearch}
            style={styles.allInProfBtn}
            accessibilityRole="button"
          >
            <Text style={styles.allInProfText}>Ir al buscador de profesionales</Text>
            <Ionicons name="arrow-forward" size={14} color={COLORS.primaryDark} />
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F0F9FF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.primaryBorder,
    padding: 16,
    marginBottom: 16,
  },
  pillBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 5,
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    marginBottom: 8,
  },
  pillBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.textMain,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 4,
    marginBottom: 10,
    lineHeight: 18,
  },
  disclaimerBanner: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginBottom: 12,
  },
  disclaimerText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.warningText,
    lineHeight: 17,
  },
  bold: {
    fontWeight: '700',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
    textTransform: 'uppercase',
  },
  charCounter: {
    fontSize: 11,
    color: COLORS.textMuted,
  },
  textArea: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    padding: 12,
    minHeight: 84,
    fontSize: 14,
    color: COLORS.textMain,
    textAlignVertical: 'top',
  },
  examplesWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 10,
  },
  exampleChip: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  exampleChipText: {
    fontSize: 11,
    color: COLORS.textMain,
    fontWeight: '500',
  },
  errorBox: {
    marginTop: 10,
    backgroundColor: COLORS.errorBg,
    borderColor: COLORS.errorBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    color: COLORS.errorText,
    fontWeight: '600',
  },
  switchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 12,
    gap: 8,
  },
  switchLabel: {
    flex: 1,
    fontSize: 12,
    color: COLORS.textMuted,
  },
  actionsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 8,
    marginTop: 12,
  },
  primaryBtn: {
    flex: 1,
    minHeight: 46,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  disabledBtn: {
    backgroundColor: '#94A3B8',
  },
  primaryBtnText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  secondaryBtn: {
    minHeight: 46,
    paddingHorizontal: 14,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  secondaryBtnText: {
    color: COLORS.textMain,
    fontSize: 13,
    fontWeight: '600',
  },
  emergencyBox: {
    marginTop: 14,
    backgroundColor: COLORS.errorBg,
    borderWidth: 2,
    borderColor: COLORS.errorBtn,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  emergencyHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  emergencyTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.errorText,
  },
  emergencyBody: {
    fontSize: 13,
    color: COLORS.errorText,
    lineHeight: 18,
  },
  emergencyContacts: {
    gap: 8,
  },
  emergencyCallBtn: {
    minHeight: 48,
    backgroundColor: COLORS.errorBtn,
    borderRadius: 10,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  emergencyCallLabel: {
    flex: 1,
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  emergencyCallNumber: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
  },
  resultsBlock: {
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    gap: 10,
  },
  inlineWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  inlineWarningText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.warningText,
    flex: 1,
  },
  suggestionCard: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 12,
    gap: 8,
  },
  suggestionTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  suggestionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  suggestionFocus: {
    fontSize: 12,
    color: COLORS.textMuted,
  },
  affinityPill: {
    backgroundColor: COLORS.primaryLight,
    borderColor: COLORS.primaryBorder,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  affinityPillText: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  suggestionReason: {
    fontSize: 12,
    color: COLORS.textMain,
    backgroundColor: COLORS.canvas,
    borderRadius: 8,
    padding: 8,
    lineHeight: 17,
  },
  proMiniCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.slate200,
    borderRadius: 8,
    padding: 8,
  },
  proMiniName: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  proMiniMeta: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 2,
  },
  miniProfileBtn: {
    minHeight: 40,
    paddingHorizontal: 12,
    backgroundColor: COLORS.primaryDark,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  miniProfileBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.white,
  },
  allInProfBtn: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: COLORS.primaryLight,
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  allInProfText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  unavailableBox: {
    marginTop: 14,
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  unavailableTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.warningText,
  },
  unavailableText: {
    fontSize: 12,
    color: COLORS.warningText,
    lineHeight: 17,
  },
  noMatchBox: {
    marginTop: 14,
    backgroundColor: COLORS.white,
    borderColor: COLORS.borderSubtle,
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    gap: 8,
  },
  noMatchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  noMatchText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
});
