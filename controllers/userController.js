const User = require('../model/userModel');
const UserOtp = require('../model/userOtpModel');
const bcrypt = require('bcrypt');
const nodeMailer = require('nodemailer');
const Order = require('../model/orderSchema');
const Cart = require("../model/Cart");
const Product = require("../model/product");
const Wallet = require('../model/wallet');

require('dotenv').config();


const securePassword = async (password) => {
    try {
        const passwordHash = await bcrypt.hash(password, 10);
        return passwordHash;
    } catch (error) {
        console.error('Error in securePassword:', error);
        throw new Error('Error in password hashing');
    }
};

const loadHome = async (req, res) => {
    try {
        let user;
        if (req.session.user_id) {
            user = await User.findById(req.session.user_id);
        } else if (req.session.user) {
            // For Google sign-up
            user = req.session.user_id;
        }
        res.render('home', { user });
    } catch (error) {
        console.error('Error in loadHome:', error);
        res.render('error', { message: 'An error occurred while loading the home page' });
    }
};

const loadRegister = async (req, res) => {
    try {
        res.render('register');
    } catch (error) {
        console.error('Error in loadRegister:', error);
        res.render('error', { message: 'An error occurred while loading the registration page' });
    }
};

const insertUser = async (req, res) => {
    try {
        const presentUser = await User.findOne({ email: req.body.email });
        if (presentUser) {
            req.session.registrationMessage = 'User Already Exist';
            return res.redirect('/register');
        } else {
            const hashedPassword = await securePassword(req.body.password);
            const user = new User({
                name: req.body.name,
                email: req.body.email,
                mobile: req.body.mobile,
                password: hashedPassword,
                is_admin: 0
            });

            await user.save();

            const otp = generateOTP();
            sendVerifyEmail(req.body.name, req.body.email, user._id, otp);

            req.session.registrationMessage = 'Your registration has been successful.';
            req.session.user_id = user._id; // Set session variable after registration
            return res.redirect(`/otp?email=${req.body.email}`);
        }
    } catch (error) {
        console.error('Error in insertUser:', error);
        req.session.registrationMessage = 'Your registration has failed.';
        return res.redirect('/register');
    }
};

const loadLogin = async (req, res) => {
    try {
        res.render('login');
    } catch (error) {
        console.error('Error in loadLogin:', error);
        res.render('error', { message: 'An error occurred while loading the login page' });
    }
};

const verifyLogin = async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).render('login', { message: "Email and password are required." });
        }

        const userData = await User.findOne({ email, is_admin: 0 });

        if (!userData) {
            return res.status(401).render('login', { message: "Email or password is incorrect." });
        }
        if (userData.is_block === 'blocked') {
            // If blocked, clear session and redirect to login page
            req.session.destroy();
            return res.status(401).render('login', { message: "Your account has been blocked. Please contact the administrator." });
        }

        const passwordMatch = await bcrypt.compare(password, userData.password);
        if (!passwordMatch) {
            return res.status(401).render('login', { message: "Email or password is incorrect." });
        }

        req.session.user_id = userData._id;
        res.redirect('/');
    } catch (error) {
        console.error(error);
        return res.status(500).render('login', { message: "An error occurred. Please try again later." });
    }
};

// for sending mail

const loadOtp = async (req, res) => {
    try {
        const email = req.query.email;
        console.log(email);
        res.render('otp',{email,message:""});
       
    } catch (error) {
        console.log(error);
    }
}


const generateOTP = () => {
    return Math.floor(1000 + Math.random() * 9000).toString();
}

const sendVerifyEmail = async (name, email, user_id, otp) => {
    console.log(otp)
    try {
        const transporter = nodeMailer.createTransport({
            service: 'gmail',
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS
            }
        });
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'For Verification Email',
            text: `Hello ${name},\n\nYour OTP for verification is: ${otp}`
        };

        // Create a new UserOtp document with userId included
        const newOtp = new UserOtp({
            userId: user_id, // Include userId
            otp: otp
        });

        await newOtp.save(); // Save the new OTP document

        // Send the email
        transporter.sendMail(mailOptions, (error, info) => {
            if (error) {
                console.error('Error occurred while sending email:', error);
            } else {
                console.log('Email sent:', info.response);
            }
        });

    } catch (error) {
        console.log(error);
    }
}

const verifyMail = async (req, res) => {
    try {
        const { otp } = req.body; 
        const email = req.params.id;
        const user = await User.findOne({email:email});
        const userId=user._id
        const userOtp = await UserOtp.findOne({userId:userId});
        const Otp = userOtp.otp
 

        user.is_verified = true;
        await user.save();

        if(otp==Otp){
            res.redirect('/')
        }
        else{
            res.render('otp',{message:"OTP is incorrect"})
        }


    } catch (error) {
        console.log(error);
        // Render the OTP page with an error message in case of any errors
        return res.render('otp', { message: "An error occurred. Please try again later." });
    }
};

const resendOtp = async (req,res)=>{
    try {
        const {email} = req.body;
        const user =await User.findOne({email});
        console.log(user);
        if(!user){
            return res.status(404).render('404')
        }
        const newOTP = generateOTP();
        console.log(newOTP);

        await UserOtp.findOneAndUpdate({userId:user._id},{otp:newOTP}, { upsert: true });

        return res.status(200).json({ message: "OTP resent successfully"});
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error"});
    }
}


const load404Page = async(req,res)=>{
    try {
        res.render('404')
    } catch (error) {
        console.log(error);
    }
}





const userLogout = async(req,res)=>{
    try {
        req.session.destroy((err)=>{
            if(err){
                console.log(err);
            }else{
                res.redirect('/login')
            }
        })  
    } catch (error) {
        console.log(error);
    }
}





const loadProfile = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const orders = await Order.find({ User: userId }).populate('products.product');
        const user = await User.findOne({ _id: userId });

        if (!user) {
            return res.render('404');
        }

        let userWallet = await Wallet.findOne({ userId: userId });

        // If the user doesn't have a wallet, create one
        if (!userWallet) {
            userWallet = new Wallet({ userId: userId });
            await userWallet.save();
            console.log('New wallet created for user');
        }

        let totalRefund = 0;
        let refundTransactions = [];

        // Check for canceled orders and update the wallet
        for (const order of orders) {
            // Only process refunds for orders that are cancelled and not yet refunded
            if (order.status === 'cancelled' && !order.refundProcessed) {
                totalRefund += order.totalPrice;

                // Prepare transaction for the refund
                refundTransactions.push({
                    type: 'credit',
                    reason: 'Order Cancellation',
                    transactionAmount: order.totalPrice,
                    date: new Date()  // Add date to transaction
                });

                // Mark the order as refund processed to avoid duplicate refunds
                order.refundProcessed = true;
                await order.save();
            }
        }

        // Update the wallet balance if there were any refunds
        if (totalRefund > 0) {
            await userWallet.updateBalance(totalRefund);
            userWallet.transactions.push(...refundTransactions);
            await userWallet.save();
        }

        // Calculate total quantity of products for each order
        const orderDetails = orders.map(order => {
            const totalQuantity = order.products.reduce((sum, item) => sum + item.quantity, 0);
            return {
                order,
                totalQuantity
            };
        });

        orderDetails.sort((a, b) => new Date(b.order.createdAt) - new Date(a.order.createdAt));

        res.render('profile', { user, orderDetails, userWallet });
    } catch (error) {
        console.log("Error loading profile:", error);
        res.status(500).send('Internal Server Error');
    }
};










const updateProfile = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { name, number, password, newpassword, confirmpassword } = req.body;

        const user = await User.findById(userId);

        if (!user) {
            return res.status(404).render('404')
        }

        // Update name, email, and mobile
        user.name = name;
        user.mobile = number;

        // Check if user wants to update the password
        if (password && newpassword && confirmpassword) {
            // Verify current password
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).send('Current password is incorrect');
            }

            // Check if new password and confirm password match
            if (newpassword !== confirmpassword) {
                return res.status(400).send('New passwords do not match');
            }

            // Hash the new password
            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newpassword, salt);
        }

        // Save the updated user
        await user.save();

        res.redirect('profile');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

//add,edit,delete address in profile

const loadAddressForm = async (req,res)=>{
    try {
        res.render('user-adress')
    } catch (error) {
        console.log(error);
    }
}


const addNewAddress = async (req,res) => {
    try {
        const userId =  req.session.user_id; 
        const { name, phone, buildingName, city, district, state, postcode } = req.body;

        // Find the user by ID
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('404')
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

        
        res.redirect('/profile')

    } catch (error) {
        console.log(error)
    }
}

const editAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const addressId = req.params.addressId;

        const user = await User.findOne({ _id: userId });
        if (!user) {
            return res.status(404).render('404')
        }

        const address = user.address.id(addressId);
        if (!address) {
            return res.status(404).render('404')
        }
        
        res.render('editAdress', { address }); 
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};


const updateAddress = async (req, res) => {
    try {
        const { addressId, name, phone, buildingName, city, district, state, postcode } = req.body;
        console.log(name,"name");
        const userId = req.session.user_id;


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('404')
        }
        console.log(user);
        console.log( userId);

        // Update the specific address within the user's addresses
        await User.updateOne(
            { _id: userId, 'address._id': addressId },
            {
                $set: {
                    'address.$.name': name,
                    'address.$.phone': phone,
                    'address.$.buildingName': buildingName,
                    'address.$.city': city,
                    'address.$.district': district,
                    'address.$.state': state,
                    'address.$.postcode': postcode
                }
            }
        );

        res.redirect('/profile');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

const deleteAddress = async(req,res)=>{
    try {
        const userId = req.session.user_id;
        const {addressId} = req.body;
        const updateUser = await User.findOneAndUpdate(
            {_id:userId},
            {$pull:{address:{_id:addressId}}},
            {new:true}
        );
        if(!updateUser){
            return res.status(404).json({ error: 'User is not found' });
        }
        res.redirect('/profile')
    } catch (error) {
        console.log(error);
    }
}











module.exports = {
    loadHome,
    loadLogin,
    verifyLogin,
    loadRegister,
    insertUser,
    loadOtp,
    verifyMail,
    userLogout,
    resendOtp,
    loadProfile,
    updateProfile,
    loadAddressForm,
    addNewAddress,
    editAddress,
    updateAddress,
    deleteAddress,
    load404Page
};
