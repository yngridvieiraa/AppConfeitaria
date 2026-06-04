// src/utilitarios/constants.js

export const STORAGE_KEY = "minhaConfeitaria.native.v1";
export const UNITS = ["g", "kg", "ml", "l", "un"];
export const STATUS = ["Aberta", "Produzida", "Entregue"];

export const unitMap = {
  g: { base: "g", factor: 1 },
  kg: { base: "g", factor: 1000 },
  ml: { base: "ml", factor: 1 },
  l: { base: "ml", factor: 1000 },
  un: { base: "un", factor: 1 },
};

export const emptyDb = {
  stock: [],
  recipes: [],
  orders: [],
};

export const emptyStockForm = {
  id: "", name: "", qty: "", unit: "g", packageQty: "", packageUnit: "kg", cost: "",
};

export const emptyRecipeForm = {
  id: "", name: "", margin: "40",
};

export const emptyIngredientForm = {
  stockId: "", qty: "", unit: "g",
};

export const emptyOrderForm = {
  id: "", customer: "", recipeId: "", qty: "1", date: new Date().toISOString().slice(0, 10), status: "Aberta",
};