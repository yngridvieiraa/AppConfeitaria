// src/database/initDB.js
import * as SQLite from 'expo-sqlite';

const dbPromise = SQLite.openDatabaseAsync('minha_confeitaria.db');

export async function initDatabase() {
  try {
    const db = await dbPromise; // Espera o banco abrir
    
    // Executa a criação das tabelas em segundo plano
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      PRAGMA foreign_keys = ON;

      CREATE TABLE IF NOT EXISTS stock (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        packageQty REAL NOT NULL,
        packageUnit TEXT NOT NULL,
        cost REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipes (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        margin REAL NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recipe_ingredients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        recipeId TEXT NOT NULL,
        stockId TEXT NOT NULL,
        qty REAL NOT NULL,
        unit TEXT NOT NULL,
        FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE CASCADE,
        FOREIGN KEY (stockId) REFERENCES stock (id) ON DELETE RESTRICT
      );

      CREATE TABLE IF NOT EXISTS orders (
        id TEXT PRIMARY KEY,
        customer TEXT NOT NULL,
        recipeId TEXT NOT NULL,
        qty REAL NOT NULL,
        date TEXT NOT NULL,
        status TEXT NOT NULL,
        FOREIGN KEY (recipeId) REFERENCES recipes (id) ON DELETE RESTRICT
      );
    `);
    console.log("Banco de dados SQLite inicializado com sucesso!");
  } catch (error) {
    console.error("Erro ao inicializar banco de dados: ", error);
  }
}

export default dbPromise;