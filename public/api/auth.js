/**
 * Authentication API - Enterprise SaaS Implementation
 * Senior Software Engineer Level
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

const router = express.Router();

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_KEY
);

// Rate limiting for auth endpoints
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 5, // limit each IP to 5 requests per windowMs for auth
    message: {
        error: 'Too many authentication attempts, please try again later.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED'
    }
});

// Email configuration
const emailTransporter = nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: true,
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
    }
});

// Validation schemas
const registerValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character'),
    body('full_name')
        .isLength({ min: 2, max: 100 })
        .withMessage('Full name must be between 2 and 100 characters')
        .trim()
        .escape()
];

const loginValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required'),
    body('password')
        .notEmpty()
        .withMessage('Password is required')
];

const forgotPasswordValidation = [
    body('email')
        .isEmail()
        .normalizeEmail()
        .withMessage('Valid email is required')
];

const resetPasswordValidation = [
    body('token')
        .notEmpty()
        .withMessage('Reset token is required'),
    body('password')
        .isLength({ min: 8 })
        .withMessage('Password must be at least 8 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain uppercase, lowercase, number and special character')
];

// Error handler
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({
            error: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors.array()
        });
    }
    next();
};

// JWT token generation
const generateTokens = (userId) => {
    const accessToken = jwt.sign(
        { sub: userId, type: 'access' },
        process.env.JWT_SECRET,
        { expiresIn: '15m' }
    );

    const refreshToken = jwt.sign(
        { sub: userId, type: 'refresh' },
        process.env.JWT_REFRESH_SECRET,
        { expiresIn: '7d' }
    );

    return { accessToken, refreshToken };
};

/**
 * POST /api/auth/register
 * Register new user
 */
router.post('/register',
    authLimiter,
    registerValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { email, password, full_name } = req.body;

            // Check if user already exists
            const { data: existingUser } = await supabase
                .from('users')
                .select('id')
                .eq('email', email)
                .single();

            if (existingUser) {
                return res.status(409).json({
                    error: 'User already exists with this email',
                    code: 'USER_EXISTS'
                });
            }

            // Hash password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Generate email verification token
            const emailVerificationToken = crypto.randomBytes(32).toString('hex');

            // Create user
            const userData = {
                email,
                password_hash: hashedPassword,
                full_name,
                email_verification_token: emailVerificationToken,
                email_verified: false,
                role: 'user',
                subscription_tier: 'free',
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            };

            const { data: user, error } = await supabase
                .from('users')
                .insert([userData])
                .select('id, email, full_name, role, subscription_tier, email_verified')
                .single();

            if (error) {
                console.error('Database error:', error);
                return res.status(500).json({
                    error: 'Failed to create user',
                    code: 'DATABASE_ERROR'
                });
            }

            // Send verification email
            try {
                const verificationUrl = `${process.env.FRONTEND_URL}/verify-email?token=${emailVerificationToken}`;
                
                await emailTransporter.sendMail({
                    from: process.env.FROM_EMAIL,
                    to: email,
                    subject: 'Verify your email address',
                    html: `
                        <h2>Welcome to Portfolio SaaS!</h2>
                        <p>Please click the link below to verify your email address:</p>
                        <a href="${verificationUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Verify Email</a>
                        <p>This link will expire in 24 hours.</p>
                    `
                });
            } catch (emailError) {
                console.error('Email sending error:', emailError);
                // Don't fail registration if email fails
            }

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user.id);

            // Store refresh token
            await supabase
                .from('refresh_tokens')
                .insert([{
                    user_id: user.id,
                    token: refreshToken,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }]);

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: user.id,
                    action: 'user_registered',
                    resource_type: 'user',
                    metadata: { email }
                }]);

            res.status(201).json({
                message: 'User registered successfully. Please check your email for verification.',
                data: {
                    user,
                    tokens: {
                        accessToken,
                        refreshToken
                    }
                }
            });

        } catch (error) {
            console.error('Registration error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/auth/login
 * User login
 */
router.post('/login',
    authLimiter,
    loginValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { email, password } = req.body;

            // Get user with password hash
            const { data: user, error } = await supabase
                .from('users')
                .select('*')
                .eq('email', email)
                .single();

            if (error || !user) {
                return res.status(401).json({
                    error: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Check if account is locked
            if (user.account_locked_until && new Date(user.account_locked_until) > new Date()) {
                return res.status(423).json({
                    error: 'Account is temporarily locked due to too many failed login attempts',
                    code: 'ACCOUNT_LOCKED'
                });
            }

            // Verify password
            const isValidPassword = await bcrypt.compare(password, user.password_hash);

            if (!isValidPassword) {
                // Increment failed login attempts
                const failedAttempts = (user.failed_login_attempts || 0) + 1;
                const updateData = { failed_login_attempts: failedAttempts };

                // Lock account after 5 failed attempts
                if (failedAttempts >= 5) {
                    updateData.account_locked_until = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes
                }

                await supabase
                    .from('users')
                    .update(updateData)
                    .eq('id', user.id);

                return res.status(401).json({
                    error: 'Invalid email or password',
                    code: 'INVALID_CREDENTIALS'
                });
            }

            // Reset failed login attempts on successful login
            await supabase
                .from('users')
                .update({
                    failed_login_attempts: 0,
                    account_locked_until: null,
                    last_login_at: new Date().toISOString()
                })
                .eq('id', user.id);

            // Generate tokens
            const { accessToken, refreshToken } = generateTokens(user.id);

            // Store refresh token
            await supabase
                .from('refresh_tokens')
                .insert([{
                    user_id: user.id,
                    token: refreshToken,
                    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
                }]);

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: user.id,
                    action: 'user_login',
                    resource_type: 'user',
                    metadata: { 
                        ip: req.ip,
                        user_agent: req.get('User-Agent')
                    }
                }]);

            // Remove sensitive data
            const { password_hash, email_verification_token, ...safeUser } = user;

            res.json({
                message: 'Login successful',
                data: {
                    user: safeUser,
                    tokens: {
                        accessToken,
                        refreshToken
                    }
                }
            });

        } catch (error) {
            console.error('Login error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
router.post('/refresh', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(401).json({
                error: 'Refresh token required',
                code: 'REFRESH_TOKEN_MISSING'
            });
        }

        // Verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_SECRET);

        // Check if refresh token exists in database
        const { data: tokenRecord, error } = await supabase
            .from('refresh_tokens')
            .select('*')
            .eq('token', refreshToken)
            .eq('user_id', decoded.sub)
            .single();

        if (error || !tokenRecord || new Date(tokenRecord.expires_at) < new Date()) {
            return res.status(401).json({
                error: 'Invalid or expired refresh token',
                code: 'INVALID_REFRESH_TOKEN'
            });
        }

        // Generate new tokens
        const { accessToken, refreshToken: newRefreshToken } = generateTokens(decoded.sub);

        // Update refresh token in database
        await supabase
            .from('refresh_tokens')
            .update({
                token: newRefreshToken,
                expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
            })
            .eq('id', tokenRecord.id);

        res.json({
            data: {
                tokens: {
                    accessToken,
                    refreshToken: newRefreshToken
                }
            }
        });

    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(401).json({
            error: 'Token refresh failed',
            code: 'TOKEN_REFRESH_FAILED'
        });
    }
});

/**
 * POST /api/auth/logout
 * User logout
 */
router.post('/logout', async (req, res) => {
    try {
        const { refreshToken } = req.body;

        if (refreshToken) {
            // Remove refresh token from database
            await supabase
                .from('refresh_tokens')
                .delete()
                .eq('token', refreshToken);
        }

        res.json({
            message: 'Logout successful'
        });

    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            error: 'Internal server error',
            code: 'INTERNAL_ERROR'
        });
    }
});

/**
 * POST /api/auth/forgot-password
 * Request password reset
 */
router.post('/forgot-password',
    authLimiter,
    forgotPasswordValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { email } = req.body;

            // Check if user exists
            const { data: user } = await supabase
                .from('users')
                .select('id, email, full_name')
                .eq('email', email)
                .single();

            // Always return success to prevent email enumeration
            if (!user) {
                return res.json({
                    message: 'If an account with that email exists, a password reset link has been sent.'
                });
            }

            // Generate reset token
            const resetToken = crypto.randomBytes(32).toString('hex');
            const resetTokenExpiry = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

            // Store reset token
            await supabase
                .from('users')
                .update({
                    password_reset_token: resetToken,
                    password_reset_expires: resetTokenExpiry
                })
                .eq('id', user.id);

            // Send reset email
            try {
                const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
                
                await emailTransporter.sendMail({
                    from: process.env.FROM_EMAIL,
                    to: email,
                    subject: 'Password Reset Request',
                    html: `
                        <h2>Password Reset Request</h2>
                        <p>You requested a password reset. Click the link below to reset your password:</p>
                        <a href="${resetUrl}" style="background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
                        <p>This link will expire in 1 hour.</p>
                        <p>If you didn't request this, please ignore this email.</p>
                    `
                });
            } catch (emailError) {
                console.error('Email sending error:', emailError);
            }

            res.json({
                message: 'If an account with that email exists, a password reset link has been sent.'
            });

        } catch (error) {
            console.error('Forgot password error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

/**
 * POST /api/auth/reset-password
 * Reset password with token
 */
router.post('/reset-password',
    resetPasswordValidation,
    handleValidationErrors,
    async (req, res) => {
        try {
            const { token, password } = req.body;

            // Find user with valid reset token
            const { data: user, error } = await supabase
                .from('users')
                .select('id, password_reset_token, password_reset_expires')
                .eq('password_reset_token', token)
                .single();

            if (error || !user || new Date(user.password_reset_expires) < new Date()) {
                return res.status(400).json({
                    error: 'Invalid or expired reset token',
                    code: 'INVALID_RESET_TOKEN'
                });
            }

            // Hash new password
            const saltRounds = 12;
            const hashedPassword = await bcrypt.hash(password, saltRounds);

            // Update password and clear reset token
            await supabase
                .from('users')
                .update({
                    password_hash: hashedPassword,
                    password_reset_token: null,
                    password_reset_expires: null,
                    updated_at: new Date().toISOString()
                })
                .eq('id', user.id);

            // Invalidate all refresh tokens
            await supabase
                .from('refresh_tokens')
                .delete()
                .eq('user_id', user.id);

            // Log activity
            await supabase
                .from('activity_logs')
                .insert([{
                    user_id: user.id,
                    action: 'password_reset',
                    resource_type: 'user'
                }]);

            res.json({
                message: 'Password reset successful'
            });

        } catch (error) {
            console.error('Reset password error:', error);
            res.status(500).json({
                error: 'Internal server error',
                code: 'INTERNAL_ERROR'
            });
        }
    }
);

module.exports = router;