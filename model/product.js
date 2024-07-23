const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
    productName: {
        type: String,
        required: true
    },
    category: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Category",
        required: true
    },
    price: {
        type: Number,
        min: 0,
        required: true
    },
    brand:{
        type:String,
        required:true
    },
    offer:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Offer"
      },
    quantity: {
        type: Number,
        min: 0,
        required: true
    },
    description: {
        type: String,
        required: true
    },
    product_image: [
        {
            filename: {
                type: String,
                required: true
            },
            path: {
                type: String,
                required: true
            },
            resizedFile: {
                type: String,
                required: true
            }
        }
    ],
    reviews: [
        {
            user: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true
            },
            rating: {
                type: Number,
                min: 0,
                max: 5,
                required: true
            },
            reviewText: {
                type: String,
                required: true
            },
            createdAt: {
                type: Date,
                default: Date.now
            }
        }
    ],
    isDeleted: {
        type: Boolean,
        default: false
    }
});


module.exports = mongoose.model('product', productSchema);