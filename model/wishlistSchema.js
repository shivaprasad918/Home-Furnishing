// models/Wishlist.js
const mongoose = require('mongoose');

const WishlistSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    products: [{
        productId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'product', // Reference to the User model
        required: true
        }
    }],
});

module.exports = mongoose.model('Wishlist', WishlistSchema);
