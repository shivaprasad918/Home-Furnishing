const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
    categoryName: {
        type: String,
        required: true
    },
    subCategory: {
        type: String,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    is_block: {
        type: Boolean,
        default: false
    },
    is_delete: {
        type: Boolean,
        default: false
    },
    offers: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Offer'
    }
});

module.exports = mongoose.model('Category', categorySchema);
