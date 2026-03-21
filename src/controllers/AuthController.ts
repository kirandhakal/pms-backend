import { Request, Response } from "express";
import { AuthService } from "../services/AuthService";
import { googleAuthenticate, googleAuthCallback, configureGoogleStrategy } from "../strategies/GoogleStrategy";
import { githubAuthenticate, githubAuthCallback, configureGitHubStrategy } from "../strategies/GitHubStrategy";
import passport from "passport";

// Initialize OAuth strategies
configureGoogleStrategy();
configureGitHubStrategy();

// Serialize/Deserialize for session (if needed)
passport.serializeUser((user: any, done) => {
    done(null, user.user.id);
});

passport.deserializeUser(async (id: string, done) => {
    done(null, { id });
});

const authService = new AuthService();

export class AuthController {
    async signup(req: Request, res: Response) {
        try {
            const payload = {
                ...req.body,
                name: req.body.name ?? req.body.fullName
            };
            const user = await authService.registerIndividual(payload);
            res.status(201).json(user);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async register(req: Request, res: Response) {
        try {
            const payload = {
                ...req.body,
                name: req.body.name ?? req.body.fullName
            };

            const user = payload.token
                ? await authService.registerWithInvite(payload)
                : await authService.registerIndividual(payload);

            res.status(201).json(user);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    async login(req: Request, res: Response) {
        try {
            const { email, password } = req.body;
            const result = await authService.login(email, password);
            res.json(result);
        } catch (err: any) {
            res.status(401).json({ message: err.message });
        }
    }

    async logout(req: Request, res: Response) {
        try {
            const authHeader = req.headers.authorization;
            const token = authHeader?.split(" ")[1];
            if (token) {
                await authService.logout(token);
            }
            res.json({ message: "Logged out successfully" });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    async setupSuperAdmin(req: Request, res: Response) {
        try {
            // This should be protected or only allowed once
            const user = await authService.createSuperAdmin(req.body);
            res.status(201).json(user);
        } catch (err: any) {
            res.status(400).json({ message: err.message });
        }
    }

    // Google OAuth handlers
    googleAuth(req: Request, res: Response) {
        googleAuthenticate()(req, res, () => {});
    }

    async googleCallback(req: Request, res: Response) {
        try {
            const authFn = googleAuthCallback();
            authFn(req, res, async (err: any) => {
                if (err) {
                    return res.status(401).json({ message: "Google authentication failed" });
                }
                
                const user = (req as any).user;
                if (!user || !user.token) {
                    return res.status(401).json({ message: "Authentication failed" });
                }

                // Redirect to frontend with token
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                res.redirect(`${frontendUrl}/oauth-callback?token=${user.token}`);
            });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }

    // GitHub OAuth handlers
    githubAuth(req: Request, res: Response) {
        githubAuthenticate()(req, res, () => {});
    }

    async githubCallback(req: Request, res: Response) {
        try {
            const authFn = githubAuthCallback();
            authFn(req, res, async (err: any) => {
                if (err) {
                    return res.status(401).json({ message: "GitHub authentication failed" });
                }
                
                const user = (req as any).user;
                if (!user || !user.token) {
                    return res.status(401).json({ message: "Authentication failed" });
                }

                // Redirect to frontend with token
                const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";
                res.redirect(`${frontendUrl}/oauth-callback?token=${user.token}`);
            });
        } catch (err: any) {
            res.status(500).json({ message: err.message });
        }
    }
}
