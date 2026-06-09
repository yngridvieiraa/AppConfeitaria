import React from "react";
import { StyleSheet, Text, View, TextInput, Pressable } from "react-native";
import { Picker } from "@react-native-picker/picker";
import { formatDate } from "../utilitarios/helpers";

export default function EncomendasScreen({
  recipes,
  orders,
  form,
  updateForm,
  saveOrder,
  editOrder,
  deleteOrder,
  produceOrder,
  undoProduceOrder,
  resetForm
}) {
  return (
    <View style={styles.screen}>
      <Text style={styles.sectionTitle}>Controle de Encomendas</Text>

      {/* FORMULÁRIO DE CADASTRO/EDIÇÃO */}
      <View style={styles.card}>
        <Text style={styles.formTitle}>
          {form.id ? "Editar Encomenda" : "Nova Encomenda"}
        </Text>

        <Text style={styles.label}>Nome do Cliente *</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Maria Souza"
          value={form.customer}
          onChangeText={(v) => updateForm("customer", v)}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Telefone do Cliente</Text>
            <TextInput
              style={styles.input}
              placeholder="(21) 99999-9999"
              keyboardType="phone-pad"
              value={form.phone}
              onChangeText={(v) => updateForm("phone", v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Forma de Pagamento</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: Dinheiro, Pix, Cartão"
              value={form.paymentMethod}
              onChangeText={(v) => updateForm("paymentMethod", v)}
            />
          </View>
        </View>

        <Text style={styles.label}>Endereço de Entrega</Text>
        <TextInput
          style={styles.input}
          placeholder="Ex: Rua das Flores, 123 - Apt 402"
          value={form.address}
          onChangeText={(v) => updateForm("address", v)}
        />

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Data da Entrega *</Text>
            <TextInput
              style={styles.input}
              placeholder="AAAA-MM-DD"
              value={form.date}
              onChangeText={(v) => updateForm("date", v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Hora da Entrega</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 14:00"
              value={form.deliveryTime}
              onChangeText={(v) => updateForm("deliveryTime", v)}
            />
          </View>
        </View>

        <View style={styles.row}>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Início da Produção</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 04/06 às 08h"
              value={form.productionStart}
              onChangeText={(v) => updateForm("productionStart", v)}
            />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.label}>Término da Produção</Text>
            <TextInput
              style={styles.input}
              placeholder="Ex: 05/06 às 12h"
              value={form.productionEnd}
              onChangeText={(v) => updateForm("productionEnd", v)}
            />
          </View>
        </View>

        <Text style={styles.label}>Escolher receita deste pedido (Opcional)</Text>
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={form.recipeId}
            onValueChange={(v) => updateForm("recipeId", v)}
            style={styles.picker}
          >
            <Picker.Item label="-- Selecione se houver uma receita única --" value="" />
            {recipes.map((r) => (
              <Picker.Item key={r.id} label={r.name} value={r.id} />
            ))}
          </Picker>
        </View>

        <Text style={styles.label}>Itens e Quantidades Extras / Detalhes do Pedido</Text>
        <TextInput
          style={[styles.input, styles.textArea]}
          placeholder="Ex: 1 Bolo de Chocolate, 50 Brigadeiros, 30 Beijinhos..."
          multiline={true}
          numberOfLines={3}
          value={form.details}
          onChangeText={(v) => updateForm("details", v)}
        />

        <View style={styles.buttonRow}>
          <Pressable style={styles.btnSave} onPress={saveOrder}>
            <Text style={styles.btnText}>Salvar Encomenda</Text>
          </Pressable>
          {form.id && (
            <Pressable style={styles.btnCancel} onPress={resetForm}>
              <Text style={styles.btnText}>Cancelar</Text>
            </Pressable>
          )}
        </View>
      </View>

      {/* LISTAGEM DE CARDS */}
      <Text style={styles.subTitle}>Minhas Entregas</Text>
      {orders.length === 0 ? (
        <Text style={styles.emptyText}>Nenhuma encomenda registrada.</Text>
      ) : (
        orders.map((item) => {
          const associatedRecipe = recipes.find((r) => r.id === item.recipeId);
          return (
            <View key={item.id} style={styles.orderCard}>
              <View style={styles.orderHeader}>
                <View>
                  <Text style={styles.customerName}>{item.customer}</Text>
                  {item.phone ? <Text style={styles.metaText}>📞 {item.phone}</Text> : null}
                </View>
                <View style={[styles.badge, item.status === "Aberta" ? styles.badgeOpen : styles.badgeDone]}>
                  <Text style={styles.badgeText}>{item.status}</Text>
                </View>
              </View>

              <View style={styles.divider} />

              <Text style={styles.metaText}>
                📆 <Text style={{fontWeight: 'bold'}}>Entrega:</Text> {formatDate(item.date)} {item.deliveryTime ? `às ${item.deliveryTime}` : ""}
              </Text>

              {item.address ? (
                <Text style={styles.metaText}>📍 <Text style={{fontWeight: 'bold'}}>Endereço:</Text> {item.address}</Text>
              ) : null}

              {item.paymentMethod ? (
                <Text style={styles.metaText}>💰 <Text style={{fontWeight: 'bold'}}>Pagamento:</Text> {item.paymentMethod}</Text>
              ) : null}

              {item.productionStart || item.productionEnd ? (
                <Text style={styles.metaText}>
                  🏗️ <Text style={{fontWeight: 'bold'}}>Produção:</Text> {item.productionStart || "Não definida"} até {item.productionEnd || "Não definida"}
                </Text>
              ) : null}

              {/* MOSTRA A RECEITA BASE (SE FOI SELECIONADA) */}
              {associatedRecipe ? (
                <Text style={styles.metaText}>
                  🍰 <Text style={{fontWeight: 'bold'}}>Receita Base:</Text> {associatedRecipe.name}
                </Text>
              ) : null}

              {/* MOSTRA OS ITENS EXTRAS/DETALHES (SE FORAM DIGITADOS) */}
              {item.details ? (
                <View style={styles.detailsBox}>
                  <Text style={styles.detailsTitle}>Itens Extras / Observações:</Text>
                  <Text style={styles.detailsText}>{item.details}</Text>
                </View>
              ) : null}

              <View style={styles.actions}>
                {item.status === "Aberta" ? (
                  <Pressable style={[styles.actionBtn, { backgroundColor: "#9d3d00" }]} onPress={() => produceOrder(item.id)}>
                    <Text style={styles.actionBtnText}>Dar baixa no estoque</Text>
                  </Pressable>
                ) : (
                  <Pressable style={[styles.actionBtn, { backgroundColor: "#a39e96" }]} onPress={() => undoProduceOrder(item.id)}>
                    <Text style={styles.actionBtnText}>Desfazer baixa</Text>
                  </Pressable>
                )}
                
                <Pressable style={[styles.actionBtn, { backgroundColor: "#303236" }]} onPress={() => editOrder(item)}>
                  <Text style={styles.actionBtnText}>Editar</Text>
                </Pressable>
                <Pressable style={[styles.actionBtn, { backgroundColor: "#cf2222" }]} onPress={() => deleteOrder(item.id)}>
                  <Text style={styles.actionBtnText}>Excluir</Text>
                </Pressable>
              </View>
            </View>
          );
        })
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { gap: 14 },
  sectionTitle: { color: "#9d3d00", fontSize: 14, fontWeight: "800", textTransform: "uppercase" },
  subTitle: { color: "#262626", fontSize: 22, fontWeight: "900", marginTop: 10 },
  card: { backgroundColor: "#ffffff", padding: 16, borderRadius: 12, gap: 10, borderColor: "#ede6dc", borderWidth: 1 },
  formTitle: { fontFamily: "System", fontSize: 22, fontWeight: "900", color: "#262626", marginBottom: 12 },
  label: { fontFamily: "System", fontSize: 13, fontWeight: "700", color: "#262626", marginBottom: 4, textTransform: "none" },
  input: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#ede6dc", borderRadius: 8, padding: 12, fontSize: 15, color: "#262626", fontFamily: "System" },
  textArea: { minHeight: 60, textAlignVertical: "top" },
  row: { flexDirection: "row", gap: 10 },
  pickerContainer: { backgroundColor: "#ffffff", borderWidth: 1, borderColor: "#ede6dc", borderRadius: 8, overflow: "hidden", justifyContent: "center", minHeight: 54 },
  picker: { height: 54, color: "#262626" },
  picker: { height: 44, color: "#262626" },
  buttonRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  btnSave: { flex: 2, backgroundColor: "#FF823A", borderRadius: 8, minHeight: 40, alignItems: "center", justifyContent: "center" },
  btnCancel: { flex: 1, backgroundColor: "#a39e96", borderRadius: 8, minHeight: 40, alignItems: "center", justifyContent: "center" },
  btnText: { color: "#ffffff", fontWeight: "800", fontSize: 13 },
  emptyText: { color: "#a39e96", fontSize: 14, fontStyle: "italic", textAlign: "center", marginVertical: 10 },
  orderCard: { backgroundColor: "#ffffff", padding: 16, borderRadius: 12, borderLeftWidth: 6, borderLeftColor: "#FF823A", borderRightWidth: 1, borderRightColor: "#ede6dc", borderTopWidth: 1, borderTopColor: "#ede6dc", borderBottomWidth: 1, borderBottomColor: "#ede6dc", gap: 6 },
  orderHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" },
  customerName: { fontSize: 16, fontWeight: "900", color: "#262626" },
  metaText: { fontSize: 14, color: "#4b4b4b", marginTop: 2 },
  divider: { height: 1, backgroundColor: "#ede6dc", marginVertical: 4 },
  badge: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 2 },
  badgeOpen: { backgroundColor: "#fff0e6" },
  badgeDone: { backgroundColor: "#e6f9ed" },
  badgeText: { fontSize: 11, fontWeight: "800" },
  detailsBox: { backgroundColor: "#fdfcfb", borderWidth: 1, borderColor: "#ede6dc", padding: 10, borderRadius: 6, marginVertical: 4 },
  detailsTitle: { fontSize: 11, fontWeight: "800", color: "#9d3d00", marginBottom: 2 },
  detailsText: { fontSize: 13, color: "#262626" },
  actions: { flexDirection: "row", gap: 8, marginTop: 12 },
  actionBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  actionBtnText: { color: "#ffffff", fontSize: 12, fontWeight: "800" }
});