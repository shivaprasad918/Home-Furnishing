const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
    User: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'product', required: true },
        name: { type: String, required: true },
        price: { type: Number, required: true },
        quantity: { type: Number, required: true },
        total: { type: Number, required: true },
        image: { type: String },
        couponDiscount: { type: Number },
        status: { type: String, enum: ['pending', 'shipped', 'delivered', 'cancelled', 'returned','rejected', 'return-requested'], default: 'pending' },
        returnReason: { type: String },
        rejectReason: { type: String },
        refundProcessed: { type: Boolean, default: false },
        category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
        brand: { type: String, required: true }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    orderId: {
        type: String,
    },
    paymentMethod: {
        type: String,
    },
    paymentStatus: {
        type: String,
    },
    refundProcessed: {
        type: Boolean,
        default: false
    },
    coupon: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    discount: {
        type: Number,
        default: 0
    },
    couponName: {
        type: String,
        default: ''
    }
});

module.exports = mongoose.model('Order', orderSchema);
