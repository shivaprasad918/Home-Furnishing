const Cart = require("../model/Cart");
const Product = require("../model/product");
const User = require('../model/userModel');
const Coupon = require('../model/couponSchema')

const addToCart = async (req, res) => {
    const { productId } = req.body;
    console.log(productId);
    const userId = req.session.user_id;

    if (!userId) {
        return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    try {
        const product = await Product.findById(productId).populate('offer')

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }
        if (product.quantity <= 0) {
            return res.status(400).json({ success: false, message: 'Product out of stock' });
        }

        const image = product.product_image[0].resizedFile;
        let price
        if (product.offer) {
            price = Math.floor(product.price - (product.price * product.offer.percentage / 100))
        } else {
            price = product.price
        }

        let cart = await Cart.findOne({ userId });

        if (!cart) {
            cart = new Cart({
                userId,
                product: [{
                    productId: product._id,
                    image,
                    price,
                    quantity: 1,
                    total: price
                }],
                grandTotal: price
            });
            await cart.save();
        } else {
            const existingProductIndex = cart.product.findIndex(item => item.productId.toString() === productId.toString());

            if (existingProductIndex !== -1) {
                const existingProduct = cart.product[existingProductIndex];
                if (existingProduct.quantity < product.quantity) {
                    existingProduct.quantity++;
                    existingProduct.total += price;
                } else {
                    return res.json({ success: false, message: 'Maximum quantity reached' });
                }
            } else {
                cart.product.push({
                    productId: product._id,
                    image,
                    price,
                    quantity: 1,
                    total: price
                });
            }

            cart.grandTotal = cart.product.reduce((total, item) => total + item.total, 0);
            await cart.save();
        }
        

        res.json({ success: true, cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};





const loadCart = async (req, res) => {
    try {
        const userId = req.session.user_id;

        if (!userId) {
            return res.redirect('login');
        }

        const cart = await Cart.findOne({ userId: userId }).populate('product.productId');

        if (!cart) {
            return res.render('cart', { cart: { product: [] }, subtotal: 0, grandTotal: 0 });
        }

        const cartItems = cart.product.filter(item => item.productId);

        const subtotal = cartItems.reduce((sum, item) => sum + item.total, 0);
        const grandTotal = subtotal;

        res.render('cart', { cart, subtotal, grandTotal });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};




const updateCartQuantity = async (req, res) => {
    const { productId, quantity } = req.body;
    const userId = req.session.user_id;

    try {
        const product = await Product.findOne({ _id: productId });
        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        let cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.status(404).json({ success: false, message: 'Cart not found' });
        }

        const productInCart = cart.product.find(item => item.productId.toString() === productId.toString());
        if (!productInCart) {
            return res.status(404).json({ success: false, message: 'Product not found in cart' });
        }

        if (quantity > product.quantity) {
            return res.json({ success: false, message: 'Maximum quantity reached' });
        }

        productInCart.quantity = quantity;
        productInCart.total = productInCart.quantity * productInCart.price;
        cart.grandTotal = cart.product.reduce((total, item) => total + item.total, 0);

        await cart.save();
        res.json({ success: true, cart });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};

const removeFromCart = async (req, res) => {
    try {
        const { productId } = req.body;
        const userId = req.session.user_id;

        const result = await Cart.updateOne(
            { userId: userId },
            { $pull: { product: { productId: productId } } }
        );

        // Send a success response
        res.json({ success: true, message: 'Product removed from cart successfully.' });


    } catch (error) {
        // Handle any errors
        console.log(error);
        res.status(500).json({ success: false, message: 'Internal Server Error' });
    }
};




//-------------------checkout-----------------



const loadCheckout = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const cart = await Cart.findOne({ userId: userId });
        if (!cart) {
            return res.redirect('allproducts');
        }

        if (cart.product.length === 0) {
            return res.render('checkout', { products: [], subtotal: 0, grandTotal: 0, address: null, coupons: [] });
        }

        const products = [];
        let subtotal = 0;

        for (const item of cart.product) {
            const product = await Product.findById(item.productId).populate('offer');

            if (product) {
                let price;
                if (product.offer) {
                    price = Math.floor(product.price - (product.price * product.offer.percentage / 100));
                } else {
                    price = product.price;
                }
                const productTotal = item.quantity * price;
                products.push({
                    name: product.productName,
                    price: price,
                    quantity: item.quantity,
                    total: productTotal,
                });
                subtotal += productTotal;
            } else {
                console.warn(`Product not found: ${item.productId}`);
            }
        }

        const grandTotal = subtotal;

        const user = await User.findById(userId);
        const address = user ? user.address : null;


        let coupons = await Coupon.find();
        coupons = coupons.filter(coupon => coupon.minPurchaseAmount <= subtotal);

        res.render('checkout', { products, subtotal, grandTotal, address, coupons });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};





//add,edit,delete address in checkout


const loadAddressFormCheck = async (req, res) => {
    try {
        res.render('add-address-c')
    } catch (error) {
        console.log(error);
    }
}

const addAddressCheck = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { name, phone, buildingName, city, district, state, postcode } = req.body;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).send('User is not found');
        }

        const addressExists = user.address.some(addr =>
            addr.name === name &&
            addr.phone === phone &&
            addr.buildingName === buildingName &&
            addr.city === city &&
            addr.district === district &&
            addr.state === state &&
            addr.postcode === postcode
        );

        if (addressExists) {
            return res.status(400).send('Address is already used');
        }

        const newAddress = {
            name,
            phone,
            buildingName,
            city,
            district,
            state,
            postcode
        };

        user.address.push(newAddress);
        await user.save();

        res.redirect('/checkout?success=1'); // Redirect with success query parameter
    } catch (error) {
        console.log(error);
        res.status(500).send('Server Error');
    }
};



const deleteAddressCheck = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { addressId } = req.body;


        if (!userId || !addressId) {
            return res.status(400).json({ error: 'Missing user ID or address ID' });
        }

        const updateUser = await User.findOneAndUpdate(
            { _id: userId },
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );

        if (!updateUser) {
            return res.status(404).json({ error: 'User is not found' });
        }

        res.status(200).json({ message: 'Address deleted successfully' });
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};






module.exports = {
    addToCart,
    loadCart,
    removeFromCart,
    loadCheckout,
    updateCartQuantity,
    addAddressCheck,
    deleteAddressCheck,
    loadAddressFormCheck
}