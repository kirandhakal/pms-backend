import { Request, Response, NextFunction } from "express";
import { z, ZodTypeAny } from "zod";

export const validateBody = (schema: ZodTypeAny) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: z.flattenError(parsed.error).fieldErrors
            });
        }

        req.body = parsed.data;
        next();
    };
};
