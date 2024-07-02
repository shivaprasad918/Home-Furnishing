const express = require("express");
const path = require("path");
const user_route = express();
const userController = require('../controllers/userController');
const productController = require('../controllers/productController');
const cartController = require('../controllers/cartController');
const auth = require("../middleware/userAuth");
const orderController = require('../controllers/orderController');
const wishlistController = require('../controllers/wishlistController');
const couponController = require('../controllers/couponController')


user_route.set('view engine', 'ejs');
user_route.set('views', './views/users');

user_route.use(express.json());
user_route.use(express.urlencoded({ extended: true }));

user_route.get('/', auth.isLogin, auth.isBlocked, userController.loadHome);

user_route.get('/register', auth.isLogin, auth.isBlocked, userController.loadRegister);
user_route.post('/register', userController.insertUser);

user_route.get('/login', auth.isLogin, auth.isBlocked, userController.loadLogin);
user_route.post('/login', userController.verifyLogin);

user_route.get('/otp', auth.isBlocked, userController.loadOtp);
user_route.post('/verify/:id', userController.verifyMail);
user_route.post('/resend-otp', userController.resendOtp);

user_route.get('/404', userController.load404Page);
user_route.get('/orderSuccessPage/:id', orderController.loadSuccessPage);

// profile page 
user_route.get('/profile', auth.isLogin, auth.isBlocked, userController.loadProfile);
user_route.post('/update', userController.updateProfile);

user_route.get('/logout', auth.isLogin, auth.isBlocked, userController.userLogout);

user_route.get('/allproducts', auth.isLogin, auth.isBlocked, productController.getProducts);

user_route.get('/singleProduct', auth.isLogin, auth.isBlocked, productController.getSingleProduct);
user_route.get('/product/:productId', auth.isLogin, auth.isBlocked, productController.getProductAndRelated);


// ----------cart router starts -----------

user_route.get('/cart', auth.isLogin, auth.isBlocked, cartController.loadCart);
user_route.post('/addtoCart', cartController.addToCart);
user_route.post('/removeFromCart', cartController.removeFromCart);
user_route.post('/updateCartQuantity', cartController.updateCartQuantity);

//-----------------checkout----------------
user_route.get('/checkout', auth.isLogin, auth.isBlocked, cartController.loadCheckout);
user_route.get('/user-adress-c', auth.isBlocked, cartController.loadAddressFormCheck);
user_route.post('/add-address-c', cartController.addAddressCheck);
user_route.post('/deleteAddressCheck', cartController.deleteAddressCheck);

//profile add new address
user_route.get('/user-adress', auth.isLogin, auth.isBlocked, userController.loadAddressForm);
user_route.post('/add-address', userController.addNewAddress);
user_route.get('/editAdress/:addressId', auth.isLogin, auth.isBlocked, userController.editAddress);
user_route.post('/updateAddress', userController.updateAddress);
user_route.post('/deleteAddress', userController.deleteAddress);

//order 
user_route.post('/placedOrder', orderController.placeOrder);
user_route.post('/verifyPayment', orderController.razorpayverifyPayment);
user_route.get('/orderDetailed/:orderId', auth.isLogin, auth.isBlocked, orderController.orderDetailed);
user_route.post('/cancelOrder/:orderId', orderController.cancelOrder);

//wishlist
user_route.post('/addToWishlist', wishlistController.addToWishlist);
user_route.get('/wishlist', auth.isLogin, auth.isBlocked, wishlistController.getUserWishlist);
user_route.delete('/removeWishlistProduct/:productId', wishlistController.removeProductFromWishlist);

// return request
user_route.post('/return-order', orderController.returnOrder);


module.exports = user_route;
