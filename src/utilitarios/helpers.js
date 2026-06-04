// src/utilitarios/helpers.js

export function createId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export function money(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function number(value) {
  return Number(value || 0).toLocaleString("pt-BR", {
    maximumFractionDigits: 2,
  });
}

export function parseNumber(value) {
  if (typeof value === "number") {
    return value;
  }
  return Number(String(value || "").replace(",", "."));
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}

export function formatDate(value) {
  if (!value || !value.includes("-")) {
    return "Sem data";
  }
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}