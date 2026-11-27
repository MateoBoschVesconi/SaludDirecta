import React from 'react';
import {
  Modal,
  View,
  Text,
  Image,
  ScrollView,
  TouchableOpacity,
  Share,
  StyleSheet,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme/colors';
import isotipoImg from '../../assets/isotipo.png';

export default function ReceiptModal({ receipt, isOpen, onClose }) {
  if (!isOpen || !receipt) {
    return null;
  }

  const handleShare = async () => {
    const summary = [
      'SALUD DIRECTA — COMPROBANTE OFICIAL DE PAGO',
      `Transacción Mercado Pago: ${receipt.paymentId}`,
      `Fecha emisión: ${new Date(receipt.paidAt).toLocaleString('es-AR')}`,
      `Profesional: ${receipt.professional?.name} (${receipt.professional?.registry})`,
      `Turno: ${receipt.appointment?.date} · ${receipt.appointment?.time}`,
      `Modalidad: ${receipt.paymentMode === 'sena' ? 'Seña 30%' : 'Pago Total 100%'}`,
      `Abonado en línea: $ ${Number(receipt.amountPaid || 0).toLocaleString('es-AR')}`,
      receipt.balanceDue > 0
        ? `Saldo en consultorio: $ ${Number(receipt.balanceDue).toLocaleString('es-AR')}`
        : 'Saldo pendiente: $ 0',
      '',
      'Sin datos clínicos ni diagnósticos (Ley 25.326).',
    ].join('\n');

    await Share.share({ message: summary }).catch(() => {});
  };

  return (
    <Modal visible={isOpen} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Image
              source={isotipoImg}
              style={styles.headerLogo}
              resizeMode="contain"
              accessible={false}
            />
            <Text style={styles.headerTitle}>Comprobante Oficial · Mercado Pago</Text>
          </View>
          <TouchableOpacity
            onPress={onClose}
            style={styles.closeBtn}
            accessibilityRole="button"
            accessibilityLabel="Cerrar comprobante"
          >
            <Ionicons name="close" size={22} color={COLORS.textMain} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.body}>
          <View style={styles.approvedBanner}>
            <Ionicons name="checkmark-circle" size={22} color={COLORS.successText} />
            <View style={{ flex: 1 }}>
              <Text style={styles.approvedTitle}>Pago Acreditado Exitosamente</Text>
              <Text style={styles.approvedId}>ID: {receipt.paymentId}</Text>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Detalle del Turno</Text>
            <Text style={styles.planTitle}>{receipt.appointment?.planTitle}</Text>
            <Text style={styles.line}>
              Profesional: <Text style={styles.bold}>{receipt.professional?.name}</Text> (
              {receipt.professional?.registry})
            </Text>
            <Text style={styles.line}>
              Cita programada: <Text style={styles.bold}>{receipt.appointment?.date} · {receipt.appointment?.time}</Text>
            </Text>
            <Text style={styles.line}>
              Titular pagador: <Text style={styles.bold}>{receipt.payer?.name}</Text>
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionHeading}>Liquidación</Text>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Total prestación:</Text>
              <Text style={styles.feeVal}>$ {Number(receipt.totalAmount || 0).toLocaleString('es-AR')}</Text>
            </View>
            <View style={styles.feeRow}>
              <Text style={styles.feeLabel}>Modalidad:</Text>
              <Text style={styles.feeVal}>
                {receipt.paymentMode === 'sena' ? 'Seña (30%)' : 'Pago Total (100%)'}
              </Text>
            </View>
            <View style={[styles.feeRow, styles.totalBorder]}>
              <Text style={styles.totalLabel}>Total abonado en línea:</Text>
              <Text style={styles.totalAmount}>
                $ {Number(receipt.amountPaid || 0).toLocaleString('es-AR')}
              </Text>
            </View>
            {receipt.balanceDue > 0 && (
              <View style={styles.balanceBox}>
                <Text style={styles.balanceText}>
                  Saldo a abonar en consultorio: $ {Number(receipt.balanceDue).toLocaleString('es-AR')}
                </Text>
              </View>
            )}
          </View>

          <View style={styles.policyBox}>
            <Text style={styles.policyTitle}>Política de Cancelación y Reintegro (HU11)</Text>
            <Text style={styles.policyText}>{receipt.cancellationPolicy}</Text>
            <Text style={styles.privacyNote}>
              Este comprobante no contiene diagnósticos ni historia clínica (Ley 25.326).
            </Text>
          </View>
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            onPress={handleShare}
            style={styles.shareBtn}
            accessibilityRole="button"
          >
            <Ionicons name="share-social" size={18} color={COLORS.primaryDark} />
            <Text style={styles.shareBtnText}>Compartir Comprobante</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={onClose}
            style={styles.doneBtn}
            accessibilityRole="button"
          >
            <Text style={styles.doneBtnText}>Entendido</Text>
          </TouchableOpacity>
        </View>
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
  headerLogo: {
    width: 24,
    height: 24,
  },
  headerTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  closeBtn: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: 16,
    gap: 14,
  },
  approvedBanner: {
    backgroundColor: COLORS.successBg,
    borderColor: COLORS.successBorder,
    borderWidth: 1,
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  approvedTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: COLORS.successText,
  },
  approvedId: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.successText,
    marginTop: 2,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 14,
    gap: 6,
  },
  sectionHeading: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    color: COLORS.textMuted,
  },
  planTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  line: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  bold: {
    fontWeight: '700',
    color: COLORS.textMain,
  },
  feeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  feeLabel: {
    fontSize: 13,
    color: COLORS.textMuted,
  },
  feeVal: {
    fontSize: 13,
    fontWeight: '600',
    color: COLORS.textMain,
  },
  totalBorder: {
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    marginTop: 6,
    paddingTop: 10,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.successText,
  },
  balanceBox: {
    backgroundColor: COLORS.warningBg,
    borderColor: COLORS.warningBorder,
    borderWidth: 1,
    borderRadius: 8,
    padding: 8,
    marginTop: 6,
  },
  balanceText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.warningText,
  },
  policyBox: {
    backgroundColor: COLORS.slate100,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    padding: 12,
    gap: 6,
  },
  policyTitle: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMain,
  },
  policyText: {
    fontSize: 12,
    color: COLORS.textMuted,
    lineHeight: 17,
  },
  privacyNote: {
    fontSize: 11,
    color: COLORS.textMuted,
    marginTop: 4,
    fontStyle: 'italic',
  },
  footer: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderSubtle,
    flexDirection: 'row',
    gap: 10,
  },
  shareBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: COLORS.borderSubtle,
    backgroundColor: COLORS.white,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  shareBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primaryDark,
  },
  doneBtn: {
    flex: 1,
    minHeight: 46,
    borderRadius: 10,
    backgroundColor: COLORS.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.white,
  },
});
