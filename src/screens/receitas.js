// src/screens/receitas.js
import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Section, Card, Input, OptionGroup, PrimaryButton, SecondaryButton, DangerButton, ListEmpty, Badge, MissingList } from '../componentes/UI';
import { UNITS } from '../utilitarios/constants';
import { number, money } from '../utilitarios/helpers';
import { recipeCost, suggestedPrice, stockCheck } from '../utilitarios/calculations';

export default function ReceitasScreen({ stock, recipes, form, ingredientForm, ingredientDraft, updateForm, updateIngredientForm, addIngredient, removeIngredient, saveRecipe, editRecipe, deleteRecipe, resetForm }) {
  return (
    <Section eyebrow="Custo e precificacao" title="Minhas Receitas">
      <Card>
        <Input label="Nome da receita" value={form.name} onChangeText={(value) => updateForm("name", value)} />
        <Input label="Margem de lucro (%)" value={form.margin} onChangeText={(value) => updateForm("margin", value)} keyboardType="numeric" />
        <OptionGroup label="Insumo" options={stock.map((item) => ({ label: item.name, value: item.id }))} value={ingredientForm.stockId} onChange={(value) => updateIngredientForm("stockId", value)} emptyText="Cadastre um insumo primeiro" />
        <Input label="Quantidade usada" value={ingredientForm.qty} onChangeText={(value) => updateIngredientForm("qty", value)} keyboardType="numeric" />
        <OptionGroup label="Unidade usada" options={UNITS} value={ingredientForm.unit} onChange={(value) => updateIngredientForm("unit", value)} />
        <SecondaryButton label="Adicionar ingrediente" onPress={addIngredient} />

        {ingredientDraft.map((ingredient, index) => {
          const item = stock.find((entry) => entry.id === ingredient.stockId);
          return (
            <View style={styles.chip} key={`${ingredient.stockId}-${index}`}>
              <Text style={styles.chipText}>{item ? item.name : "Insumo removido"} - {number(ingredient.qty)} {ingredient.unit}</Text>
              <Pressable onPress={() => removeIngredient(index)}>
                <Text style={styles.removeText}>Remover</Text>
              </Pressable>
            </View>
          );
        })}

        <View style={styles.rowActions}>
          <PrimaryButton label={form.id ? "Atualizar receita" : "Salvar receita"} onPress={saveRecipe} />
          <SecondaryButton label="Cancelar" onPress={resetForm} />
        </View>
      </Card>

      <ListEmpty visible={!recipes.length} text="Cadastre receitas para calcular custo e preco." />
      {recipes.map((recipe) => {
        const cost = recipeCost(recipe, stock);
        const price = suggestedPrice(recipe, stock);
        const check = stockCheck(recipe, stock);

        return (
          <Card key={recipe.id}>
            <View style={styles.cardHeader}>
              <View style={styles.flex}>
                <Text style={styles.cardTitle}>{recipe.name}</Text>
                <Text style={styles.meta}>Custo: {money(cost)}</Text>
                <Text style={styles.meta}>Preco sugerido: {money(price)}</Text>
                <Text style={styles.meta}>Margem: {number(recipe.margin)}%</Text>
              </View>
              <Badge ok={check.ok} text={check.ok ? "Apto" : "Nao apto"} />
            </View>
            <MissingList check={check} />
            <View style={styles.rowActions}>
              <SecondaryButton label="Editar" onPress={() => editRecipe(recipe)} />
              <DangerButton label="Excluir" onPress={() => deleteRecipe(recipe.id)} />
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
  chip: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 10, backgroundColor: "#fffefa", borderColor: "#ded7ce", borderWidth: 1, borderRadius: 6, padding: 10 },
  chipText: { flex: 1, color: "#303236", fontWeight: "700" },
  removeText: { color: "#b42318", fontWeight: "900" },
});