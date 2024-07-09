const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    userId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', // Reference to the User model
        required: true
    },
   
    product:[
       {
        productId:{
            type: mongoose.Schema.Types.ObjectId,
            ref: 'product', // Reference to the User model
            required: true
        },
        
        quantity:{
            type:Number,
            default:1
        },
        image:{
            type:String,
            required:true
        },
        price:{
            type:Number,
            required:true
        },
        total:{
            type:Number,
            required:true
        },
        discount:{
            type:Number
        }
       } 
    ],
    grandTotal:{
        type:Number,
        required:true
    }
    
});

module.exports = mongoose.model("Cart", cartSchema);