const mongoose = require('mongoose')

const walletSchema = new mongoose.Schema({
    userId : {
        type:mongoose.Schema.Types.ObjectId,
        ref:'User',
        required:true
    },
    balance:{
        type:Number,
        default:0
    },
    transactions:[{
        type:{
            type:String,
            enum:['credit','debit'],
            required:true
        },
        reason:{
            type:String,
            required:true
        },
        date:{
            type:Date,
            default:Date.now
        },
        transactionAmount:{
            type:Number,
            required:true
        }
    }]
})



// Method to update balance
walletSchema.methods.updateBalance = async function(amount) {
    try {
        this.balance += amount;
        await this.save();
        return true;
    } catch (error) {
        throw new Error(error);
    }
};


module.exports=mongoose.model('Wallet',walletSchema)