import type { ReportConfig } from './types';
import { INVENTORY_DEFINITIONS_PART1 } from './inventoryPart1';
import { INVENTORY_DEFINITIONS_PART2 } from './inventoryPart2';

// Barrel — the inventory report definitions are split into inventoryPart1.ts
// and inventoryPart2.ts; consumers keep importing INVENTORY_DEFINITIONS here.
export const INVENTORY_DEFINITIONS: Record<string, ReportConfig> = {
  ...INVENTORY_DEFINITIONS_PART1,
  ...INVENTORY_DEFINITIONS_PART2,
};
