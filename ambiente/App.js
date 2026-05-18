import AsyncStorage from "@react-native-async-storage/async-storage";
import { useEffect, useMemo, useState } from "react";
import { Alert,KeyboardAvoidingView, Platform, Pressable, SafeAreaView, ScrollView, StatusBar, StyleSheet, Text, TextInput, View } from "react-native";

const STORAGE_KEY = "minhaConfeitaria.native.v1";
const UNITS = ["g", "kg", "ml", "l", "un"];
const STATUS = ["Aberta", "Produzida", "Entregue"];

const unitMap = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  un: { base: "un", factor: 1 },
};

const emptyDb = {
  stock: [],
  recipes: [],
  orders: [],
};

const emptyStockForm = {
  id: "",
  name: "",
  qty: "",
  unit: "g",
  packageQty: "",
  packageUnit: "kg",
  cost: "",
};

const emptyRecipeForm = {
  id: "",
  name: "",
  margin: "40",
};

const emptyIngredientForm = {
  stockId: "",
  qty: "",
  unit: "g",
};

const emptyOrderForm = {
  id: "",
  customer: "",
  recipeId: "",
  qty: "1",
  date: new Date().toISOString().slice(0, 10),
  status: "Aberta",
};

function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function number(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  return Number(String(value || "").replace(",", "."));
}

function canConvert(fromUnit, toUnit) {
  return unitMap[fromUnit] && unitMap[toUnit] && unitMap[fromUnit].base === unitMap[toUnit].base;
}

function toBaseQty(qty, unit) {
  const info = unitMap[unit];
  return info ? Number(qty || 0) * info.factor : 0;
}

function unitPriceBase(item) {
  const packageBaseQty = toBaseQty(item.packageQty, item.packageUnit);
  return packageBaseQty ? Number(item.cost || 0) / packageBaseQty : 0;
}

function ingredientCost(ingredient, stock) {
  const item = stock.find((entry) => entry.id === ingredient.stockId);
  if (!item || !canConvert(ingredient.unit, item.packageUnit)) {
    return 0;
  }
  return toBaseQty(ingredient.qty, ingredient.unit) * unitPriceBase(item);
}

function recipeCost(recipe, stock) {
  return recipe.ingredients.reduce((sum, ingredient) => sum + ingredientCost(ingredient, stock), 0);
}

function suggestedPrice(recipe, stock) {
  const cost = recipeCost(recipe, stock);
  return cost * (1 + Number(recipe.margin || 0) / 100);
}

function stockCheck(recipe, stock, multiplier = 1) {
  const missing = [];
  const requiredByStock = new Map();

  recipe.ingredients.forEach((ingredient) => {
    const item = stock.find((entry) => entry.id === ingredient.stockId);
    const needed = Number(ingredient.qty || 0) * Number(multiplier || 1);

    if (!item || !canConvert(ingredient.unit, item.unit)) {
      missing.push({
        name: item ? item.name : "Insumo removido",
        missing: needed,
        unit: ingredient.unit,
      });
      return;
    }

    const current = requiredByStock.get(item.id) || {
      item,
      requiredBase: 0,
    };
    current.requiredBase += toBaseQty(needed, ingredient.unit);
    requiredByStock.set(item.id, current);
  });

  requiredByStock.forEach(({ item, requiredBase }) => {
    const availableBase = toBaseQty(item.qty, item.unit);
    if (availableBase + 0.0001 < requiredBase) {
      const missingBase = requiredBase - availableBase;
      missing.push({
        name: item.name,
        missing: missingBase / unitMap[item.unit].factor,
        unit: item.unit,
      });
    }
  });

  return {
    ok: missing.length === 0,
    missing,
  };
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value || !value.includes("-")) {
    return "Sem data";
  }
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

export default function App() {
  const [db, setDb] = useState(emptyDb);
  const [activeTab, setActiveTab] = useState("Despensa");
  const [loaded, setLoaded] = useState(false);
  const [stockForm, setStockForm] = useState(emptyStockForm);
  const [recipeForm, setRecipeForm] = useState(emptyRecipeForm);
  const [ingredientForm, setIngredientForm] = useState(emptyIngredientForm);
  const [ingredientDraft, setIngredientDraft] = useState([]);
  const [orderForm, setOrderForm] = useState(emptyOrderForm);

  useEffect(() => {
    async function load() {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          setDb({
            stock: Array.isArray(parsed.stock) ? parsed.stock : [],
            recipes: Array.isArray(parsed.recipes) ? parsed.recipes : [],
            orders: Array.isArray(parsed.orders) ? parsed.orders : [],
          });
        }
      } catch (error) {
        Alert.alert("Banco local", "Nao foi possivel carregar os dados salvos.");
      } finally {
        setLoaded(true);
      }
    }

    load();
  }, []);

  useEffect(() => {
    if (!loaded) {
      return;
    }
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(db)).catch(() => {
      Alert.alert("Banco local", "Nao foi possivel salvar os dados.");
    });
  }, [db, loaded]);

  const openOrders = useMemo(
    () => db.orders.filter((order) => order.status !== "Entregue").length,
    [db.orders],
  );

  function updateStockForm(field, value) {
    setStockForm((current) => ({ ...current, [field]: value }));
  }

  function updateRecipeForm(field, value) {
    setRecipeForm((current) => ({ ...current, [field]: value }));
  }

  function updateIngredientForm(field, value) {
    setIngredientForm((current) => ({ ...current, [field]: value }));
  }

  function updateOrderForm(field, value) {
    setOrderForm((current) => ({ ...current, [field]: value }));
  }

  function saveStock() {
    const item = {
      id: stockForm.id || createId("stock"),
      name: stockForm.name.trim(),
      qty: parseNumber(stockForm.qty),
      unit: stockForm.unit,
      packageQty: parseNumber(stockForm.packageQty),
      packageUnit: stockForm.packageUnit,
      cost: parseNumber(stockForm.cost),
    };

    if (
      !item.name ||
      stockForm.qty.trim() === "" ||
      stockForm.packageQty.trim() === "" ||
      stockForm.cost.trim() === "" ||
      !Number.isFinite(item.qty) ||
      !Number.isFinite(item.packageQty) ||
      !Number.isFinite(item.cost) ||
      item.qty < 0 ||
      item.packageQty <= 0 ||
      item.cost < 0
    ) {
      Alert.alert("Despensa", "Preencha nome, quantidade, compra e valor pago.");
      return;
    }

    if (!canConvert(item.unit, item.packageUnit)) {
      Alert.alert("Despensa", "A unidade do estoque precisa combinar com a unidade da compra.");
      return;
    }

    setDb((current) => {
      const exists = current.stock.some((entry) => entry.id === item.id);
      return {
        ...current,
        stock: exists
          ? current.stock.map((entry) => (entry.id === item.id ? item : entry))
          : [...current.stock, item],
      };
    });

    setStockForm(emptyStockForm);
  }

  function editStock(item) {
    setStockForm({
      id: item.id,
      name: item.name,
      qty: String(item.qty),
      unit: item.unit,
      packageQty: String(item.packageQty),
      packageUnit: item.packageUnit,
      cost: String(item.cost),
    });
    setActiveTab("Despensa");
  }

  function deleteStock(id) {
    const isUsed = db.recipes.some((recipe) =>
      recipe.ingredients.some((ingredient) => ingredient.stockId === id),
    );

    if (isUsed) {
      Alert.alert("Despensa", "Este insumo esta sendo usado em uma receita.");
      return;
    }

    setDb((current) => ({
      ...current,
      stock: current.stock.filter((entry) => entry.id !== id),
    }));
  }

  function addIngredient() {
    const item = db.stock.find((entry) => entry.id === ingredientForm.stockId);
    const qty = parseNumber(ingredientForm.qty);

    if (!item || !qty) {
      Alert.alert("Receitas", "Selecione um insumo e informe a quantidade usada.");
      return;
    }

    if (!canConvert(ingredientForm.unit, item.unit)) {
      Alert.alert("Receitas", "A unidade do ingrediente precisa combinar com o estoque.");
      return;
    }

    setIngredientDraft((current) => [
      ...current,
      {
        stockId: item.id,
        qty,
        unit: ingredientForm.unit,
      },
    ]);
    setIngredientForm({ ...emptyIngredientForm, stockId: item.id, unit: ingredientForm.unit });
  }

  function saveRecipe() {
    const recipe = {
      id: recipeForm.id || createId("recipe"),
      name: recipeForm.name.trim(),
      margin: parseNumber(recipeForm.margin),
      ingredients: ingredientDraft.map((ingredient) => ({ ...ingredient })),
    };

    if (!recipe.name || !recipe.ingredients.length) {
      Alert.alert("Receitas", "Informe o nome e pelo menos um ingrediente.");
      return;
    }

    if (!Number.isFinite(recipe.margin) || recipe.margin < 0) {
      Alert.alert("Receitas", "Informe uma margem de lucro valida.");
      return;
    }

    setDb((current) => {
      const exists = current.recipes.some((entry) => entry.id === recipe.id);
      return {
        ...current,
        recipes: exists
          ? current.recipes.map((entry) => (entry.id === recipe.id ? recipe : entry))
          : [...current.recipes, recipe],
      };
    });

    setRecipeForm(emptyRecipeForm);
    setIngredientDraft([]);
    setIngredientForm(emptyIngredientForm);
  }

  function editRecipe(recipe) {
    setRecipeForm({
      id: recipe.id,
      name: recipe.name,
      margin: String(recipe.margin),
    });
    setIngredientDraft(recipe.ingredients.map((ingredient) => ({ ...ingredient })));
    setActiveTab("Receitas");
  }

  function deleteRecipe(id) {
    const isUsed = db.orders.some((order) => order.recipeId === id);

    if (isUsed) {
      Alert.alert("Receitas", "Esta receita esta vinculada a uma encomenda.");
      return;
    }

    setDb((current) => ({
      ...current,
      recipes: current.recipes.filter((entry) => entry.id !== id),
    }));
  }

  function saveOrder() {
    const order = {
      id: orderForm.id || createId("order"),
      customer: orderForm.customer.trim(),
      recipeId: orderForm.recipeId,
      qty: parseNumber(orderForm.qty),
      date: orderForm.date,
      status: orderForm.status,
    };

    if (!order.customer || !order.recipeId || !order.qty || !order.date) {
      Alert.alert("Encomendas", "Preencha cliente, receita, quantidade e data.");
      return;
    }

    setDb((current) => {
      const exists = current.orders.some((entry) => entry.id === order.id);
      return {
        ...current,
        orders: exists
          ? current.orders.map((entry) => (entry.id === order.id ? order : entry))
          : [...current.orders, order],
      };
    });

    setOrderForm({ ...emptyOrderForm, date: today() });
  }

  function editOrder(order) {
    setOrderForm({
      id: order.id,
      customer: order.customer,
      recipeId: order.recipeId,
      qty: String(order.qty),
      date: order.date,
      status: order.status,
    });
    setActiveTab("Encomendas");
  }

  function deleteOrder(id) {
    setDb((current) => ({
      ...current,
      orders: current.orders.filter((entry) => entry.id !== id),
    }));
  }

  function produceOrder(id) {
    const order = db.orders.find((entry) => entry.id === id);
    const recipe = order ? db.recipes.find((entry) => entry.id === order.recipeId) : null;

    if (!order || !recipe) {
      return;
    }

    const check = stockCheck(recipe, db.stock, order.qty);
    if (!check.ok) {
      Alert.alert("Estoque insuficiente", "A encomenda esta marcada como Nao apta.");
      return;
    }

    setDb((current) => {
      const nextStock = current.stock.map((item) => {
        const usedByRecipe = recipe.ingredients.filter((ingredient) => ingredient.stockId === item.id);
        if (!usedByRecipe.length) {
          return item;
        }

        const usedBase = usedByRecipe.reduce(
          (sum, ingredient) => sum + toBaseQty(Number(ingredient.qty) * Number(order.qty), ingredient.unit),
          0,
        );
        const remainingBase = toBaseQty(item.qty, item.unit) - usedBase;
        return {
          ...item,
          qty: Math.max(0, remainingBase / unitMap[item.unit].factor),
        };
      });

      return {
        ...current,
        stock: nextStock,
        orders: current.orders.map((entry) =>
          entry.id === id ? { ...entry, status: "Produzida" } : entry,
        ),
      };
    });
  }

  function seedDatabase() {
    const flour = createId("stock");
    const sugar = createId("stock");
    const milk = createId("stock");
    const eggs = createId("stock");
    const recipe = createId("recipe");

    setDb({
      stock: [
        { id: flour, name: "Farinha de trigo", qty: 1000, unit: "g", packageQty: 1, packageUnit: "kg", cost: 6.5 },
        { id: sugar, name: "Acucar", qty: 800, unit: "g", packageQty: 1, packageUnit: "kg", cost: 5.2 },
        { id: milk, name: "Leite", qty: 1000, unit: "ml", packageQty: 1, packageUnit: "l", cost: 4.8 },
        { id: eggs, name: "Ovos", qty: 12, unit: "un", packageQty: 12, packageUnit: "un", cost: 11.9 },
      ],
      recipes: [
        {
          id: recipe,
          name: "Bolo caseiro",
          margin: 45,
          ingredients: [
            { stockId: flour, qty: 300, unit: "g" },
            { stockId: sugar, qty: 200, unit: "g" },
            { stockId: milk, qty: 250, unit: "ml" },
            { stockId: eggs, qty: 3, unit: "un" },
          ],
        },
      ],
      orders: [
        {
          id: createId("order"),
          customer: "Flavia Andreia",
          recipeId: recipe,
          qty: 2,
          date: today(),
          status: "Aberta",
        },
      ],
    });
    setStockForm(emptyStockForm);
    setRecipeForm(emptyRecipeForm);
    setIngredientDraft([]);
    setIngredientForm(emptyIngredientForm);
    setOrderForm({ ...emptyOrderForm, date: today() });
  }

  function clearData() {
    setDb(emptyDb);
    setStockForm(emptyStockForm);
    setRecipeForm(emptyRecipeForm);
    setIngredientDraft([]);
    setIngredientForm(emptyIngredientForm);
    setOrderForm({ ...emptyOrderForm, date: today() });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar barStyle="dark-content" backgroundColor="#f7f4ef" />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboard}
      >
        <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
          <View style={styles.header}>
            <View>
              <Text style={styles.eyebrow}>App de gestao</Text>
              <Text style={styles.title}>Minha Confeitaria</Text>
            </View>
            <View style={styles.headerActions}>
              <SmallButton label="Exemplo" onPress={seedDatabase} />
              <SmallButton label="Limpar" variant="muted" onPress={clearData} />
            </View>
          </View>

          <View style={styles.summaryGrid}>
            <SummaryCard label="Itens" value={db.stock.length} />
            <SummaryCard label="Receitas" value={db.recipes.length} />
            <SummaryCard label="Abertas" value={openOrders} />
          </View>

          <View style={styles.tabs}>
            {["Despensa", "Receitas", "Encomendas"].map((tab) => (
              <Pressable
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={[styles.tabButton, activeTab === tab && styles.tabButtonActive]}
              >
                <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>{tab}</Text>
              </Pressable>
            ))}
          </View>

          {activeTab === "Despensa" && (
            <Despensa
              stock={db.stock}
              form={stockForm}
              updateForm={updateStockForm}
              saveStock={saveStock}
              editStock={editStock}
              deleteStock={deleteStock}
              resetForm={() => setStockForm(emptyStockForm)}
            />
          )}

          {activeTab === "Receitas" && (
            <Receitas
              stock={db.stock}
              recipes={db.recipes}
              form={recipeForm}
              ingredientForm={ingredientForm}
              ingredientDraft={ingredientDraft}
              updateForm={updateRecipeForm}
              updateIngredientForm={updateIngredientForm}
              addIngredient={addIngredient}
              removeIngredient={(index) =>
                setIngredientDraft((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
              saveRecipe={saveRecipe}
              editRecipe={editRecipe}
              deleteRecipe={deleteRecipe}
              resetForm={() => {
                setRecipeForm(emptyRecipeForm);
                setIngredientForm(emptyIngredientForm);
                setIngredientDraft([]);
              }}
            />
          )}

          {activeTab === "Encomendas" && (
            <Encomendas
              stock={db.stock}
              recipes={db.recipes}
              orders={db.orders}
              form={orderForm}
              updateForm={updateOrderForm}
              saveOrder={saveOrder}
              editOrder={editOrder}
              deleteOrder={deleteOrder}
              produceOrder={produceOrder}
              resetForm={() => setOrderForm({ ...emptyOrderForm, date: today() })}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Despensa({ stock, form, updateForm, saveStock, editStock, deleteStock, resetForm }) {
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

function Receitas({
  stock,
  recipes,
  form,
  ingredientForm,
  ingredientDraft,
  updateForm,
  updateIngredientForm,
  addIngredient,
  removeIngredient,
  saveRecipe,
  editRecipe,
  deleteRecipe,
  resetForm,
}) {
  return (
    <Section eyebrow="Custo e precificacao" title="Minhas Receitas">
      <Card>
        <Input label="Nome da receita" value={form.name} onChangeText={(value) => updateForm("name", value)} />
        <Input label="Margem de lucro (%)" value={form.margin} onChangeText={(value) => updateForm("margin", value)} keyboardType="numeric" />
        <OptionGroup
          label="Insumo"
          options={stock.map((item) => ({ label: item.name, value: item.id }))}
          value={ingredientForm.stockId}
          onChange={(value) => updateIngredientForm("stockId", value)}
          emptyText="Cadastre um insumo primeiro"
        />
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

function Encomendas({
  stock,
  recipes,
  orders,
  form,
  updateForm,
  saveOrder,
  editOrder,
  deleteOrder,
  produceOrder,
  resetForm,
}) {
  const sortedOrders = [...orders].sort((a, b) => String(a.date).localeCompare(String(b.date)));

  return (
    <Section eyebrow="Producao e agenda" title="Minhas Encomendas">
      <Card>
        <Input label="Cliente" value={form.customer} onChangeText={(value) => updateForm("customer", value)} />
        <OptionGroup
          label="Receita"
          options={recipes.map((recipe) => ({ label: recipe.name, value: recipe.id }))}
          value={form.recipeId}
          onChange={(value) => updateForm("recipeId", value)}
          emptyText="Cadastre uma receita primeiro"
        />
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
              <PrimaryButton
                label="Produzir"
                disabled={!check.ok || order.status === "Produzida"}
                onPress={() => produceOrder(order.id)}
              />
              <SecondaryButton label="Editar" onPress={() => editOrder(order)} />
              <DangerButton label="Excluir" onPress={() => deleteOrder(order.id)} />
            </View>
          </Card>
        );
      })}
    </Section>
  );
}

function Section({ eyebrow, title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.eyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SummaryCard({ label, value }) {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  );
}

function Card({ children }) {
  return <View style={styles.card}>{children}</View>;
}

function Input({ label, value, onChangeText, keyboardType = "default" }) {
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

function OptionGroup({ label, options, value, onChange, emptyText }) {
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

function Badge({ ok, text }) {
  return (
    <View style={[styles.badge, ok ? styles.badgeOk : styles.badgeWarn]}>
      <Text style={[styles.badgeText, ok ? styles.badgeTextOk : styles.badgeTextWarn]}>{text}</Text>
    </View>
  );
}

function MissingList({ check }) {
  if (check.ok) {
    return null;
  }

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

function ListEmpty({ visible, text }) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyTitle}>Nenhum registro encontrado.</Text>
      <Text style={styles.emptyText}>{text}</Text>
    </View>
  );
}

function PrimaryButton({ label, onPress, disabled }) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      style={[styles.button, styles.primaryButton, disabled && styles.buttonDisabled]}
    >
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function SecondaryButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, styles.secondaryButton]}>
      <Text style={styles.secondaryButtonText}>{label}</Text>
    </Pressable>
  );
}

function DangerButton({ label, onPress }) {
  return (
    <Pressable onPress={onPress} style={[styles.button, styles.dangerButton]}>
      <Text style={styles.dangerButtonText}>{label}</Text>
    </Pressable>
  );
}

function SmallButton({ label, onPress, variant }) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.smallButton, variant === "muted" && styles.smallButtonMuted]}
    >
      <Text style={[styles.smallButtonText, variant === "muted" && styles.smallButtonMutedText]}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: "#f7f4ef",
  },
  keyboard: {
    flex: 1,
  },
  container: {
    padding: 18,
    paddingBottom: 40,
    gap: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 12,
  },
  headerActions: {
    gap: 8,
  },
  eyebrow: {
    color: "#9d3d00",
    fontSize: 12,
    fontWeight: "800",
    textTransform: "uppercase",
  },
  title: {
    color: "#262626",
    fontSize: 28,
    fontWeight: "900",
    marginTop: 2,
  },
  summaryGrid: {
    flexDirection: "row",
    gap: 8,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: "#ffffff",
    borderColor: "#ded7ce",
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
  },
  summaryLabel: {
    color: "#6f6a63",
    fontSize: 12,
    fontWeight: "700",
  },
  summaryValue: {
    color: "#303236",
    fontSize: 24,
    fontWeight: "900",
    marginTop: 4,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: "#ede6dc",
    borderRadius: 8,
    padding: 5,
    gap: 5,
  },
  tabButton: {
    flex: 1,
    minHeight: 42,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabButtonActive: {
    backgroundColor: "#303236",
  },
  tabText: {
    color: "#6f6a63",
    fontWeight: "800",
    fontSize: 13,
  },
  tabTextActive: {
    color: "#ffffff",
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: "#262626",
    fontSize: 22,
    fontWeight: "900",
  },
  card: {
    backgroundColor: "#ffffff",
    borderColor: "#ded7ce",
    borderWidth: 1,
    borderRadius: 8,
    padding: 14,
    gap: 12,
  },
  field: {
    gap: 6,
  },
  label: {
    color: "#303236",
    fontSize: 14,
    fontWeight: "800",
  },
  input: {
    minHeight: 46,
    borderColor: "#ded7ce",
    borderWidth: 1,
    borderRadius: 6,
    backgroundColor: "#fffefa",
    paddingHorizontal: 12,
    color: "#262626",
    fontSize: 15,
  },
  optionWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  option: {
    minHeight: 38,
    borderRadius: 999,
    borderColor: "#ded7ce",
    borderWidth: 1,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#fffefa",
  },
  optionActive: {
    backgroundColor: "#e85d04",
    borderColor: "#e85d04",
  },
  optionText: {
    color: "#303236",
    fontWeight: "800",
  },
  optionTextActive: {
    color: "#ffffff",
  },
  rowActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  button: {
    minHeight: 44,
    borderRadius: 6,
    paddingHorizontal: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButton: {
    backgroundColor: "#e85d04",
  },
  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "900",
  },
  secondaryButton: {
    backgroundColor: "#fff7ed",
    borderColor: "#f4c59d",
    borderWidth: 1,
  },
  secondaryButtonText: {
    color: "#9d3d00",
    fontWeight: "900",
  },
  dangerButton: {
    backgroundColor: "#fff5f5",
    borderColor: "#fac8c4",
    borderWidth: 1,
  },
  dangerButtonText: {
    color: "#b42318",
    fontWeight: "900",
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  smallButton: {
    minHeight: 36,
    borderRadius: 6,
    backgroundColor: "#e85d04",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  smallButtonMuted: {
    backgroundColor: "#ffffff",
    borderColor: "#ded7ce",
    borderWidth: 1,
  },
  smallButtonText: {
    color: "#ffffff",
    fontWeight: "900",
    fontSize: 12,
  },
  smallButtonMutedText: {
    color: "#303236",
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  flex: {
    flex: 1,
  },
  cardTitle: {
    color: "#262626",
    fontSize: 18,
    fontWeight: "900",
    marginBottom: 4,
  },
  meta: {
    color: "#6f6a63",
    fontSize: 14,
    lineHeight: 20,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeOk: {
    backgroundColor: "#e7f6ee",
  },
  badgeWarn: {
    backgroundColor: "#fdebea",
  },
  badgeText: {
    fontSize: 12,
    fontWeight: "900",
  },
  badgeTextOk: {
    color: "#19784b",
  },
  badgeTextWarn: {
    color: "#b42318",
  },
  warningBox: {
    backgroundColor: "#fff5f5",
    borderRadius: 6,
    padding: 10,
    gap: 4,
  },
  warningText: {
    color: "#b42318",
    fontWeight: "800",
  },
  chip: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#fffefa",
    borderColor: "#ded7ce",
    borderWidth: 1,
    borderRadius: 6,
    padding: 10,
  },
  chipText: {
    flex: 1,
    color: "#303236",
    fontWeight: "700",
  },
  removeText: {
    color: "#b42318",
    fontWeight: "900",
  },
  emptyState: {
    backgroundColor: "#ffffff",
    borderColor: "#ded7ce",
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    color: "#303236",
    fontWeight: "900",
  },
  emptyText: {
    color: "#6f6a63",
    textAlign: "center",
  },
  emptyInline: {
    color: "#6f6a63",
    backgroundColor: "#fffefa",
    borderColor: "#ded7ce",
    borderWidth: 1,
    borderRadius: 6,
    padding: 12,
  },
});
