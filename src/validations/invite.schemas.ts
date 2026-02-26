import { z } from "zod";
import { UserRole } from "../entities/User";

export const inviteSchema = z.object({
    email: z.email().trim().toLowerCase(),
    role: z.nativeEnum(UserRole),
    projectId: z.uuid().optional()
});
