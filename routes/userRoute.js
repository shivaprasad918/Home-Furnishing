const express = require("express");
const path = require("path");
const user_route = express();
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const auth = require("../middleware/userAuth");
// const pdf = require('html-pdf');
const ejs = require('ejs');
const orderController = require('../controllers/orderController');
const wishlistController = require('../controllers/wishlistController');
const couponController = require('../controllers/couponController')


user_route.set('view engine', 'ejs');
user_route.set('views', './views/users');

user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));

user_route.get('/', auth.isLogin,auth.isBlocked,auth.isVerified, userController.loadHome);

user_route.get('/register', auth.isLogin, auth.isBlocked, userController.loadRegister);
user_route.post('/register', auth.isLogin, auth.isBlocked, userController.insertUser);

user_route.get('/login', auth.loginPagecheck, auth.isBlocked, userController.loadLogin);
user_route.post('/login', auth.isLogin, auth.isBlocked, userController.verifyLogin);

user_route.get('/otp', auth.isBlocked, userController.loadOtp);
user_route.post('/verify/:id', auth.isLogin, auth.isBlocked, userController.verifyMail);
user_route.post('/resend-otp', auth.isLogin, auth.isBlocked, userController.resendOtp);

user_route.get('/logout', auth.isLogin, auth.isBlocked, userController.userLogout);

user_route.get('/resetPassMail', userController.resetPass);
user_route.post('/reset-password', userController.resetPassword);
user_route.get('/reset-password/:token', userController.verifyResetToken);
user_route.post('/change-password/:token', userController.changePassword);


user_route.get('/orderSuccessPage/:id', auth.isLogin, auth.isBlocked, orderController.loadSuccessPage);

// profile page 
user_route.get('/profile', auth.isLogin, auth.isBlocked, userController.loadProfile);
user_route.post('/update', auth.isLogin, auth.isBlocked, userController.updateProfile);


user_route.get('/allproducts', auth.isLogin, auth.isBlocked, productController.getProducts);

user_route.get('/singleProduct', auth.isLogin, auth.isBlocked, productController.getSingleProduct);
user_route.get('/product/:productId', auth.isLogin, auth.isBlocked, productController.getProductAndRelated);


// ----------cart router starts -----------

user_route.get('/cart', auth.isLogin, auth.isBlocked, cartController.loadCart);
user_route.post('/addtoCart', auth.isLogin, auth.isBlocked, cartController.addToCart);
user_route.post('/removeFromCart', auth.isLogin, auth.isBlocked, cartController.removeFromCart);
user_route.post('/updateCartQuantity', cartController.updateCartQuantity);

//-----------------checkout----------------
user_route.get('/checkout', auth.isLogin, auth.isBlocked, cartController.loadCheckout);
user_route.get('/user-adress-c', auth.isLogin, auth.isBlocked, cartController.loadAddressFormCheck);
user_route.post('/add-address-c', auth.isLogin, auth.isBlocked, cartController.addAddressCheck);
user_route.post('/deleteAddressCheck', auth.isLogin, auth.isBlocked, cartController.deleteAddressCheck);

//profile add new address
user_route.get('/user-adress', auth.isLogin, auth.isBlocked, userController.loadAddressForm);
user_route.post('/add-address', auth.isLogin, auth.isBlocked, userController.addNewAddress);
user_route.get('/editAdress/:addressId', auth.isLogin, auth.isBlocked, userController.editAddress);
user_route.post('/updateAddress', auth.isLogin, auth.isBlocked, userController.updateAddress);
user_route.post('/deleteAddress', auth.isLogin, auth.isBlocked, userController.deleteAddress);

//order 
user_route.post('/placedOrder', auth.isLogin, auth.isBlocked, orderController.placeOrder);
user_route.post('/verifyPayment', auth.isLogin, auth.isBlocked, orderController.razorpayverifyPayment);
user_route.post('/failure', auth.isLogin, auth.isBlocked, orderController.razorpayfailure);
user_route.post('/retryPayment', orderController.retryPayment);


user_route.get('/orderDetailed/:orderId', auth.isLogin, auth.isBlocked, orderController.orderDetailed);
user_route.post('/cancelOrder/:orderId', auth.isLogin, auth.isBlocked, orderController.cancelOrder);
user_route.post('/return-order', auth.isLogin, auth.isBlocked, orderController.returnOrder);
user_route.get('/order/:orderId/invoice', auth.isLogin, auth.isBlocked, orderController.downloadInvoice)
user_route.get('/getInvoice/:orderId', auth.isLogin, auth.isBlocked, orderController.getInvoice)


//apply coupon 

user_route.post('/applyCoupon', auth.isLogin, auth.isBlocked, couponController.applyCoupon);


//wishlist
user_route.post('/addToWishlist', wishlistController.addToWishlist);
user_route.get('/wishlist', auth.isLogin, auth.isBlocked, wishlistController.getUserWishlist);
user_route.delete('/removeWishlistProduct/:productId', wishlistController.removeProductFromWishlist);



user_route.get('*', userController.load404Page);


module.exports = user_route;