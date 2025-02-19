const mongoose = require('mongoose');

const CouponSchema = mongoose.Schema({
    couponName: {
        type: String,
        required: true
    },
    couponCode: {
        type: String,
        required: true
    },
    discount: {
        type: Number,
        required: true
    },
    validFrom: {
        type: String,
        required: true,
    },
    validUntil: {
        type: String,
        required: true
    },
    minPurchaseAmount: {
        type: Number,
        required: true
    },
    users: [{
        userID: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        }
    }]
});

module.exports = mongoose.model('Coupon', CouponSchema);
