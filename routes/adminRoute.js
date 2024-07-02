const express = require("express");
const config = require("../config/config");
const adminController = require('../controllers/adminController');
const categoryController = require('../controllers/categoryController');
const productController = require('../controllers/productController');
const couponController = require('../controllers/couponController');
const offerController = require('../controllers/offerController');
const orderController = require('../controllers/orderController');
const upload = require('../config/multerConfig');
const auth = require("../middleware/adminAuth");


const adminRoute = express();

adminRoute.use(express.json());
adminRoute.use(express.urlencoded({ extended: true }));

// Set view engine and views directory
adminRoute.set('view engine', 'ejs');
adminRoute.set('views', './views/admin');

// Admin routes
adminRoute.get('/dashboard', auth.isLogin, adminController.loadDashboard);
adminRoute.get('/', adminController.loadLogin);
adminRoute.post('/', adminController.verifyLogin);
adminRoute.get('/logout', adminController.adminLogout)
adminRoute.get('/user', auth.isLogin, adminController.loadUser);
adminRoute.get('/action/:userId', auth.isLogin, adminController.updateUserStatus);

// Category routes
adminRoute.get('/category', auth.isLogin, categoryController.loadCategory);
adminRoute.post('/category', categoryController.addCategory);
adminRoute.get('/allCategory', auth.isLogin, categoryController.loadEditCategory);
adminRoute.post('/allCategory', categoryController.blockOrUnblock);
adminRoute.get('/updateCategory', auth.isLogin, categoryController.loadUpdateCategory);
adminRoute.post('/updateCategory', categoryController.updateCategory);
adminRoute.post('/delete-category/:id', categoryController.softDeleteCategory);

// Product routes
adminRoute.get('/allProduct', auth.isLogin, productController.loadAllProduct);
adminRoute.get('/addProduct', auth.isLogin, productController.loadAddProduct);
adminRoute.post('/AddProductPost', upload.array('product_image', 3), productController.addProduct);
adminRoute.post('/fetch-subcategory', productController.getSubcategories);
adminRoute.get('/editProduct/:productId', auth.isLogin, productController.renderEditProductPage);
adminRoute.post('/editProduct/:productId', upload.array('product_image', 3), productController.editProduct);
adminRoute.post('/deleteProductImage/:productId', productController.deleteProductImage);
adminRoute.post('/delete-products/:id/delete', productController.softDeleteProducts);

// Order routes
adminRoute.get('/order', auth.isLogin, adminController.getOrder);
adminRoute.post('/order/update-status', adminController.updateOrderStatus);
adminRoute.post('/admin/order/update-status', adminController.changeStatus);


// Coupon routes
adminRoute.post('/createCoupon', couponController.createCoupon);
adminRoute.get('/coupon', auth.isLogin, couponController.getCoupon);
adminRoute.delete('/deleteCoupon/:id', couponController.deleteCoupon);

// Offer routes
adminRoute.post('/createOffer', offerController.createOffer);
adminRoute.get('/offer', auth.isLogin, offerController.getOffers);
adminRoute.delete('/deleteOffer/:id', offerController.deleteOffer);
adminRoute.post('/applyOffer/:productId', productController.applyOffer);


// Return request routes
adminRoute.get('/get-return-reason', orderController.returnReason);
adminRoute.post('/accept-return', orderController.acceptReturn);
adminRoute.post('/reject-return', orderController.rejectReturn);


// sales report

adminRoute.get('/salesreport', auth.isLogin, adminController.renderSalesReportPage);
adminRoute.post('/salesreport', adminController.generateSalesReport);
adminRoute.post('/salesreport/download', adminController.downloadSalesReport);




module.exports = adminRoute;
