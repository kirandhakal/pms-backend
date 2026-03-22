"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const AuthService_1 = require("../services/AuthService");
const GoogleStrategy_1 = require("../strategies/GoogleStrategy");
const GitHubStrategy_1 = require("../strategies/GitHubStrategy");
const passport_1 = __importDefault(require("passport"));
// Initialize OAuth strategies
(0, GoogleStrategy_1.configureGoogleStrategy)();
(0, GitHubStrategy_1.configureGitHubStrategy)();
// Serialize/Deserialize for session (if needed)
passport_1.default.serializeUser((user, done) => {
    done(null, user.user.id);
});
passport_1.default.deserializeUser(async (id, done) => {
    done(null, { id });
});
const authService = new AuthService_1.AuthService();
class AuthController {
    async signup(req, res) {
        try {
            const payload = {
                ...req.body,
                name: req.body.name ?? req.body.fullName
            };
            const user = await authService.registerIndividual(payload);
            res.status(201).json(user);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async register(req, res) {
        try {
            const payload = {
                ...req.body,
                name: req.body.name ?? req.body.fullName
            };
            const user = payload.token
                ? await authService.registerWithInvite(payload)
                : await authService.registerIndividual(payload);
            res.status(201).json(user);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async login(req, res) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.json(result);
        }
        catch (err) {
            res.status(401).json({ message: err.message });
        }
    }
    async me(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const user = await authService.getCurrentUser(userId);
            res.json(user);
        }
        catch (err) {
            res.status(404).json({ message: err.message });
        }
    }
    async logout(req, res) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(" ")[1];
            if (token) {
                await authService.logout(token);
            }
            res.json({ message: "Logged out successfully" });
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    async updateProfile(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const updated = await authService.updateProfile(userId, req.body);
            res.json(updated);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async changePassword(req, res) {
        try {
            const userId = req.user?.id;
            if (!userId) {
                res.status(401).json({ message: "Unauthorized" });
                return;
            }
            const { currentPassword, newPassword } = req.body;
            const result = await authService.changePassword(userId, currentPassword, newPassword);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async requestForgotPasswordOtp(req, res) {
        try {
            const { email } = req.body;
            const result = await authService.requestForgotPasswordOtp(email);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async resetPasswordWithOtp(req, res) {
        try {
            const { email, otp, newPassword } = req.body;
            const result = await authService.resetPasswordWithOtp(email, otp, newPassword);
            res.json(result);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    async setupSuperAdmin(req, res) {
        try {
            // This should be protected or only allowed once
            const user = await authService.createSuperAdmin(req.body);
            res.status(201).json(user);
        }
        catch (err) {
            res.status(400).json({ message: err.message });
        }
    }
    // Google OAuth handlers
    googleAuth(req, res) {
        (0, GoogleStrategy_1.googleAuthenticate)()(req, res, () => { });
    }
    async googleCallback(req, res) {
        try {
            const authFn = (0, GoogleStrategy_1.googleAuthCallback)();
            authFn(req, res, async (err) => {
                if (err) {
                    return res.status(401).json({ message: "Google authentication failed" });
                }
                const user = req.user;
                if (!user || !user.token) {
                    return res.status(401).json({ message: "Authentication failed" });
                }
                // Redirect to frontend with token
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                res.redirect(`${frontendUrl}/oauth-callback?token=${user.token}`);
            });
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
    // GitHub OAuth handlers
    githubAuth(req, res) {
        (0, GitHubStrategy_1.githubAuthenticate)()(req, res, () => { });
    }
    async githubCallback(req, res) {
        try {
            const authFn = (0, GitHubStrategy_1.githubAuthCallback)();
            authFn(req, res, async (err) => {
                if (err) {
                    return res.status(401).json({ message: "GitHub authentication failed" });
                }
                const user = req.user;
                if (!user || !user.token) {
                    return res.status(401).json({ message: "Authentication failed" });
                }
                // Redirect to frontend with token
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                res.redirect(`${frontendUrl}/oauth-callback?token=${user.token}`);
            });
        }
        catch (err) {
            res.status(500).json({ message: err.message });
        }
    }
}
exports.AuthController = AuthController;
