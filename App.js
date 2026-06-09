import { useEffect, useMemo, useState } from "react";
import { KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, View, Pressable, Alert } from "react-native";

// Bancos de dados
import { initDatabase } from "./src/database/initDB";
import * as DB from "./src/database/queries";

// Utilitários
import { emptyDb, emptyStockForm, emptyRecipeForm, emptyIngredientForm, unitMap } from "./src/utilitarios/constants";
import { createId, parseNumber, today } from "./src/utilitarios/helpers";
import { canConvert, stockCheck, toBaseQty } from "./src/utilitarios/calculations";

// Componentes UI e Telas
import { SummaryCard } from "./src/componentes/UI";
import DespensaScreen from "./src/screens/despensa";
import ReceitasScreen from "./src/screens/receitas";
import EncomendasScreen from "./src/screens/encomendas";

// Configuração expandida do formulário de encomendas
const emptyOrderFormExpanded = {
  id: "", customer: "", recipeId: "", qty: "1", date: today(), status: "Aberta",
  phone: "", address: "", deliveryTime: "", paymentMethod: "",
  productionStart: "", productionEnd: "", details: ""
};

export default function App() {
  const [db, setDb] = useState(emptyDb);
  const [activeTab, setActiveTab] = useState("Despensa");
  const [loaded, setLoaded] = useState(false);
  
  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm);
  const [ingredientDraft, setIngredientDraft] = useState([]);
  const [orderForm, setOrderForm] = useState(emptyOrderFormExpanded);

  useEffect(() => {
    async function setup() {
      await initDatabase();
      await loadData();
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

  // AÇÕES DE ESTOQUE
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
      alert("Preencha nome, quantidade e valor pago."); return;
    }
    if (!canConvert(item.unit, item.packageUnit)) {
      alert("A unidade do estoque precisa combinar com a unidade da compra."); return;
    }

    await DB.upsertStock(item);
    await loadData();
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
    if (isUsed) { alert("Este insumo está sendo usado em uma receita."); return; }
    await DB.deleteStock(id);
    await loadData();
  }

  // AÇÕES DE RECEITAS
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
    
    await DB.upsertRecipe(recipe);
    await loadData();
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
    await DB.deleteRecipe(id);
    await loadData();
  }

  // AÇÕES DE ENCOMENDAS
  async function saveOrder() {
    const order = {
      id: orderForm.id || createId("order"),
      customer: orderForm.customer.trim(),
      recipeId: orderForm.recipeId || "personalizado",
      qty: parseNumber(orderForm.qty),
      date: orderForm.date,
      status: orderForm.status,
      phone: orderForm.phone ? orderForm.phone.trim() : "",
      address: orderForm.address ? orderForm.address.trim() : "",
      deliveryTime: orderForm.deliveryTime || "",
      paymentMethod: orderForm.paymentMethod || "",
      productionStart: orderForm.productionStart || "",
      productionEnd: orderForm.productionEnd || "",
      details: orderForm.details ? orderForm.details.trim() : ""
    };

    if (!order.customer) {
      alert("Por favor, digite o Nome do Cliente.");
      return;
    }
    if (!order.date || order.date === "AAAA-MM-DD") {
      alert("Por favor, digite uma Data de Entrega válida.");
      return;
    }

    try {
      await DB.upsertOrder(order);
      await loadData();
      setOrderForm(emptyOrderFormExpanded);
      alert("Encomenda salva com sucesso! 🎉");
    } catch (error) {
      console.error("Erro ao salvar encomenda:", error);
      alert("Erro crítico no banco de dados. Tente limpar o cache do navegador/app.");
    }
  }

  function editOrder(order) {
    setOrderForm({
      id: order.id, customer: order.customer, recipeId: order.recipeId,
      qty: String(order.qty), date: order.date, status: order.status,
      phone: order.phone || "", address: order.address || "", deliveryTime: order.deliveryTime || "",
      paymentMethod: order.paymentMethod || "", productionStart: order.productionStart || "",
      productionEnd: order.productionEnd || "", details: order.details || ""
    });
    setActiveTab("Encomendas");
  }

  async function deleteOrder(id) {
    await DB.deleteOrder(id);
    await loadData();
  }

  // FUNÇÃO BLINDADA DE BAIXA DE ESTOQUE
  async function produceOrder(id) {
    const executarBaixa = async () => {
      try {
        const order = db.orders.find((entry) => entry.id === id);
        const recipe = order ? db.recipes.find((entry) => entry.id === order.recipeId) : null;
        if (!order) return;

        if (recipe) {
          const check = stockCheck(recipe, db.stock, order.qty);
          if (!check.ok) { 
            setTimeout(() => {
              Alert.alert("Estoque Insuficiente ⚠️", "Você não tem ingredientes suficientes na Despensa.");
            }, 500);
            return; 
          }

          for (const item of db.stock) {
            const usedByRecipe = recipe.ingredients.filter((ing) => ing.stockId === item.id);
            
            if (usedByRecipe.length > 0) {
              const safeOrderQty = Number(order.qty) || 1;
              
              const usedBase = usedByRecipe.reduce((sum, ing) => {
                const ingQty = Number(ing.qty) || 0;
                return sum + toBaseQty(ingQty * safeOrderQty, ing.unit);
              }, 0);
              
              const availableBase = toBaseQty(Number(item.qty) || 0, item.unit);
              const remainingBase = Math.max(0, availableBase - usedBase);
              
              const factor = (unitMap && unitMap[item.unit]) ? unitMap[item.unit].factor : 1;
              const finalQty = remainingBase / factor;

              const updatedItem = { ...item, qty: finalQty };
              await DB.upsertStock(updatedItem);
            }
          }
        }

        const updatedOrder = { ...order, status: "Produzida" };
        await DB.upsertOrder(updatedOrder);
        await loadData();
        
        setTimeout(() => {
          Alert.alert("Sucesso! 🎉", "Baixa no estoque realizada com sucesso.");
        }, 500);

      } catch (error) {
        console.error("Erro na baixa de estoque:", error);
        setTimeout(() => {
          Alert.alert("Erro Técnico 🐛", "Motivo exato: " + error.message);
        }, 500);
      }
    };

    if (Platform.OS === "web") {
      const confirmacao = window.confirm("Dar baixa no estoque?\nIsso vai descontar os ingredientes desta encomenda da sua despensa.");
      if (confirmacao) executarBaixa();
    } else {
      Alert.alert(
        "Dar baixa no estoque?",
        "Isso vai descontar os ingredientes desta encomenda da sua despensa.",
        [
          { text: "Cancelar", style: "cancel" },
          { text: "Sim, dar baixa", onPress: executarBaixa }
        ]
      );
    }
  }

  // FUNÇÃO DE DESFAZER A BAIXA
  async function undoProduceOrder(id) {
    const order = db.orders.find((entry) => entry.id === id);
    const recipe = order ? db.recipes.find((entry) => entry.id === order.recipeId) : null;
    if (!order || order.status === "Aberta") return;

    if (recipe) {
      for (const item of db.stock) {
        const usedByRecipe = recipe.ingredients.filter((ing) => ing.stockId === item.id);
        if (usedByRecipe.length) {
          const usedBase = usedByRecipe.reduce((sum, ing) => sum + toBaseQty(Number(ing.qty) * Number(order.qty), ing.unit), 0);
          const remainingBase = toBaseQty(item.qty, item.unit) + usedBase;
          const updatedItem = { ...item, qty: remainingBase / unitMap[item.unit].factor };
          await DB.upsertStock(updatedItem);
        }
      }
    }

    const updatedOrder = { ...order, status: "Aberta" };
    await DB.upsertOrder(updatedOrder);
    await loadData();
    alert("Baixa desfeita! Os ingredientes voltaram para a despensa.");
  }

  if (!loaded) return null;

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f4ef" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"} 
        style={styles.keyboard}
        keyboardVerticalOffset={Platform.OS === "android" ? 40 : 0}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled" style={{ flex: 1 }}>
          
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
            <EncomendasScreen 
              stock={db.stock} 
              recipes={db.recipes} 
              orders={db.orders} 
              form={orderForm} 
              updateForm={updateOrderForm} 
              saveOrder={saveOrder} 
              editOrder={editOrder} 
              deleteOrder={deleteOrder} 
              produceOrder={produceOrder} 
              undoProduceOrder={undoProduceOrder}
              resetForm={() => setOrderForm(emptyOrderFormExpanded)} 
            />
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