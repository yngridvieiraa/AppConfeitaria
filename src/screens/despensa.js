// src/screens/despensa.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Section, Card, Input, OptionGroup, PrimaryButton, SecondaryButton, DangerButton, ListEmpty, Badge } from '../componentes/UI';
import { UNITS, unitMap } from '../utilitarios/constants';
import { number, money } from '../utilitarios/helpers';
import { unitPriceBase } from '../utilitarios/calculations';

export default function DespensaScreen({ stock, form, updateForm, saveStock, editStock, deleteStock, resetForm }) {
  return (
    <Section eyebrow="Controle de insumos" title="Minha Despensa">
      <Card>
        <Input label="Nome do insumo" value={form.name} onChangeText={(value) => updateForm("name", value)} />
        <Input label="Quantidade em estoque" value={form.qty} onChangeText={(value) => updateForm("qty", value)} keyboardType="numeric" />
        <OptionGroup label="Unidade do estoque" options={UNITS} value={form.unit} onChange={(value) => updateForm("unit", value)} />
        <Input label="Qtd. comprada" value={form.packageQty} onChangeText={(value) => updateForm("packageQty", value)} keyboardType="numeric" />
        <OptionGroup label="Unidade da compra" options={UNITS} value={form.packageUnit} onChange={(value) => updateForm("packageUnit", value)} />
        <Input label="Valor pago" value={form.cost} onChangeText={(value) => updateForm("cost", value)} keyboardType="numeric" />
        <View style={styles.rowActions}>
          <PrimaryButton label={form.id ? "Atualizar insumo" : "Salvar insumo"} onPress={saveStock} />
          <SecondaryButton label="Cancelar" onPress={resetForm} />
        </View>
      </Card>

      <ListEmpty visible={!stock.length} text="Cadastre os primeiros ingredientes da despensa." />
      {stock.map((item) => {
        const baseUnit = unitMap[item.packageUnit]?.base || item.packageUnit;
        return (
          <Card key={item.id}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{item.name}</Text>
                <Text style={styles.meta}>{number(item.qty)} {item.unit} em estoque</Text>
                <Text style={styles.meta}>{money(item.cost)} por {number(item.packageQty)} {item.packageUnit}</Text>
                <Text style={styles.meta}>{money(unitPriceBase(item))} por {baseUnit}</Text>
              </View>
              <Badge ok={Number(item.qty) > 0} text={Number(item.qty) > 0 ? "Disponivel" : "Zerado"} />
            </View>
            <View style={styles.rowActions}>
              <SecondaryButton label="Editar" onPress={() => editStock(item)} />
              <DangerButton label="Excluir" onPress={() => deleteStock(item.id)} />
            </View>
          </Card>
        );
      })}
    </Section>
  );
}

const styles = StyleSheet.create({
  rowActions: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  cardHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 10 },
  flex: { flex: 1 },
  cardTitle: { color: "#262626", fontSize: 18, fontWeight: "900", marginBottom: 4 },
  meta: { color: "#6f6a63", fontSize: 14, lineHeight: 20 },
});