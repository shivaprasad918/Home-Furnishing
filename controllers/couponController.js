const Coupon = require('../model/couponSchema');
const User = require('../model/userModel');
const Product = require('../model/product');



// generatingn automatic coupon code 

const generateCouponCode = () => {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
};

const createCoupon = async (req, res) => {
    try {
        const { couponName, discount, validFrom, validUntil, minPurchaseAmount } = req.body;

        if (!couponName || !discount || !validFrom || !validUntil || !minPurchaseAmount) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const couponCode = generateCouponCode();

        const newCoupon = new Coupon({
            couponName,
            couponCode,
            discount,
            validFrom,
            validUntil,
            minPurchaseAmount,
            users: [] // Assuming no users initially
        });

        await newCoupon.save();

        res.status(201).json({ message: 'Coupon created successfully', coupon: newCoupon });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};



const getCoupon = async (req, res) => {
    try {
       const coupon = await Coupon.find()
        res.render('coupon',{coupon})
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};



const deleteCoupon = async (req, res) => {
    try {
        const { id } = req.params;
        
        const deletedCoupon = await Coupon.findByIdAndDelete(id);
        
        if (!deletedCoupon) {
            return res.status(404).json({ error: 'Coupon not found' });
        }

        res.status(200).json({ message: 'Coupon deleted successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
};


//user side   





module.exports = {
    deleteCoupon,
    getCoupon,
    createCoupon
}