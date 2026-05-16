"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = exports.comparePassword = exports.hashPassword = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || "fallback_secret";
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || "24h");
const HASH_ITERATIONS = Number(process.env.PASSWORD_HASH_ITERATIONS || 120000);
const HASH_KEYLEN = 64;
const HASH_DIGEST = "sha512";
const hashPassword = async (password) => {
    const salt = crypto_1.default.randomBytes(16).toString("hex");
    const hash = crypto_1.default.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString("hex");
    return `${salt}:${hash}`;
};
exports.hashPassword = hashPassword;
const comparePassword = async (password, hash) => {
    const [salt, stored] = hash.split(":");
    if (!salt || !stored) {
        return false;
    }
    const derived = crypto_1.default.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString("hex");
    return crypto_1.default.timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(derived, "hex"));
};
exports.comparePassword = comparePassword;
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};
exports.generateToken = generateToken;
const verifyToken = (token) => {
    try {
        return jsonwebtoken_1.default.verify(token, JWT_SECRET);
    }
    catch {
        return null;
    }
};
exports.verifyToken = verifyToken;
