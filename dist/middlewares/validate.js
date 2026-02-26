"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateBody = void 0;
const zod_1 = require("zod");
const validateBody = (schema) => {
    return (req, res, next) => {
        const parsed = schema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                message: "Validation failed",
                errors: zod_1.z.flattenError(parsed.error).fieldErrors
            });
        }
        req.body = parsed.data;
        next();
    };
};
exports.validateBody = validateBody;
