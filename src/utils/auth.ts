import jwt from "jsonwebtoken";
import argon2 from "argon2";
import dotenv from "dotenv";

dotenv.config();

const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "fallback_secret";

export const hashPassword = async (password: string): Promise<string> => {
    return await argon2.hash(password);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return await argon2.verify(hash, password);
};

export const generateToken = (payload: object): string => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
};

export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};
