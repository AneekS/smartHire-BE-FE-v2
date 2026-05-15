import { z } from "zod";

/** Single role create (POST /api/preferred-roles) */
export const CreatePreferredRoleSchema = z.object({
  role: z.string().min(2).max(80),
  priority: z.number().int().min(1).max(10),
});
