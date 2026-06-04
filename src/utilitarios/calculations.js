// src/utilitarios/calculations.js
import { unitMap } from './constants';

export function canConvert(fromUnit, toUnit) {
  return unitMap[fromUnit] && unitMap[toUnit] && unitMap[fromUnit].base === unitMap[toUnit].base;
}

export function toBaseQty(qty, unit) {
  const info = unitMap[unit];
  return info ? Number(qty || 0) * info.factor : 0;
}

export function unitPriceBase(item) {
  const packageBaseQty = toBaseQty(item.packageQty, item.packageUnit);
  return packageBaseQty ? Number(item.cost || 0) / packageBaseQty : 0;
}

export function ingredientCost(ingredient, stock) {
  const item = stock.find((entry) => entry.id === ingredient.stockId);
  if (!item || !canConvert(ingredient.unit, item.packageUnit)) {
    return 0;
  }
  return toBaseQty(ingredient.qty, ingredient.unit) * unitPriceBase(item);
}

export function recipeCost(recipe, stock) {
  return recipe.ingredients.reduce((sum, ingredient) => sum + ingredientCost(ingredient, stock), 0);
}

export function suggestedPrice(recipe, stock) {
  const cost = recipeCost(recipe, stock);
  return cost * (1 + Number(recipe.margin || 0) / 100);
}

export function stockCheck(recipe, stock, multiplier = 1) {
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