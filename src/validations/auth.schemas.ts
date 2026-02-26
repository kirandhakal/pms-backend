import { z } from "zod";

export const registerSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(128)
});

export const loginSchema = z.object({
    email: z.email().trim().toLowerCase(),
    password: z.string().min(1)
});

export const updateProfileSchema = z.object({
    fullName: z.string().trim().min(2).max(100).optional(),
    email: z.email().trim().toLowerCase().optional()
}).refine((value) => Boolean(value.fullName || value.email), {
    message: "At least one field is required"
});

export const changePasswordSchema = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128)
});

export const createAdminSchema = z.object({
    fullName: z.string().trim().min(2).max(100),
    email: z.email().trim().toLowerCase(),
    password: z.string().min(8).max(128)
});
