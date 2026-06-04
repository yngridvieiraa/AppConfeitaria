// src/components/UI.js
import React from 'react';
import { View, Text, TextInput, Pressable, StyleSheet } from 'react-native';
import { number } from '../utilitarios/helpers'; 

export function Section({ eyebrow, title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function SummaryCard({ label, value }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

export function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

export function Input({ label, value, onChangeText, keyboardType = "default" }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        placeholderTextColor="#8a8178"
      />
    </View>
  );
}

export function OptionGroup({ label, options, value, onChange, emptyText }) {
  const normalizedOptions = options.map((option) =>
    typeof option === "string" ? { label: option, value: option } : option,
  );

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {!normalizedOptions.length ? (
        <Text style={styles.emptyInline}>{emptyText || "Nenhuma opcao disponivel"}</Text>
      ) : (
        <View style={styles.optionWrap}>
          {normalizedOptions.map((option) => (
            <Pressable
              key={option.value}
              onPress={() => onChange(option.value)}
              style={[styles.option, value === option.value && styles.optionActive]}
            >
              <Text style={[styles.optionText, value === option.value && styles.optionTextActive]}>
                {option.label}
              </Text>
            </Pressable>
          ))}
        </View>
      )}
    </View>
  );
}

export function Badge({ ok, text }) {
  return (
    <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeWarn]}>
      <Text style={[styles.badgeText, ok ? styles.badgeTextOk : styles.badgeTextWarn]}>{text}</Text>
    </View>
  );
}

export function MissingList({ check }) {
  if (check.ok) return null;
  return (
    <View style={styles.warningBox}>
      {check.missing.map((item, index) => (
        <Text style={styles.warningText} key={`${item.name}-${index}`}>
          Falta {number(item.missing)} {item.unit} de {item.name}
        </Text>
      ))}
    </View>
  );
}

export function ListEmpty({ visible, text }) {
  if (!visible) return null;
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Nenhum registro encontrado.</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

export function PrimaryButton({ label, onPress, disabled }) {
  return (
    <Pressable onPress={disabled ? undefined : onPress} style={[styles.button, styles.primaryButton, disabled && styles.buttonDisabled]}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, styles.secondaryButton]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

export function DangerButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, styles.dangerButton]}>
      <Text style={styles.dangerButtonText}>{label}</Text>
    </Pressable>
  );
}

export function SmallButton({ label, onPress, variant }) {
  return (
    <Pressable onPress={onPress} style={[styles.smallButton, variant === "muted" && styles.smallButtonMuted]}>
      <Text style={[styles.smallButtonText, variant === "muted" && styles.smallButtonMutedText]}>{label}</Text>
    </Pressable>
  );
}

// Estilos específicos apenas para os componentes visuais
const styles = StyleSheet.create({
  section: { gap: 10 },
  sectionTitle: { color: "#262626",fontSize: 22, fontWeight: "900" },
  eyebrow: { color: "#9d3d00", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  summaryCard: { flex: 1, backgroundColor: "#ffffff", borderColor: "#ded7ce", borderWidth: 1, borderRadius: 8, padding: 12 },
  summaryLabel: { color: "#6f6a63", fontSize: 12, fontWeight: "700" },
  summaryValue: { color: "#303236", fontSize: 24, fontWeight: "900", marginTop: 4 },
  card: { backgroundColor: "#ffffff", borderColor: "#ded7ce", borderWidth: 1, borderRadius: 8, padding: 14, gap: 12 },
  field: { gap: 6 },
  label: { color: "#303236", fontSize: 14, fontWeight: "800" },
  input: { minHeight: 46, borderColor: "#ded7ce", borderWidth: 1, borderRadius: 6, backgroundColor: "#fffefa", paddingHorizontal: 12, color: "#262626", fontSize: 15 },
  optionWrap: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  option: { minHeight: 38, borderRadius: 999, borderColor: "#ded7ce", borderWidth: 1, paddingHorizontal: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#fffefa" },
  optionActive: { backgroundColor: "#e85d04", borderColor: "#e85d04" },
  optionText: { color: "#303236", fontWeight: "800" },
  optionTextActive: { color: "#ffffff" },
  button: { minHeight: 44, borderRadius: 6, paddingHorizontal: 14, alignItems: "center", justifyContent: "center" },
  primaryButton: { backgroundColor: "#e85d04" },
  primaryButtonText: { color: "#ffffff", fontWeight: "900" },
  secondaryButton: { backgroundColor: "#fff7ed", borderColor: "#f4c59d", borderWidth: 1 },
  secondaryButtonText: { color: "#9d3d00", fontWeight: "900" },
  dangerButton: { backgroundColor: "#fff5f5", borderColor: "#fac8c4", borderWidth: 1 },
  dangerButtonText: { color: "#b42318", fontWeight: "900" },
  buttonDisabled: { opacity: 0.45 },
  smallButton: { minHeight: 36, borderRadius: 6, backgroundColor: "#e85d04", alignItems: "center", justifyContent: "center", paddingHorizontal: 12 },
  smallButtonMuted: { backgroundColor: "#ffffff", borderColor: "#ded7ce", borderWidth: 1 },
  smallButtonText: { color: "#ffffff", fontWeight: "900", fontSize: 12 },
  smallButtonMutedText: { color: "#303236" },
  badge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  badgeOk: { backgroundColor: "#e7f6ee" },
  badgeWarn: { backgroundColor: "#fdebea" },
  badgeText: { fontSize: 12, fontWeight: "900" },
  badgeTextOk: { color: "#19784b" },
  badgeTextWarn: { color: "#b42318" },
  warningBox: { backgroundColor: "#fff5f5", borderRadius: 6, padding: 10, gap: 4 },
  warningText: { color: "#b42318", fontWeight: "800" },
  emptyState: { backgroundColor: "#ffffff", borderColor: "#ded7ce", borderWidth: 1, borderRadius: 8, padding: 16, alignItems: "center", gap: 4 },
  emptyTitle: { color: "#303236", fontWeight: "900" },
  emptyText: { color: "#6f6a63", textAlign: "center" },
  emptyInline: { color: "#6f6a63", backgroundColor: "#fffefa", borderColor: "#ded7ce", borderWidth: 1, borderRadius: 6, padding: 12 },
});