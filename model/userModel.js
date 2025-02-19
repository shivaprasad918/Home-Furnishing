
const mongoose = require("mongoose");

// User Schema
const userSchema = new mongoose.Schema({
    name: {
        type: String,
        // required: true
    },
    email: {
        type: String,
        // required: true
    },
    mobile: {
        type: Number,
        // required: true
    },
    password: {
        type: String,
        // required: true
    },
    is_admin: {
        type: Number,
        default: false
    },
    is_verified: {
        type: Boolean,
        default: false
    },
    is_block: {
        type: String,
        default: 'active'
    },
    given_name: {
        type: String
    },
    family_name: {
        type: String
    },
    picture: {
        type: String
    },
    address: [{
        name: { type: String, required: true },
        phone: { type: String, required: true },
        buildingName: { type: String, required: true },
        city: { type: String, required: true },
        district: { type: String, required: true },
        state: { type: String, required: true },
        postcode: { type: String, required: true }
    }],
    resetPasswordToken: {
        type: String,
        required: false
    },
    resetPasswordExpires: {
        type: Date,
        required: false
    },
    referralCode: {
        type: String,
        unique: true
    },  
});

module.exports = mongoose.model('User', userSchema);