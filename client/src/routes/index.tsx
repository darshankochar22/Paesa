import { companyRoutes } from "./companyRoutes";
import { masterRoutes } from "./masterRoutes";
import { reportRoutes } from "./reportRoutes";
import { transactionRoutes } from "./transactionRoutes";
import type { RouteConfig } from "./types";

export const APP_ROUTES: RouteConfig[] = [
  ...companyRoutes,
  ...masterRoutes,
  ...reportRoutes,
  ...transactionRoutes,
];

export type { RouteConfig };
