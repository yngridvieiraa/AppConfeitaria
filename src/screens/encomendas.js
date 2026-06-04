// src/screens/encomendas.js
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Section, Card, Input, OptionGroup, PrimaryButton, SecondaryButton, DangerButton, ListEmpty, Badge, MissingList } from '../componentes/UI';
import { STATUS } from '../utilitarios/constants';
import { number, money, formatDate } from '../utilitarios/helpers';
import { stockCheck, suggestedPrice } from '../utilitarios/calculations';

export default function EncomendasScreen({ stock, recipes, orders, form, updateForm, saveOrder, editOrder, deleteOrder, produceOrder, resetForm }) {
  const sortedOrders = [...orders].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <Section eyebrow="Producao e agenda" title="Minhas Encomendas">
      <Card>
        <Input label="Cliente" value={form.customer} onChangeText={(value) => updateForm("customer", value)} />
        <OptionGroup label="Receita" options={recipes.map((recipe) => ({ label: recipe.name, value: recipe.id }))} value={form.recipeId} onChange={(value) => updateForm("recipeId", value)} emptyText="Cadastre uma receita primeiro" />
        <Input label="Quantidade" value={form.qty} onChangeText={(value) => updateForm("qty", value)} keyboardType="numeric" />
        <Input label="Data de entrega (AAAA-MM-DD)" value={form.date} onChangeText={(value) => updateForm("date", value)} />
        <OptionGroup label="Status" options={STATUS} value={form.status} onChange={(value) => updateForm("status", value)} />
        <View style={styles.rowActions}>
          <PrimaryButton label={form.id ? "Atualizar encomenda" : "Salvar encomenda"} onPress={saveOrder} />
          <SecondaryButton label="Cancelar" onPress={resetForm} />
        </View>
      </Card>

      <ListEmpty visible={!orders.length} text="Registre encomendas para validar o estoque." />
      {sortedOrders.map((order) => {
        const recipe = recipes.find((entry) => entry.id === order.recipeId);
        const check = recipe ? stockCheck(recipe, stock, order.qty) : { ok: false, missing: [] };
        const total = recipe ? suggestedPrice(recipe, stock) * Number(order.qty || 1) : 0;

        return (
          <Card key={order.id}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{order.customer}</Text>
                <Text style={styles.meta}>{recipe ? recipe.name : "Receita removida"}</Text>
                <Text style={styles.meta}>Qtd: {number(order.qty)} - Entrega: {formatDate(order.date)}</Text>
                <Text style={styles.meta}>Total sugerido: {money(total)}</Text>
              </View>
              <Badge ok={check.ok} text={check.ok ? order.status : "Nao apto"} />
            </View>
            <MissingList check={check} />
            <View style={styles.rowActions}>
              <PrimaryButton label="Produzir" disabled={!check.ok || order.status === "Produzida"} onPress={() => produceOrder(order.id)} />
              <SecondaryButton label="Editar" onPress={() => editOrder(order)} />
              <DangerButton label="Excluir" onPress={() => deleteOrder(order.id)} />
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