"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.googleAuthCallback = exports.googleAuthenticate = exports.configureGoogleStrategy = void 0;
const passport_google_oauth20_1 = require("passport-google-oauth20");
const passport_1 = __importDefault(require("passport"));
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const auth_1 = require("../utils/auth");
const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
const configureGoogleStrategy = () => {
    passport_1.default.use(new passport_google_oauth20_1.Strategy({
        clientID: process.env.GOOGLE_CLIENT_ID || "",
        clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this Google ID
            let user = await userRepo.findOne({
                where: { oauthProvider: User_1.OAuthProvider.GOOGLE, oauthId: profile.id }
            });
            if (user) {
                // User exists, generate token
                const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
                return done(null, { user, token });
            }
            // Check if user exists with same email (local account)
            const existingUser = await userRepo.findOne({
                where: { email: profile.emails?.[0].value }
            });
            if (existingUser) {
                // Link existing account to Google OAuth
                existingUser.oauthProvider = User_1.OAuthProvider.GOOGLE;
                existingUser.oauthId = profile.id;
                user = await userRepo.save(existingUser);
                const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
                return done(null, { user, token });
            }
            // Create new user
            user = userRepo.create({
                name: profile.displayName || profile.name?.givenName + " " + profile.name?.familyName || "Unknown",
                email: profile.emails?.[0].value || "",
                oauthProvider: User_1.OAuthProvider.GOOGLE,
                oauthId: profile.id,
                role: User_1.UserRole.TEAM_MEMBER
            });
            user = await userRepo.save(user);
            const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
            return done(null, { user, token });
        }
        catch (error) {
            return done(error, undefined);
        }
    }));
};
exports.configureGoogleStrategy = configureGoogleStrategy;
const googleAuthenticate = () => {
    return passport_1.default.authenticate("google", { scope: ["profile", "email"] });
};
exports.googleAuthenticate = googleAuthenticate;
const googleAuthCallback = () => {
    return passport_1.default.authenticate("google", { session: false });
};
exports.googleAuthCallback = googleAuthCallback;
