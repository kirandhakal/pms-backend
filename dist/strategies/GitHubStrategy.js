"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.githubAuthCallback = exports.githubAuthenticate = exports.configureGitHubStrategy = void 0;
const passport_github2_1 = require("passport-github2");
const passport_1 = __importDefault(require("passport"));
const data_source_1 = require("../config/data-source");
const User_1 = require("../entities/User");
const auth_1 = require("../utils/auth");
const userRepo = data_source_1.AppDataSource.getRepository(User_1.User);
const configureGitHubStrategy = () => {
    passport_1.default.use(new passport_github2_1.Strategy({
        clientID: process.env.GITHUB_CLIENT_ID || "",
        clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
        callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/auth/github/callback",
    }, async (accessToken, refreshToken, profile, done) => {
        try {
            // Check if user already exists with this GitHub ID
            let user = await userRepo.findOne({
                where: { oauthProvider: User_1.OAuthProvider.GITHUB, oauthId: profile.id }
            });
            if (user) {
                // User exists, generate token
                const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
                return done(null, { user, token });
            }
            // Check if user exists with same email (local account)
            // Note: GitHub may not provide email depending on settings
            const email = profile.emails?.[0]?.value;
            if (email) {
                const existingUser = await userRepo.findOne({
                    where: { email }
                });
                if (existingUser) {
                    // Link existing account to GitHub OAuth
                    existingUser.oauthProvider = User_1.OAuthProvider.GITHUB;
                    existingUser.oauthId = profile.id;
                    user = await userRepo.save(existingUser);
                    const token = (0, auth_1.generateToken)({ id: user.id, role: user.role });
                    return done(null, { user, token });
                }
            }
            // Create new user
            user = userRepo.create({
                name: profile.displayName || profile.username || "Unknown",
                email: email || `${profile.id}@github.local`,
                oauthProvider: User_1.OAuthProvider.GITHUB,
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
exports.configureGitHubStrategy = configureGitHubStrategy;
const githubAuthenticate = () => {
    return passport_1.default.authenticate("github", { scope: ["user:email"] });
};
exports.githubAuthenticate = githubAuthenticate;
const githubAuthCallback = () => {
    return passport_1.default.authenticate("github", { session: false });
};
exports.githubAuthCallback = githubAuthCallback;
