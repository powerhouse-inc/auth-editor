import type { DocumentModelModule } from "document-model";
import { AuthDashboard } from "./auth-dashboard/module.js";

export const documentModels: DocumentModelModule<any>[] = [AuthDashboard];
