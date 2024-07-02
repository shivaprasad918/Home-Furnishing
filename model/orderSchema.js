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
        image: { type: String }
    }],
    totalPrice: {
        type: Number,
        required: true
    },
    status: {
        type: String,
        enum: ['pending', 'processing', 'shipped', 'delivered','cancelled','returned','return-requested'],
        default: 'pending'
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    paymentMethod: {
        type: String,
        // required:true
    },
    returnReason: {
        type: String
    },
    refundProcessed: {
        type: Boolean,
        default: false
    }
});

module.exports = mongoose.model('Order', orderSchema);
