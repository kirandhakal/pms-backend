import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import passport from "passport";
import { AppDataSource } from "../config/data-source";
import { User, OAuthProvider, UserRole } from "../entities/User";
import { generateToken } from "../utils/auth";

const userRepo = AppDataSource.getRepository(User);

export const configureGoogleStrategy = () => {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID || "",
                clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
                callbackURL: process.env.GOOGLE_CALLBACK_URL || "/api/auth/google/callback",
            },
            async (accessToken: string, refreshToken: string, profile: any, done: any) => {
                try {
                    // Check if user already exists with this Google ID
                    let user = await userRepo.findOne({
                        where: { oauthProvider: OAuthProvider.GOOGLE, oauthId: profile.id }
                    });

                    if (user) {
                        // User exists, generate token
                        const token = generateToken({ id: user.id, role: user.legacyRole });
                        return done(null, { user, token });
                    }

                    // Check if user exists with same email (local account)
                    const existingUser = await userRepo.findOne({
                        where: { email: profile.emails?.[0].value }
                    });

                    if (existingUser) {
                        // Link existing account to Google OAuth
                        existingUser.oauthProvider = OAuthProvider.GOOGLE;
                        existingUser.oauthId = profile.id;
                        user = await userRepo.save(existingUser);
                        const token = generateToken({ id: user.id, role: user.legacyRole });
                        return done(null, { user, token });
                    }

                    // Create new user
                    user = userRepo.create({
                        fullName: profile.displayName || profile.name?.givenName + " " + profile.name?.familyName || "Unknown",
                        email: profile.emails?.[0].value || "",
                        oauthProvider: OAuthProvider.GOOGLE,
                        oauthId: profile.id,
                        legacyRole: UserRole.TEAM_MEMBER
                    });

                    user = await userRepo.save(user);
                    const token = generateToken({ id: user.id, role: user.legacyRole });

                    return done(null, { user, token });
                } catch (error) {
                    return done(error as Error, undefined);
                }
            }
        )
    );
};

export const googleAuthenticate = () => {
    return passport.authenticate("google", { scope: ["profile", "email"] });
};

export const googleAuthCallback = () => {
    return passport.authenticate("google", { session: false });
};
