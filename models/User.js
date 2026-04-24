const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    firstName: { type: String, required: true },
    middleName: { type: String },
    lastName: { type: String, required: true },
    email: { 
        type: String, 
        required: function() { return this.isRegistered; }, 
        unique: true, 
        sparse: true 
    },
    phone: { type: String, required: true, unique: true },
    dob: { type: Date },
    username: { 
        type: String, 
        required: function() { return this.isRegistered; }, 
        unique: true, 
        sparse: true 
    },
    password: { 
        type: String, 
        required: function() { return this.isRegistered; } 
    },
    accountNumber: { type: String, unique: true },
    profilePhoto: { type: String },
    isRegistered: { type: Boolean, default: true }, // False if added as external contact
    isVerified: { type: Boolean, default: false }, // OTP verification
    verificationOTP: { type: String },
    verificationExpires: { type: Date },
    resetPasswordOTP: { type: String },
    resetPasswordExpires: { type: Date },
    otpRetries: { type: Number, default: 0 }
}, { timestamps: true });

// Pre-save hook to generate unique Account Number
userSchema.pre('save', async function() {
    if (!this.accountNumber) {
        let unique = false;
        while (!unique) {
            const randomNum = Math.floor(100000 + Math.random() * 900000); // 6 digits
            const accNum = `UA${randomNum}`;
            const existing = await mongoose.models.User.findOne({ accountNumber: accNum });
            if (!existing) {
                this.accountNumber = accNum;
                unique = true;
            }
        }
    }
});

module.exports = mongoose.model('User', userSchema);
