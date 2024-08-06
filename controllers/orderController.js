
const Order = require('../model/orderSchema');
const Cart = require('../model/Cart');
const Coupon = require('../model/couponSchema')
const User = require('../model/userModel');
const Product = require('../model/product');
const path = require('path');
const mongoose = require('mongoose');
const Razorpay = require('razorpay');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const puppeteer = require("puppeteer")
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
        const coupon = couponCode ? await Coupon.findOne({ couponCode }) : null;

        if (!selectedAddress) {
            return res.status(400).json({ message: 'Please select an address.' });
        }

        if (!paymentMethod) {
            return res.status(400).json({ message: 'Please select a payment method.' });
        }

        if (!cart || cart.product.length === 0) {
            return res.status(400).json({ message: 'No items in the cart to place an order.' });
        }

        const uniqueOrderId = generateUniqueID(5);

        const products = cart.product.map(cartProduct => {
            const discount = cartProduct.discount || cartProduct.price; // Default to 0 if undefined
            const total = discount * cartProduct.quantity; // Calculate total

            if (isNaN(total)) {
                throw new Error(`Invalid total for product ${cartProduct.productId._id}: discount=${discount}, quantity=${cartProduct.quantity}`);
            }

            return {
                product: cartProduct.productId._id,
                name: cartProduct.productId.productName,
                price: cartProduct.price,
                quantity: cartProduct.quantity,
                total: total, // Ensure total is valid
                image: cartProduct.productId.product_image[0].resizedFile,
                couponDiscount: discount !== cartProduct.price ? discount : 0,
                status: 'pending',
                category: cartProduct.productId.category,
                brand: cartProduct.productId.brand
            };
        });

        const totalPrice = products.reduce((acc, cartProduct) => acc + cartProduct.total, 0);

        const order = new Order({
            User: userId,
            products: products,
            totalPrice: totalPrice,
            address: selectedAddress,
            orderId: uniqueOrderId,
            status: 'pending',
            paymentStatus: 'pending',
            paymentMethod: paymentMethod,
            coupon: coupon ? coupon._id : null,
            couponName: coupon ? coupon.couponName : '',
            discount: coupon ? coupon.discount : 0
        });

        await order.save();

        if (paymentMethod === 'cash on delivery') {
            await Cart.findOneAndUpdate({ userId }, { product: [], grandTotal: 0 });
            return res.status(200).json({ message: 'Order placed successfully', order });
        } else if (paymentMethod === 'wallet') {
            // Implement wallet payment logic here
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
        res.status(500).json({ message: 'Internal Server Error', error: error.message });
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
        console.log('receipt', receipt);

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

const razorpayfailure = async (req, res) => {
    try {
        const { receipt, error, mongodbOrderIds } = req.body;

        await Order.updateOne({ _id: mongodbOrderIds }, { $set: { paymentStatus: 'failed' } });
        res.json({ success: true, message: 'Payment failure handled' });
    } catch (error) {
        console.error('Error handling payment failure:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};


const retryPayment = async (req, res) => {
    try {
        const orderId = req.body.orderId;
        const order = await Order.findById(orderId);


        const uniqueOrderId = generateUniqueID(5);
        const razorpayOrder = await generateRazorpay(uniqueOrderId, order.totalPrice);

        await Order.updateOne({ _id: orderId }, { $set: { paymentStatus: 'paid' } });

        return res.json({ order, razorpayOrder, razor: 'razorpay' });
    } catch (error) {
        console.error('Error retrying payment:', error);
        return res.status(500).json({ message: 'Failed to retry payment', error: error.message });
    }
};







const loadSuccessPage = async (req, res) => {
    try {
        const id = req.params.id
        res.render('orderSuccessPage', { orderId: id });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
};






const orderDetailed = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate('products.product')
            .populate('User')
            .populate('coupon');
        if (!order) {
            return res.status(404).send('Order not found');
        }

        res.render('orderDetailed', { order });
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
}



const cancelOrder = async (req, res) => {
    const { productId } = req.body;
    const { orderId } = req.params;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).send('Order not found');
        }

        const product = order.products.find(prod => prod._id.toString() === productId);

        if (!product) {
            return res.status(404).send('Product not found in order');
        }

        product.status = 'cancelled';

        await order.save();

        res.status(200).send('Product cancelled successfully');
    } catch (error) {
        console.error('Error cancelling product:', error);
        res.status(500).send('Internal Server Error');
    }
};



// return order 
const returnOrder = async (req, res) => {
    const { orderId, productId, reason } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const product = order.products.find(prod => prod._id.toString() === productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        product.status = 'return-requested';
        product.returnReason = reason;

        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error returning product:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const downloadInvoice = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId).populate('User').exec();
        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
          });
        const page = await browser.newPage();
        const invoiceUrl = `https://homefurnishing.fun/getInvoice/${orderId}`;
        console.log("invoiceUrl : ",invoiceUrl);
        
        await page.goto(invoiceUrl, { waitUntil: 'networkidle2' });
        const pdf = await page.pdf({ format: 'A4' });

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="hn.pdf"',
        });
        console.log("res.send : ");
        res.send(pdf);

    } catch (error) {
        console.error("Error in downloadInvoice:", error);
        res.status(500).send(error.toString());
    }
}


const getInvoice = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId).populate('User').exec();

        res.render('invoice', { order })
    } catch (error) {

    }
}


//admin side


const getOrder = async (req, res) => {
    try {
        const orders = await Order.find()
            .populate('User') 
            .populate('products.product') 
            .populate('products.category'); 
        res.render('order', { orders });
    } catch (error) {
        console.error('Error fetching orders:', error);
        res.status(500).send('Internal Server Error');
    }
};


const getOrderDetails = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate('User')
            .populate('products.product')
            .populate('coupon');

        res.render('adminOrderDetailed', { order });
    } catch (error) {
        console.error('Error fetching order details:', error);
        res.status(500).send('Internal Server Error');
    }
}




const updateOrderAndProductStatus = async (req, res) => {
    const { orderId, productId, status } = req.body;

    if (!orderId || !productId || !status) {
        return res.status(400).json({ success: false, message: 'Invalid request data' });
    }

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        if (order.paymentStatus === 'failed') {
            return res.status(403).json({ success: false, message: 'Cannot update status. Payment failed.' });
        }

        const productToUpdate = order.products.find(product => product._id.toString() === productId);

        if (!productToUpdate) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        productToUpdate.status = status;

        const deliveredCount = order.products.filter(p => p.status === 'delivered').length;

        if (order.paymentMethod.toLowerCase() === 'cash on delivery') {
            if (deliveredCount === order.products.length) {
                order.paymentStatus = 'Paid';
            } else if (deliveredCount > 0) {
                order.paymentStatus = `${deliveredCount} Paid`;
            } else {
                order.paymentStatus = 'Pending';
            }
        }

        await order.save();

        res.json({ success: true, message: 'Product status updated successfully', product: productToUpdate });
    } catch (error) {
        console.error('Error updating product status:', error);
        res.status(500).json({ success: false, message: 'Failed to update product status' });
    }
};




const getReturnReason = async (req, res) => {
    const { orderId, productId } = req.query;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const product = order.products.find(product => product._id.toString() === productId);
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        res.json({ success: true, reason: product.returnReason });
    } catch (error) {
        console.error('Error fetching return reason:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


const acceptReturn = async (req, res) => {
    const { orderId, productId } = req.body;

    try {
        const order = await Order.findById(orderId);

        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const productToUpdate = order.products.find(product => product._id.toString() === productId);

        if (!productToUpdate) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        productToUpdate.status = 'returned';

        // Save the updated order
        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error approving return:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};

const rejectReturn = async (req, res) => {
    const { orderId, productId, reason } = req.body;

    try {
        const order = await Order.findById(orderId);
        if (!order) {
            return res.status(404).json({ success: false, message: 'Order not found' });
        }

        const productToUpdate = order.products.find(product => product._id.toString() === productId);

        if (!productToUpdate) {
            return res.status(404).json({ success: false, message: 'Product not found in order' });
        }

        productToUpdate.status = 'rejected';
        productToUpdate.rejectReason = reason;


        await order.save();

        res.json({ success: true });
    } catch (error) {
        console.error('Error rejecting return:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


module.exports = {
    placeOrder,
    orderDetailed,
    cancelOrder,
    returnOrder,
    downloadInvoice,
    getInvoice,
    razorpayverifyPayment,
    razorpayfailure,
    loadSuccessPage,
    getOrder,
    getOrderDetails,
    updateOrderAndProductStatus,
    getReturnReason,
    acceptReturn,
    rejectReturn,
    retryPayment
};