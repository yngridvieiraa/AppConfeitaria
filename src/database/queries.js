// src/database/queries.js
import dbPromise from './initDB';

export async function fetchStocks() {
  const db = await dbPromise;
  return await db.getAllAsync('SELECT * FROM stock');
}

export async function upsertStock(item) {
  const db = await dbPromise;
  await db.runAsync(
    'INSERT OR REPLACE INTO stock (id, name, qty, unit, packageQty, packageUnit, cost) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [item.id, item.name, item.qty, item.unit, item.packageQty, item.packageUnit, item.cost]
  );
}

export async function deleteStock(id) {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM stock WHERE id = ?', [id]);
}

export async function fetchRecipes() {
  const db = await dbPromise;
  const recipes = await db.getAllAsync('SELECT * FROM recipes');
  for (let i = 0; i < recipes.length; i++) {
    const ingredients = await db.getAllAsync(
      'SELECT stockId, qty, unit FROM recipe_ingredients WHERE recipeId = ?',
      [recipes[i].id]
    );
    recipes[i].ingredients = ingredients;
  }
  return recipes;
}

export async function upsertRecipe(recipe) {
  const db = await dbPromise;
  await db.runAsync(
    'INSERT OR REPLACE INTO recipes (id, name, margin) VALUES (?, ?, ?)',
    [recipe.id, recipe.name, recipe.margin]
  );
  await db.runAsync('DELETE FROM recipe_ingredients WHERE recipeId = ?', [recipe.id]);
  for (const ing of recipe.ingredients) {
    await db.runAsync(
      'INSERT INTO recipe_ingredients (recipeId, stockId, qty, unit) VALUES (?, ?, ?, ?)',
      [recipe.id, ing.stockId, ing.qty, ing.unit]
    );
  }
}

export async function deleteRecipe(id) {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM recipes WHERE id = ?', [id]);
}

export async function fetchOrders() {
  const db = await dbPromise;
  return await db.getAllAsync('SELECT * FROM orders');
}

export async function upsertOrder(order) {
  const db = await dbPromise;
  await db.runAsync(
    'INSERT OR REPLACE INTO orders (id, customer, recipeId, qty, date, status) VALUES (?, ?, ?, ?, ?, ?)',
    [order.id, order.customer, order.recipeId, order.qty, order.date, order.status]
  );
}

export async function deleteOrder(id) {
  const db = await dbPromise;
  await db.runAsync('DELETE FROM orders WHERE id = ?', [id]);
}