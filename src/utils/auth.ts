import jwt from "jsonwebtoken";
import crypto from "crypto";
import dotenv from "dotenv";
import { SignOptions } from "jsonwebtoken";

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || "fallback_secret";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
    (process.env.JWT_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || "24h") as SignOptions["expiresIn"];
const HASH_ITERATIONS = Number(process.env.PASSWORD_HASH_ITERATIONS || 120000);
const HASH_KEYLEN = 64;
const HASH_DIGEST = "sha512";

export const hashPassword = async (password: string): Promise<string> => {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString("hex");
    return `${salt}:${hash}`;
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    const [salt, stored] = hash.split(":");
    if (!salt || !stored) {
        return false;
    }

    const derived = crypto.pbkdf2Sync(password, salt, HASH_ITERATIONS, HASH_KEYLEN, HASH_DIGEST).toString("hex");
    return crypto.timingSafeEqual(Buffer.from(stored, "hex"), Buffer.from(derived, "hex"));
};

export const generateToken = (payload: object): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch {
        return null;
    }
};