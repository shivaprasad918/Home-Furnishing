const bcrypt = require('bcrypt');
const User = require('../model/userModel');
const config = require("../config/config");
const Order = require('../model/orderSchema');
const Category = require('../model/category');
const Product = require('../model/product');
const puppeteer = require('puppeteer');
const ejs = require('ejs');
const path = require('path');

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        throw new Error('Password hashing failed'); // Error handling for password hashing
    }
};


const loadDashboard = async (req, res) => {
    try {
        // Aggregate to get top 10 best-selling products
        const topProducts = await Order.aggregate([
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.product",
                    totalSold: { $sum: "$products.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $lookup: {
                    from: 'products',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'product'
                }
            },
            { $unwind: "$product" }
        ]);

        // Aggregate to get top 10 best-selling subcategories
        const topSubcategories = await Order.aggregate([
            { $unwind: "$products" },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'products.category',
                    foreignField: '_id',
                    as: 'categoryDetails'
                }
            },
            { $unwind: "$categoryDetails" },
            {
                $group: {
                    _id: "$categoryDetails.subCategory",
                    totalSold: { $sum: "$products.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    subcategoryName: "$_id",
                    totalSold: 1
                }
            }
        ]);

        // Aggregate to get top 10 best-selling brands
        const topBrands = await Order.aggregate([
            { $unwind: "$products" },
            {
                $group: {
                    _id: "$products.brand",
                    totalSold: { $sum: "$products.quantity" }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 10 }
        ]);

        res.render('dashboard', { topProducts, topSubcategories, topBrands });
    } catch (error) {
        console.error('Error loading dashboard:', error);
        res.status(500).send('Internal Server Error');
    }
};












const loadLogin = (req, res) => {
    try {
        res.render('adminLogin');
    } catch (error) {
        console.error('Error loading login page:', error);
        res.status(500).send('Internal Server Error');
    }
};

const verifyLogin = async (req, res) => {
    try {
        const { emailAdmin: email, passAdmin: password } = req.body;
        const { ADMIN_EMAIL: adminEmail, ADMIN_PASSWORD: adminPassword } = process.env;

        if (email === adminEmail && password === adminPassword) {
            req.session.isAdminLoggedIn = email;
            res.redirect('/admin/dashboard');
        } else {
            res.redirect('/admin/');
        }
    } catch (error) {
        console.error('Error verifying login:', error);
        res.status(500).send('Internal Server Error');
    }
};

const adminLogout = async (req, res) => {
    try {
        req.session.isAdminLoggedIn = null;
        res.redirect('/admin/');
    } catch (error) {
        console.error('Error during logout:', error);
        res.status(500).send('Internal Server Error');
    }
};

const loadUser = async (req, res) => {
    try {
        const users = await User.find({ is_verified: true });
        res.render('User', { user: users });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const { userId } = req.params;
        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }

        if (user.is_block === 'active') {
            user.is_block = 'blocked';
        } else if (user.is_block === 'blocked') {
            user.is_block = 'active';
        } else {
            return res.status(400).json({ error: 'Invalid user status' });
        }

        await user.save();
        res.redirect('/admin/user');
    } catch (error) {
        console.error('Error updating user status:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};






const generateSalesReport = async (req, res) => {
    try {
        const { startDate, endDate, reportType } = req.body;

        if (!startDate || !endDate) {
            return res.status(400).json({ error: 'Start date and end date are required.' });
        }

        const startDateTime = new Date(startDate);
        const endDateTime = new Date(endDate);

        startDateTime.setHours(0, 0, 0, 0);
        endDateTime.setHours(23, 59, 59, 999);

        let calculatedStartDateTime = startDateTime;
        let calculatedEndDateTime = endDateTime;

        if (reportType === 'Weekly') {
            const startOfWeek = new Date(startDateTime);
            const endOfWeek = new Date(endDateTime);
            startOfWeek.setDate(startOfWeek.getDate() - startOfWeek.getDay());
            endOfWeek.setDate(endOfWeek.getDate() + (6 - endOfWeek.getDay()));
            calculatedStartDateTime = startOfWeek;
            calculatedEndDateTime = endOfWeek;
        } else if (reportType === 'Monthly') {
            calculatedStartDateTime = new Date(startDateTime.getFullYear(), startDateTime.getMonth(), 1);
            calculatedEndDateTime = new Date(startDateTime.getFullYear(), startDateTime.getMonth() + 1, 0);
        } else if (reportType === 'Yearly') {
            calculatedStartDateTime = new Date(startDateTime.getFullYear(), 0, 1);
            calculatedEndDateTime = new Date(startDateTime.getFullYear(), 11, 31, 23, 59, 59, 999);
        }

        const orders = await Order.find({
            createdAt: {
                $gte: calculatedStartDateTime,
                $lte: calculatedEndDateTime,
            },
        })
            .populate('User')
            .sort({ createdAt: 1 });

        res.json({ orders });

    } catch (error) {
        console.log(error);
        res.status(500).send('Error generating sales report');
    }
};



const renderSalesReportPage = async (req, res) => {
    try {
        res.render('salesReport', { orders: [] });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Error rendering sales report page');
    }
};




const downloadSalesReportPDF = async (req, res) => {
    try {
        const { orders } = req.body;

        if (!orders || orders.length === 0) {
            return res.status(400).send('No orders data provided for the report');
        }

        const browser = await puppeteer.launch({
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            headless: true,
        });
        const page = await browser.newPage();

        const templatePath = path.join(__dirname, '../views/admin/downloadSalesReport.ejs');
        const html = await ejs.renderFile(templatePath, { orders });

        await page.setContent(html, { waitUntil: 'networkidle0' });

        const pdf = await page.pdf({ format: 'A4' });

        await browser.close();

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': 'attachment; filename="sales_report.pdf"',
        }).send(pdf);

        console.log('Sales report PDF downloaded successfully');
    } catch (error) {
        console.error("Error generating sales report PDF:", error.message);
        res.status(500).send('Error generating sales report PDF');
    }
};



const getSalesReportTemplate = async (req, res) => {
    try {
        const { orders } = req.body;
        res.render('downloadSalesReport', { orders });
    } catch (error) {
        console.error("Error in getSalesReportTemplate:", error);
        res.status(500).send(error.toString());
    }
};





const admin404Error = async (req, res) => {
    try {
        res.render('404-admin')
    } catch (error) {
        console.log(error);
    }
}



const chartYear = async (req, res, next) => {
    try {
        const curntYear = new Date().getFullYear();

        const yearChart = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${curntYear - 5}-01-01`),
                        $lte: new Date(`${curntYear}-12-31`),
                    },
                },
            },
            {
                $group: {
                    _id: { $year: "$createdAt" },
                    totalAmount: { $sum: "$totalPrice" },
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);

        res.send({ yearChart });
    } catch (error) {
        next(error);
    }
};


//  Month Chart (Put Method) :-

const monthChart = async (req, res, next) => {
    try {
        const monthName = [
            "January",
            "February",
            "March",
            "April",
            "May",
            "June",
            "July",
            "August",
            "September",
            "October",
            "November",
            "December",
        ];

        const curntYear = new Date().getFullYear();

        const monData = await Order.aggregate([
            {
                $match: {
                    createdAt: {
                        $gte: new Date(`${curntYear}-01-01`),
                        $lte: new Date(`${curntYear}-12-31`),
                    },
                },
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalAmount: { $sum: "$totalPrice" }, // Ensure this field matches your schema
                },
            },
            {
                $sort: { _id: 1 },
            },
        ]);

        const salesData = Array.from({ length: 12 }, (_, i) => {
            const monthData = monData.find((item) => item._id === i + 1);
            return monthData ? monthData.totalAmount : 0;
        });

        res.json({ months: monthName, salesData });
    } catch (error) {
        next(error);
    }
};



module.exports = {
    loadDashboard,
    loadLogin,
    verifyLogin,
    adminLogout,
    loadUser,
    updateUserStatus,
    renderSalesReportPage,
    generateSalesReport,
    downloadSalesReportPDF,
    getSalesReportTemplate,
    admin404Error,
    chartYear,
    monthChart
};