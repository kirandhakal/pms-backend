"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = exports.notFoundHandler = exports.ApiError = void 0;
class ApiError extends Error {
    constructor(message, statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
    }
}
exports.ApiError = ApiError;
const notFoundHandler = (req, res) => {
    res.status(404).json({ message: "Route not found" });
};
exports.notFoundHandler = notFoundHandler;
const errorHandler = (err, req, res, next) => {
    if (res.headersSent) {
        return next(err);
    }
    const statusCode = err?.statusCode || 500;
    const message = err?.message || "Internal server error";
    res.status(statusCode).json({ message });
};
exports.errorHandler = errorHandler;
