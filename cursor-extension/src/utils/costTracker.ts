/**
 * @module costTracker
 * @description Utility module for tracking Claude API usage costs
 */

import * as vscode from 'vscode';

const COST_PER_TOKEN = 0.000003; // Rough estimation
const CHARS_PER_TOKEN = 4; // Average characters per token

export interface CostData {
  dailyCost: number;
  contextUsage: number;
  lastReset: string;
}

/**
 * Load cost data from workspace state
 * @param {vscode.ExtensionContext} context - Extension context
 * @returns {Promise<CostData>} Current cost data
 */
export async function loadCostData(
  context: vscode.ExtensionContext
): Promise<CostData> {
  const dailyCost = context.workspaceState.get('dailyCost', 0);
  const contextUsage = context.workspaceState.get('contextUsage', 0);
  const lastReset = context.workspaceState.get('lastCostReset', '');
  
  // Reset if new day
  const today = new Date().toDateString();
  if (today !== lastReset) {
    await context.workspaceState.update('dailyCost', 0);
    await context.workspaceState.update('lastCostReset', today);
    return {
      dailyCost: 0,
      contextUsage,
      lastReset: today
    };
  }
  
  return { dailyCost, contextUsage, lastReset };
}

/**
 * Track cost for a Claude operation
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {number} outputLength - Length of output text
 * @param {number} [costLimit] - Daily cost limit
 * @returns {Promise<number>} Updated daily cost
 */
export async function trackCost(
  context: vscode.ExtensionContext,
  outputLength: number,
  costLimit?: number
): Promise<number> {
  const costData = await loadCostData(context);
  
  // Estimate cost
  const estimatedTokens = outputLength / CHARS_PER_TOKEN;
  const estimatedCost = estimatedTokens * COST_PER_TOKEN;
  const newDailyCost = costData.dailyCost + estimatedCost;
  
  // Update storage
  await context.workspaceState.update('dailyCost', newDailyCost);
  
  // Check limit if provided
  if (costLimit && newDailyCost > costLimit) {
    vscode.window.showErrorMessage(
      `Daily cost limit ($${costLimit}) exceeded! Current: $${newDailyCost.toFixed(2)}`
    );
  }
  
  return newDailyCost;
}

/**
 * Get formatted cost display
 * @param {number} cost - Cost amount
 * @param {number} limit - Cost limit
 * @returns {string} Formatted cost string
 */
export function formatCostDisplay(cost: number, limit: number): string {
  const percentage = (cost / limit) * 100;
  return `Today's usage: $${cost.toFixed(2)} / $${limit} (${percentage.toFixed(0)}%)`;
}

/**
 * Update context usage
 * @param {vscode.ExtensionContext} context - Extension context
 * @param {number} usage - Context usage percentage (0-1)
 * @returns {Promise<void>}
 */
export async function updateContextUsage(
  context: vscode.ExtensionContext,
  usage: number
): Promise<void> {
  await context.workspaceState.update('contextUsage', usage);
}