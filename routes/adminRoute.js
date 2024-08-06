
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
adminRoute.post('/category', auth.isLogin, categoryController.addCategory);
adminRoute.get('/allCategory', auth.isLogin, categoryController.loadEditCategory);
adminRoute.post('/applyOfferToCategory/:categoryId', categoryController.applyOfferToCategory);
adminRoute.post('/removeOfferFromCategory/:categoryId', categoryController.removeOfferFromCategory);
adminRoute.post('/allCategory', auth.isLogin, categoryController.updateCategorStatus);
adminRoute.get('/updateCategory', auth.isLogin, categoryController.loadUpdateCategory);
adminRoute.post('/updateCategory', auth.isLogin, categoryController.updateCategory);
adminRoute.post('/delete-category/:id', auth.isLogin, categoryController.softDeleteCategory);

// Product routes
adminRoute.get('/allProduct', auth.isLogin, productController.loadAllProduct);
adminRoute.get('/addProduct', auth.isLogin, productController.loadAddProduct);
adminRoute.post('/AddProductPost', auth.isLogin, upload.array('product_image', 3), productController.addProduct);
adminRoute.post('/fetch-subcategory', auth.isLogin, productController.getSubcategories);
adminRoute.get('/editProduct/:productId', auth.isLogin, productController.renderEditProductPage);
adminRoute.post('/editProduct/:productId', auth.isLogin, upload.array('product_image', 3), productController.editProduct);
adminRoute.post('/deleteProductImage/:productId', auth.isLogin, productController.deleteProductImage);
adminRoute.post('/delete-products/:id/delete', auth.isLogin, productController.softDeleteProducts);

// Order routes
adminRoute.get('/order', auth.isLogin, orderController.getOrder);
adminRoute.get('/orders/:orderId', orderController.getOrderDetails);
adminRoute.post('/order/update-status', auth.isLogin, orderController.updateOrderAndProductStatus);
adminRoute.get('/get-return-reason', auth.isLogin, orderController.getReturnReason);
adminRoute.post('/accept-return', auth.isLogin, orderController.acceptReturn);
adminRoute.post('/reject-return', auth.isLogin, orderController.rejectReturn);

// Coupon routes
adminRoute.post('/createCoupon', auth.isLogin, couponController.createCoupon);
adminRoute.get('/coupon', auth.isLogin, couponController.getCoupon);
adminRoute.delete('/deleteCoupon/:id', auth.isLogin, couponController.deleteCoupon);

// Offer routes
adminRoute.post('/createOffer', auth.isLogin, offerController.createOffer);
adminRoute.get('/offer', auth.isLogin, offerController.getOffers);
adminRoute.delete('/deleteOffer/:id', auth.isLogin, offerController.deleteOffer);
adminRoute.post('/applyOffer/:productId', auth.isLogin, productController.applyOffer);
adminRoute.post('/removeOffer/:productId', auth.isLogin, productController.removeOffer);


// sales report

adminRoute.get('/salesreport', auth.isLogin, adminController.renderSalesReportPage);
adminRoute.post('/salesreport', adminController.generateSalesReport);
adminRoute.post('/salesreport/download', adminController.downloadSalesReportPDF);
adminRoute.get('/salesreport/template', adminController.getSalesReportTemplate);


//chart related

adminRoute.put('/chartYear', adminController.chartYear);
adminRoute.put('/monthChart', adminController.monthChart);
adminRoute.get('*', adminController.admin404Error)

module.exports = adminRoute;