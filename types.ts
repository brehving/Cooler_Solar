/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface CoolerModel {
  id: string;
  name: string;
  size: number; // inches
  wattage: number; // Watts
}

export type OperatingMode = 'Full Speed' | 'Normal Mode' | 'Eco Mode' | 'Low Mode' | 'Shutdown';

export interface CalculationResult {
  availablePower: number;
  coolerLoad: number;
  powerBalance: number;
  mode: OperatingMode;
  fanSpeed: number; // 0, 25, 50, 75, 100
  pumpSpeed: 'Off' | 'Low (25%)' | 'Medium (50%)' | 'High (75%)' | 'Full (100%)';
  percentageOfLoad: number;
}
