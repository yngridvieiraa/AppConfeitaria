import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View } from "react-native";

// Bancos de dados
import { initDatabase } from "./src/database/initDB";
import * as DB from "./src/database/queries";

// Utilitários
import { emptyDb, emptyStockForm, emptyRecipeForm, emptyIngredientForm, emptyOrderForm, unitMap } from "./src/utilitarios/constants";
import { createId, parseNumber, today } from "./src/utilitarios/helpers";
import { canConvert, stockCheck, toBaseQty } from "./src/utilitarios/calculations";

// Componentes UI e Telas
import { SmallButton, SummaryCard } from "./src/componentes/UI";
import DespensaScreen from "./src/screens/despensa";
import ReceitasScreen from "./src/screens/receitas";
import EncomendasScreen from "./src/screens/encomendas";

export default function App() {
  const [db, setDb] = useState(emptyDb);
  const [activeTab, setActiveTab] = useState("Despensa");
  const [loaded, setLoaded] = useState(false);
  
  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm);
  const [ingredientDraft, setIngredientDraft] = useState([]);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);

  // INICIALIZAÇÃO E CARREGAMENTO DE DADOS
  useEffect(() => {
    async function setup() {
      await initDatabase();
      await loadData(); // Busca os dados do banco real!
      setLoaded(true);
    }
    setup();
  }, []);

  async function loadData() {
    try {
      const stocks = await DB.fetchStocks();
      const recipes = await DB.fetchRecipes();
      const orders = await DB.fetchOrders();
      setDb({ stock: stocks, recipes: recipes, orders: orders });
    } catch (error) {
      console.error("Erro ao buscar dados do SQLite:", error);
    }
  }

  const openOrders = useMemo(
    () => db.orders?.filter((order) => order.status !== "Entregue").length || 0,
    [db.orders],
  );

  function updateStockForm(field, value) { setStockForm((current) => ({ ...current, [field]: value })); }
  function updateRecipeForm(field, value) { setRecipeForm((current) => ({ ...current, [field]: value })); }
  function updateIngredientForm(field, value) { setIngredientForm((current) => ({ ...current, [field]: value })); }
  function updateOrderForm(field, value) { setOrderForm((current) => ({ ...current, [field]: value })); }

  // ==========================================
  // AÇÕES DE ESTOQUE LIGADAS AO SQLITE
  // ==========================================
  async function saveStock() {
    const item = {
      id: stockForm.id || createId("stock"),
      name: stockForm.name.trim(),
      qty: parseNumber(stockForm.qty),
      unit: stockForm.unit,
      packageQty: parseNumber(stockForm.packageQty),
      packageUnit: stockForm.packageUnit,
      cost: parseNumber(stockForm.cost),
    };

    if (!item.name || stockForm.qty.trim() === "" || stockForm.cost.trim() === "") {
      alert("Preencha nome, quantidade e valor pago.");
      return;
    }

    if (!canConvert(item.unit, item.packageUnit)) {
      alert("A unidade do estoque precisa combinar com a unidade da compra.");
      return;
    }

    await DB.upsertStock(item); // Salva no banco de dados físico
    await loadData();           // Atualiza a tela com os dados novos
    setStockForm(emptyStockForm);
  }

  function editStock(item) {
    setStockForm({
      id: item.id, name: item.name, qty: String(item.qty), unit: item.unit,
      packageQty: String(item.packageQty), packageUnit: item.packageUnit, cost: String(item.cost),
    });
    setActiveTab("Despensa");
  }

  async function deleteStock(id) {
    const isUsed = db.recipes.some((recipe) => recipe.ingredients.some((ing) => ing.stockId === id));
    if (isUsed) {
      alert("Este insumo está sendo usado em uma receita.");
      return;
    }
    await DB.deleteStock(id); // Deleta do banco
    await loadData();         // Atualiza a tela
  }

  // ==========================================
  // AÇÕES DE RECEITAS LIGADAS AO SQLITE
  // ==========================================
  function addIngredient() {
    const item = db.stock.find((entry) => entry.id === ingredientForm.stockId);
    const qty = parseNumber(ingredientForm.qty);

    if (!item || !qty) { alert("Selecione um insumo e informe a quantidade."); return; }
    if (!canConvert(ingredientForm.unit, item.unit)) { alert("A unidade precisa combinar com o estoque."); return; }

    setIngredientDraft((current) => [...current, { stockId: item.id, qty, unit: ingredientForm.unit }]);
    setIngredientForm({ ...emptyIngredientForm, stockId: item.id, unit: ingredientForm.unit });
  }

  async function saveRecipe() {
    const recipe = {
      id: recipeForm.id || createId("recipe"),
      name: recipeForm.name.trim(),
      margin: parseNumber(recipeForm.margin),
      ingredients: ingredientDraft.map((ing) => ({ ...ing })),
    };

    if (!recipe.name || !recipe.ingredients.length) { alert("Informe o nome e pelo menos um ingrediente."); return; }
    
    await DB.upsertRecipe(recipe); // Salva a receita e seus ingredientes no SQLite
    await loadData();              // Atualiza a tela
    
    setRecipeForm(emptyRecipeForm);
    setIngredientDraft([]);
    setIngredientForm(emptyIngredientForm);
  }

  function editRecipe(recipe) {
    setRecipeForm({ id: recipe.id, name: recipe.name, margin: String(recipe.margin) });
    setIngredientDraft(recipe.ingredients.map((ing) => ({ ...ing })));
    setActiveTab("Receitas");
  }

  async function deleteRecipe(id) {
    const isUsed = db.orders.some((order) => order.recipeId === id);
    if (isUsed) { alert("Esta receita está vinculada a uma encomenda."); return; }
    
    await DB.deleteRecipe(id); // Deleta receita (e seus ingredientes, por causa do DELETE CASCADE)
    await loadData();
  }

  // ==========================================
  // AÇÕES DE ENCOMENDAS LIGADAS AO SQLITE
  // ==========================================
  async function saveOrder() {
    const order = {
      id: orderForm.id || createId("order"),
      customer: orderForm.customer.trim(),
      recipeId: orderForm.recipeId,
      qty: parseNumber(orderForm.qty),
      date: orderForm.date,
      status: orderForm.status,
    };

    if (!order.customer || !order.recipeId || !order.qty || !order.date) {
      alert("Preencha cliente, receita, quantidade e data."); return;
    }

    await DB.upsertOrder(order); // Salva a encomenda no banco
    await loadData();
    setOrderForm({ ...emptyOrderForm, date: today() });
  }

  function editOrder(order) {
    setOrderForm({
      id: order.id, customer: order.customer, recipeId: order.recipeId,
      qty: String(order.qty), date: order.date, status: order.status,
    });
    setActiveTab("Encomendas");
  }

  async function deleteOrder(id) {
    await DB.deleteOrder(id); // Deleta a encomenda do banco
    await loadData();
  }

  async function produceOrder(id) {
    const order = db.orders.find((entry) => entry.id === id);
    const recipe = order ? db.recipes.find((entry) => entry.id === order.recipeId) : null;

    if (!order || !recipe) return;

    const check = stockCheck(recipe, db.stock, order.qty);
    if (!check.ok) { alert("Estoque insuficiente para produzir."); return; }

    // Deduz o estoque usado e salva os novos valores no banco
    for (const item of db.stock) {
      const usedByRecipe = recipe.ingredients.filter((ing) => ing.stockId === item.id);
      if (usedByRecipe.length) {
        const usedBase = usedByRecipe.reduce((sum, ing) => sum + toBaseQty(Number(ing.qty) * Number(order.qty), ing.unit), 0);
        const remainingBase = toBaseQty(item.qty, item.unit) - usedBase;
        
        const updatedItem = { ...item, qty: Math.max(0, remainingBase / unitMap[item.unit].factor) };
        await DB.upsertStock(updatedItem);
      }
    }

    // Atualiza o status da encomenda
    const updatedOrder = { ...order, status: "Produzida" };
    await DB.upsertOrder(updatedOrder);
    
    // Recarrega tudo para refletir a nova realidade da confeitaria
    await loadData();
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f4ef" />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.keyboard}>
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>App de gestão</Text>
              <Text style={styles.title}>Minha Confeitaria</Text>
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryCard label="Itens" value={db.stock?.length || 0} />
            <SummaryCard label="Receitas" value={db.recipes?.length || 0} />
            <SummaryCard label="Abertas" value={openOrders} />
          </View>

          <View style={styles.tabs}>
            {["Despensa", "Receitas", "Encomendas"].map((tab) => (
              <Pressable key={tab} onPress={() => setActiveTab(tab)} style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}>
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "Despensa" && (
            <DespensaScreen stock={db.stock} form={stockForm} updateForm={updateStockForm} saveStock={saveStock} editStock={editStock} deleteStock={deleteStock} resetForm={() => setStockForm(emptyStockForm)} />
          )}

          {activeTab === "Receitas" && (
            <ReceitasScreen stock={db.stock} recipes={db.recipes} form={recipeForm} ingredientForm={ingredientForm} ingredientDraft={ingredientDraft} updateForm={updateRecipeForm} updateIngredientForm={updateIngredientForm} addIngredient={addIngredient} removeIngredient={(index) => setIngredientDraft((current) => current.filter((_, i) => i !== index))} saveRecipe={saveRecipe} editRecipe={editRecipe} deleteRecipe={deleteRecipe} resetForm={() => { setRecipeForm(emptyRecipeForm); setIngredientForm(emptyIngredientForm); setIngredientDraft([]); }} />
          )}

          {activeTab === "Encomendas" && (
            <EncomendasScreen stock={db.stock} recipes={db.recipes} orders={db.orders} form={orderForm} updateForm={updateOrderForm} saveOrder={saveOrder} editOrder={editOrder} deleteOrder={deleteOrder} produceOrder={produceOrder} resetForm={() => setOrderForm({ ...emptyOrderForm, date: today() })} />
          )}

        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: "#f7f4ef" },
  keyboard: { flex: 1 },
  container: { padding: 18, paddingBottom: 40, gap: 14 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", gap: 12, marginBottom: 10 },
  eyebrow: { color: "#9d3d00", fontSize: 12, fontWeight: "800", textTransform: "uppercase" },
  title: { color: "#262626", fontSize: 28, fontWeight: "900", marginTop: 2 },
  summaryGrid: { flexDirection: "row", gap: 8 },
  tabs: { flexDirection: "row", backgroundColor: "#ede6dc", borderRadius: 8, padding: 5, gap: 5 },
  tabButton: { flex: 1, minHeight: 42, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  tabButtonActive: { backgroundColor: "#303236" },
  tabText: { color: "#6f6a63", fontWeight: "800", fontSize: 13 },
  tabTextActive: { color: "#ffffff" },
});