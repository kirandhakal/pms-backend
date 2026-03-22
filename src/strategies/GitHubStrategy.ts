import { Strategy as GitHubStrategy } from "passport-github2";
import passport from "passport";
import { AppDataSource } from "../config/data-source";
import { User, OAuthProvider, UserRole } from "../entities/User";
import { generateToken } from "../utils/auth";

const userRepo = AppDataSource.getRepository(User);

export const configureGitHubStrategy = () => {
    passport.use(
        new GitHubStrategy(
            {
                clientID: process.env.GITHUB_CLIENT_ID || "",
                clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
                callbackURL: process.env.GITHUB_CALLBACK_URL || "/api/auth/github/callback",
            },
            async (accessToken: string, refreshToken: string, profile: any, done: any) => {
                try {
                    // Check if user already exists with this GitHub ID
                    let user = await userRepo.findOne({
                        where: { oauthProvider: OAuthProvider.GITHUB, oauthId: profile.id }
                    });

                    if (user) {
                        // User exists, generate token
                        const token = generateToken({ id: user.id, role: user.role });
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
                            existingUser.oauthProvider = OAuthProvider.GITHUB;
                            existingUser.oauthId = profile.id;
                            user = await userRepo.save(existingUser);
                            const token = generateToken({ id: user.id, role: user.role });
                            return done(null, { user, token });
                        }
                    }

                    // Create new user
                    user = userRepo.create({
                        name: profile.displayName || profile.username || "Unknown",
                        email: email || `${profile.id}@github.local`,
                        oauthProvider: OAuthProvider.GITHUB,
                        oauthId: profile.id,
                        role: UserRole.MEMBER
                    });

                    user = await userRepo.save(user);
                    const token = generateToken({ id: user.id, role: user.role });

                    return done(null, { user, token });
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );
};

export const githubAuthenticate = () => {
    return passport.authenticate("github", { scope: ["user:email"] });
};

export const githubAuthCallback = () => {
    return passport.authenticate("github", { session: false });
};
