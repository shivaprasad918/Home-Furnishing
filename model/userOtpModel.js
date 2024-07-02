const mongoose = require("mongoose");

// OTP Schema
const otpSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
    },
    otp: {
        type: String,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now,
        expires: 60 
    }
});

// Export OTP schema
module.exports = mongoose.model('OTP', otpSchema);
