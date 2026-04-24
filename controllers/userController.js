const User = require('../models/User');

exports.getProfile = async (req, res) => {
    try {
        const user = await User.findById(req.user._id).select('-password -resetPasswordOTP -resetPasswordExpires');
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const { firstName, middleName, lastName, dob } = req.body;
        let updateData = { firstName, middleName, lastName, dob };

        if (req.file) {
            updateData.profilePhoto = `/uploads/${req.file.filename}`;
        }

        const user = await User.findByIdAndUpdate(req.user._id, updateData, { new: true, runValidators: true }).select('-password');
        
        res.json({ success: true, data: user });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.searchUsers = async (req, res) => {
    try {
        const { query } = req.query;
        if (!query) {
            return res.json({ success: true, data: [] });
        }

        // Search by username, phone, or name
        const users = await User.find({
            $or: [
                { username: { $regex: query, $options: 'i' } },
                { phone: { $regex: query, $options: 'i' } },
                { firstName: { $regex: query, $options: 'i' } }
            ]
        }).select('_id firstName lastName username phone isRegistered');

        res.json({ success: true, data: users });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

exports.addExternalContact = async (req, res) => {
    try {
        const { firstName, lastName, phone } = req.body;

        const existingUser = await User.findOne({ phone });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Contact already exists' });
        }

        const externalUser = await User.create({
            firstName,
            lastName,
            phone,
            isRegistered: false
        });

        res.status(201).json({ success: true, data: externalUser });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
