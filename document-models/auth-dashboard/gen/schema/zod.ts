import * as z from "zod";
import type { AuthDashboardState, SetSwitchboardUrlInput } from "./types.js";

type Properties<T> = Required<{
  [K in keyof T]: z.ZodType<T[K]>;
}>;

type definedNonNullAny = {};

export const isDefinedNonNullAny = (v: any): v is definedNonNullAny =>
  v !== undefined && v !== null;

export const definedNonNullAnySchema = z
  .any()
  .refine((v) => isDefinedNonNullAny(v));

export function AuthDashboardStateSchema(): z.ZodObject<
  Properties<AuthDashboardState>
> {
  return z.object({
    __typename: z.literal("AuthDashboardState").optional(),
    switchboardUrl: z.string().nullish(),
  });
}

export function SetSwitchboardUrlInputSchema(): z.ZodObject<
  Properties<SetSwitchboardUrlInput>
> {
  return z.object({
    url: z.string(),
  });
}
