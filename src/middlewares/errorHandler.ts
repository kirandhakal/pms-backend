import { NextFunction, Request, Response } from "express";

export class ApiError extends Error {
    statusCode: number;

    constructor(message: string, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}

export const notFoundHandler = (req: Request, res: Response) => {
    res.status(404).json({ message: "Route not found" });
};

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err?.statusCode || 500;
    const message = err?.message || "Internal server error";

    res.status(statusCode).json({ message });
};
