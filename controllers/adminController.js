

const bcrypt = require('bcrypt');
const User = require('../model/userModel');
const config = require("../config/config");
const Order = require('../model/orderSchema');
const ExcelJS = require('exceljs');

const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        throw new Error('Password hashing failed'); // Error handling for password hashing
    }
};

const loadDashboard =async (req, res) => {
    try {
        res.render('dashboard',);
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
        const users = await User.find();
        res.render('User', { user: users });
    } catch (error) {
        console.error('Error loading users:', error);
        res.status(500).send('Internal Server Error');
    }
};

const updateUserStatus = async (req, res) => {
    try {
        const {userId } = req.params;
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
            calculatedEndDateTime = new Date(endDateTime.getFullYear(), endDateTime.getMonth() + 1, 0);
        } else if (reportType === 'Yearly') {
            calculatedStartDateTime = new Date(startDateTime.getFullYear(), 0, 1);
            calculatedEndDateTime = new Date(endDateTime.getFullYear(), 11, 31);
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



const downloadSalesReport = async (req, res) => {
    try {
        const orders = req.body.orders;

        const workbook = new ExcelJS.Workbook();
        const worksheet = workbook.addWorksheet('Sales Report');

        worksheet.addRow(['User Name', 'Date', 'Email', 'Total', 'Payment Method', 'Status']);

        orders.forEach(order => {
            worksheet.addRow([
                order.User ? order.User.name : 'Unknown',
                order.createdAt,
                order.User ? order.User.email : 'Unknown',
                order.totalPrice,
                order.paymentMethod,
                order.status
            ]);
        });

        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', 'attachment; filename=sales_report.xlsx');

        await workbook.xlsx.write(res);
        res.end();

        console.log('Sales report downloaded successfully');
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Error generating sales report');
    }
};

const admin404Error = async(req,res)=>{
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
            totalAmount: { $sum: "$totalPrice" }, // Make sure to use the correct field name
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
    downloadSalesReport,
    admin404Error,
    chartYear,
    monthChart
};
