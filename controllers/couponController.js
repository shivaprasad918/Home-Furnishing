const Coupon = require('../model/couponSchema');
const User = require('../model/userModel');
const Product = require('../model/product');
const Cart = require('../model/Cart');



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

    
        const couponCode = generateCouponCode();

        // Create new coupon
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
        console.error('Error creating coupon:', error); // Debugging
        res.status(500).json({ error: error.message });
    }
};






const getCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.find()
        res.render('coupon', { coupon })
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


const applyCoupon = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { couponCode } = req.body;

        if (!couponCode) {
            return res.status(400).json({ message: 'Please provide a coupon code.' });
        }

        const cart = await Cart.findOne({ userId }).populate('product.productId');

        if (!cart || cart.product.length === 0) {
            return res.status(400).json({ message: 'No items in the cart to apply a coupon.' });
        }

        const coupon = await Coupon.findOne({ couponCode });

        if (!coupon) {
            return res.status(400).json({ message: 'Invalid coupon code.' });
        }

        const products = cart.product;
        const totalQuantity = products.reduce((acc, product) => acc + product.quantity, 0);

        if (totalQuantity === 0) {
            return res.status(400).json({ message: 'Total quantity is zero. Cannot apply coupon.' });
        }

        const discountPerUnit = coupon.discount / totalQuantity;

        let discountTotalPrice = 0
        products.forEach(product => {
            const discountAmount = Math.floor((product.price * discountPerUnit) / 100);
            product.couponDiscount = discountAmount;
            product.discount = product.price - discountAmount;
            discountTotalPrice += product.discount * product.quantity
        });
        cart.grandTotal = discountTotalPrice

        console.log(cart.grandTotal);

        await cart.save();

        return res.status(200).json({ message: 'Coupon applied successfully', cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};






module.exports = {
    deleteCoupon,
    getCoupon,
    createCoupon,
    applyCoupon
}