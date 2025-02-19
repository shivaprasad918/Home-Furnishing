const mongoose = require("mongoose");

const offerSchema = mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    percentage: {
        type: Number,
        required: true
    },
    startDate: {
        type: String,
        required: true
    },
    endDate: {
        type: String,
        required: true
    },
    status: {
        type: Boolean,
        default: true
    }
});

module.exports = mongoose.model("Offer", offerSchema);
