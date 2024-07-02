const Order = require('../model/orderSchema');
const Cart = require('../model/Cart');
const Coupon=require('../model/couponSchema')
const User = require('../model/userModel');
const Product = require('../model/product');
const mongoose = require('mongoose'); 
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');

const razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET_KEY
});

function generateUniqueID(length) {
    return uuidv4().replace(/-/g, '').substring(0, length);
}

function generateRazorpay(orderId, totalPrice) {
    return new Promise((resolve, reject) => {
        const options = {
            amount: totalPrice * 100, // Amount in paise
            currency: 'INR',
            receipt: `${orderId}`
        };
        razorpayInstance.orders.create(options, (err, order) => {
            if (err) {
                reject(err);
            } else {
                resolve(order);
            }
        });
    });
}


const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const cart = await Cart.findOne({ userId }).populate('product.productId');
        const { selectedAddress, paymentMethod, couponCode } = req.body;


        if (!selectedAddress) {
            return res.status(400).json({ message: 'Please select an address.' });
        }

        if (!paymentMethod) {
            return res.status(400).json({ message: 'Please select a payment method.' });
        }

        if (!cart || cart.product.length === 0) {
            return res.status(400).json({ message: 'No items in the cart to place an order' });
        }

        const uniqueOrderId = generateUniqueID(5);

        const products = await Promise.all(cart.product.map(async (cartProduct) => {
            const productDetails = await Product.findById(cartProduct.productId);
           console.log(cartProduct.price);
            productDetails.quantity -= cartProduct.quantity;
            await productDetails.save();
            return {
                product: cartProduct.productId,
                name: productDetails.productName,
                price: cartProduct.price,
                quantity: cartProduct.quantity,
                total: cartProduct.price * cartProduct.quantity,
                image: productDetails.product_image[0].resizedFile,
            };
        }));

        let totalPrice = products.reduce((acc, cartProduct) => acc + cartProduct.total, 0);

        // Apply coupon discount if a coupon code is provided
        if (couponCode) {
            const coupon = await Coupon.findOne({ couponCode });
            if (coupon) {
                const discountAmount = totalPrice * (coupon.discount / 100);
                totalPrice -= discountAmount;
            } else {
                return res.status(400).json({ message: 'Invalid coupon code' });
            }
        }

        const order = new Order({
            User: userId,
            products: products,
            totalPrice: totalPrice,
            address: selectedAddress,
            orderId: uniqueOrderId,
            status: 'pending',
            paymentMethod: paymentMethod
        });

        await order.save();

        if (paymentMethod === 'cash on delivery') {
            await Cart.findOneAndUpdate({ userId }, { product: [], grandTotal: 0 });
            return res.status(200).json({ message: 'Order placed successfully', order });
        } else if (paymentMethod === 'wallet') {
            // Write the wallet payment code here
        } else if (paymentMethod === 'razorpay') {
            try {
                const razorpayOrder = await generateRazorpay(uniqueOrderId, totalPrice);
                return res.json({ order, razorpayOrder, razor: 'razorpay' });
            } catch (error) {
                console.error(error);
                return res.status(500).json({ message: 'Internal Server Error' });
            }
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};







const orderDetailed = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
                                .populate('products.product')
                                .populate('User');
        if (!order) {
            return res.status(404).send('Order not found');
        }
        res.render('orderDetailed', { order }); // Pass the single order to the template
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}

const cancelOrder = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        order.status = 'cancelled';
        order.refundProcessed = false;  
        await order.save();

        res.redirect('/orderDetailed');
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};


const razorpayverifyPayment = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { order: { receipt }, payment: { razorpay_payment_id, razorpay_order_id, razorpay_signature } } = req.body;
        const secretKey = process.env.RAZORPAY_SECRET_KEY;
        
        const hmac = crypto.createHmac('sha256', secretKey)
                           .update(`${razorpay_order_id}|${razorpay_payment_id}`)
                           .digest('hex');

        if (hmac === razorpay_signature) {
            await Order.updateOne({ orderId: receipt }, { $set: { paymentStatus: 'paid' } });
            await Cart.findOneAndUpdate({ userId }, { product: [], grandTotal: 0 });

            res.json({ success: true, orderid: receipt });
        } else {
            res.json({ success: false, message: 'Payment verification failed' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



const loadSuccessPage = async (req, res) => {
    try {
        const id=req.params.id
        res.render('orderSuccessPage', { orderId: id });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};





// return order 
const returnOrder = async (req,res) => {
    const { orderId, reason } = req.body;
    
    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = 'return-requested';
        order.returnReason = reason; 
        await order.save();

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const returnReason = async (req,res) => {

    const { orderId } = req.query;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }
      

        res.json({ success: true, reason: order.returnReason });
    } catch (error) {
        console.error('Error fetching return reason:', error);
      
        res.status(500).json({ success: false, message: 'Server error' });
    }
}

const acceptReturn =  async (req,res) => { 
    const { orderId } = req.body;
   

    try {
        const order = await Order.findById(orderId);
    
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = 'returned';
        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error approving return:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}


const rejectReturn = async (req,res) => {
    const { orderId } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        order.status = 'delivered';
        order.returnReason = ''; // Clear the return reason
        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error rejecting return:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
}



module.exports = {
    placeOrder,
    orderDetailed,
    cancelOrder,
    razorpayverifyPayment,
    loadSuccessPage,
    returnOrder,
    returnReason,
    acceptReturn,
    rejectReturn
};
