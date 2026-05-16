import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { SignOptions } from "jsonwebtoken";

dotenv.config();

<<<<<<< HEAD
const JWT_SECRET = process.env.ACCESS_TOKEN_SECRET || "fallback_secret";
=======
const JWT_SECRET = process.env.JWT_SECRET || process.env.ACCESS_TOKEN_SECRET || "fallback_secret";
const JWT_EXPIRES_IN: SignOptions["expiresIn"] =
    (process.env.JWT_EXPIRES_IN || process.env.ACCESS_TOKEN_EXPIRES_IN || "24h") as SignOptions["expiresIn"];
const BCRYPT_SALT_ROUNDS = Number(process.env.BCRYPT_SALT_ROUNDS || 10);
>>>>>>> new/rafc

export const hashPassword = async (password: string): Promise<string> => {
    return await bcrypt.hash(password, BCRYPT_SALT_ROUNDS);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
    return await bcrypt.compare(password, hash);
};

export const generateToken = (payload: object): string => {
<<<<<<< HEAD
    return jwt.sign(payload, JWT_SECRET, { expiresIn: "1d" });
=======
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
>>>>>>> new/rafc
};

export const verifyToken = (token: string): any => {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (err) {
        return null;
    }
};
