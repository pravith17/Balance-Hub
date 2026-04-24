const User = require('../models/User');
const AuditLog = require('../models/AuditLog');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { sendOTP } = require('../services/emailService');

const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

exports.register = async (req, res) => {
    try {
        const { firstName, middleName, lastName, email, phone, dob, username, password } = req.body;

        // Check if user exists
        let userExists = await User.findOne({ $or: [{ email }, { phone }, { username }] });
        
        if (userExists) {
            if (userExists.isRegistered) {
                return res.status(400).json({ success: false, message: 'User already exists with this email, phone, or username' });
            } else {
                // Was added as external, now registering
                userExists.firstName = firstName;
                userExists.middleName = middleName;
                userExists.lastName = lastName;
                userExists.email = email;
                userExists.dob = dob;
                userExists.username = username;
                userExists.password = await bcrypt.hash(password, 10);
                userExists.isRegistered = true;
                
                const otp = Math.floor(100000 + Math.random() * 900000).toString();
                userExists.verificationOTP = await bcrypt.hash(otp, 10);
                userExists.verificationExpires = Date.now() + 5 * 60 * 1000;
                
                await userExists.save();
                
                await sendOTP(userExists, otp, 'registration');
                
                return res.status(200).json({ success: true, message: 'OTP sent to email for verification' });
            }
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        
        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        const hashedOTP = await bcrypt.hash(otp, 10);

        const user = await User.create({
            firstName, middleName, lastName, email, phone, dob, username, password: hashedPassword, isRegistered: true,
            isVerified: false, verificationOTP: hashedOTP, verificationExpires: Date.now() + 5 * 60 * 1000
        });

        await sendOTP(user, otp, 'registration');

        res.status(200).json({ success: true, message: 'OTP sent to email for verification' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.verifyRegistration = async (req, res) => {
    try {
        const { email, otp } = req.body;
        const user = await User.findOne({ email, verificationExpires: { $gt: Date.now() } });

        if (!user || !user.verificationOTP) {
            return res.status(400).json({ success: false, message: 'OTP is invalid or has expired' });
        }

        const isValid = await bcrypt.compare(otp, user.verificationOTP);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        user.isVerified = true;
        user.verificationOTP = undefined;
        user.verificationExpires = undefined;
        await user.save();

        await AuditLog.create({ userId: user._id, action: 'USER_REGISTERED' });

        res.status(201).json({
            success: true,
            token: generateToken(user._id),
            user: { id: user._id, username: user.username, email: user.email }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.login = async (req, res) => {
    try {
        const { identifier, password } = req.body; // identifier can be email or phone

        const user = await User.findOne({ 
            $or: [{ email: identifier }, { phone: identifier }],
            isRegistered: true 
        });

        if (user && (await bcrypt.compare(password, user.password))) {
            if (!user.isVerified) {
                return res.status(403).json({ success: false, message: 'Account not verified. Please register again to receive OTP.' });
            }
            await AuditLog.create({ userId: user._id, action: 'USER_LOGIN' });
            res.json({
                success: true,
                token: generateToken(user._id),
                user: { id: user._id, username: user.username, email: user.email }
            });
        } else {
            res.status(401).json({ success: false, message: 'Invalid credentials' });
        }
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.forgotPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email, isRegistered: true });

        if (!user) {
            return res.status(404).json({ success: false, message: 'User not found' });
        }

        if (user.otpRetries >= 5) {
            return res.status(429).json({ success: false, message: 'Max OTP retries reached. Contact support.' });
        }

        const otp = Math.floor(100000 + Math.random() * 900000).toString();
        user.resetPasswordOTP = await bcrypt.hash(otp, 10);
        user.resetPasswordExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
        user.otpRetries += 1;
        
        await user.save();

        await sendOTP(user, otp, 'password_reset');

        res.json({ success: true, message: 'OTP sent to email' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.resetPassword = async (req, res) => {
    try {
        const { email, otp, newPassword } = req.body;
        const user = await User.findOne({ 
            email, 
            resetPasswordExpires: { $gt: Date.now() } 
        });

        if (!user || !user.resetPasswordOTP) {
            return res.status(400).json({ success: false, message: 'OTP is invalid or has expired' });
        }

        const isValid = await bcrypt.compare(otp, user.resetPasswordOTP);
        if (!isValid) {
            return res.status(400).json({ success: false, message: 'Invalid OTP' });
        }

        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordOTP = undefined;
        user.resetPasswordExpires = undefined;
        user.otpRetries = 0;
        await user.save();

        await AuditLog.create({ userId: user._id, action: 'PASSWORD_RESET' });

        res.json({ success: true, message: 'Password reset successful' });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
