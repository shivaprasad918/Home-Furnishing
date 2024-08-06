const User = require('../model/userModel');
const UserOtp = require('../model/userOtpModel');
const bcrypt = require('bcrypt');
const nodeMailer = require('nodemailer');
const Order = require('../model/orderSchema');
const Cart = require("../model/Cart");
const Product = require("../model/product");
const Wallet = require('../model/wallet');
const crypto = require('crypto');

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
        const products = await Product.find({})
        if (req.session.user_id) {
            user = await User.findById(req.session.user_id);
        } else if (req.session.user) {
            // For Google sign-up
            user = req.session.user_id;
        }
        res.render('home', { user, products });
    } catch (error) {
        console.error('Error in loadHome:', error);
        res.render('error', { message: 'An error occurred while loading the home page' });
    }
};

const loadRegister = async (req, res) => {
    try {
        res.render('register', { registrationMessage: req.session.registrationMessage || null });
    } catch (error) {
        console.error('Error in loadRegister:', error);
        res.render('error', { message: 'An error occurred while loading the registration page' });
    }
};



const insertUser = async (req, res) => {
    try {
        const presentUser = await User.findOne({ email: req.body.email });
        if (presentUser) {
            req.session.registrationMessage = 'User Already Exists';
            return res.redirect('/register');
        }

        const hashedPassword = await securePassword(req.body.password);
        const referralCode = await generateUniqueReferralCode(); // Await the function
        const user = new User({
            name: req.body.name,
            email: req.body.email,
            mobile: req.body.mobile,
            password: hashedPassword,
            is_admin: 0,
            referralCode: referralCode,
        });

        await user.save(); // Save the user to get the _id

        // Referral logic
        const referral = req.body.referredBy; 
        console.log(referral);

        if (referral) {
            const referrer = await User.findOne({ referralCode: referral });
            if (referrer) {
                console.log("refferererre",referrer);
                console.log("userrrrr",user);
                // Update referrer's wallet
                const referrerWallet = await Wallet.findOne({ userId: referrer._id }) || new Wallet({ userId: referrer._id, balance: 0 });
                referrerWallet.balance += 100;
                await referrerWallet.save();
        
                // Update new user's wallet
                const newUserWallet = await Wallet.findOne({ userId: user._id }) || new Wallet({ userId: user._id, balance: 0 });
                newUserWallet.balance += 100;
                await newUserWallet.save();
        
                console.log(`Referral successful. Referrer and new user both received 100 Rs.`);
            } else {
                console.log('Invalid referral code provided.');
            }
        } else {
            console.log('No referral code provided.');
        }
        
        

        const otp = generateOTP();
        sendVerifyEmail(req.body.name, req.body.email, user._id, otp);

        req.session.user_id = user._id;
        if(user.is_verified) {
            req.session.registrationMessage = 'Your registration has been successful.';
        }

        return res.redirect(`/otp?email=${req.body.email}`);
    } catch (error) {
        console.error('Error in insertUser:', error);
        req.session.registrationMessage = 'Your registration has failed.';
        return res.redirect('/register');
    }
};





const generateUniqueReferralCode = async () => {
    // Function to generate a random alphanumeric string of specified length
    const generateCode = (length) => {
        return crypto.randomBytes(Math.ceil(length / 2))
            .toString('hex')
            .slice(0, length)
            .toUpperCase(); // To ensure the code is alphanumeric and upper case
    };

    let referralCode;
    let isUnique = false;

    while (!isUnique) {
        // Generate a new referral code
        referralCode = generateCode(6); // Adjust the length as needed
        // Check if this code already exists in the database
        const existingUser = await User.findOne({ referralCode });
        if (!existingUser) {
            isUnique = true; // Code is unique
        }
    }

    return referralCode;
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
        res.render('otp', { email, message: "" });

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
        const user = await User.findOne({ email: email });
        const userId = user._id
        const userOtp = await UserOtp.findOne({ userId: userId });
        const Otp = userOtp.otp


        if (otp == Otp) {
            user.is_verified = true;
            user.save()

            
            res.redirect('/')
        }
        else {
            res.render('otp', { email, message: "OTP is incorrect" })
        }


    } catch (error) {
        console.log(error);
        return res.render('otp', { message: "An error occurred. Please try again later." });
    }
};

const resendOtp = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        console.log(user);
        if (!user) {
            return res.status(404).render('404')
        }
        const newOTP = generateOTP();
        console.log(newOTP);

        await UserOtp.findOneAndUpdate({ userId: user._id }, { otp: newOTP }, { upsert: true });

        return res.status(200).json({ message: "OTP resent successfully" });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ error: "Internal server error" });
    }
}



const resetPass = async (req, res) => {
    try {
        res.render('resetPassMail');
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
}

const sendPasswordResetEmail = async (email, token) => {
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
            subject: 'Password Reset Link',
            text: `Click this link to reset your password: http://homefurnishing.fun/reset-password/${token}`,
            html: `<p>Click <a href="http://homefurnishing.fun/reset-password/${token}">here</a> to reset your password.</p>`
        };

        await transporter.sendMail(mailOptions);
        console.log('Password reset email sent');
    } catch (error) {
        console.error('Error sending password reset email:', error);
        throw new Error('Failed to send password reset email');
    }
};

const resetPassword = async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });

        if (!user) {
            return res.status(404).json({ message: 'Email not found' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; 

        await user.save();
        console.log('Token generated:', token);

        await sendPasswordResetEmail(email, token);

        res.json({ message: 'Please check your email' });
    } catch (error) {
        console.error('Error in resetPassword:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};



const verifyResetToken = async (req, res) => {
    try {
        const { token } = req.params;
        console.log(`Received token: ${token}`);

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).send('Invalid or expired token');
        }

        res.render('changePass', { token });
    } catch (error) {
        console.error('Error in verifyResetToken:', error);
        res.status(500).send('Internal Server Error');
    }
};



const changePassword = async (req, res) => {
    try {
        const { token } = req.params;
        const { newPassword, confirmPassword } = req.body;

        if (newPassword !== confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
        }

        console.log('Changing password for token:', token);

        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired token' });
        }

        // Hash the password before saving
        user.password = await bcrypt.hash(newPassword, 10);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        await user.save();

        return res.status(200).json({ success: true });

    } catch (error) {
        console.error('Error in changePassword:', error);
        res.status(500).json({ message: 'Internal Server Error' });
    }
};








const load404Page = async (req, res) => {
    try {
        res.render('404')
    } catch (error) {
        console.log(error);
    }
}



const userLogout = async (req, res) => {
    try {
        req.session.destroy((err) => {
            if (err) {
                console.log(err);
            } else {
                res.redirect('/')
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
            return res.redirect('login');
        }

        let userWallet = await Wallet.findOne({ userId: userId });

        if (!userWallet) {
            userWallet = new Wallet({ userId: userId });
            await userWallet.save();
            console.log('New wallet created for user');
        }

        let totalRefund = 0;
        let refundTransactions = [];

        // Check for canceled products and update the wallet
        for (const order of orders) {
            for (const product of order.products) {
                if (product.status === 'cancelled' && !product.refundProcessed) {
                    totalRefund += product.total;

                    // Prepare transaction for the refund
                    refundTransactions.push({
                        type: 'credit',
                        reason: 'Product Cancellation',
                        transactionAmount: product.total,
                        date: new Date()  // Add date to transaction
                    });

               
                    product.refundProcessed = true;
                }
            }
            await order.save(); 
        }


        if (totalRefund > 0) {
            await userWallet.updateBalance(totalRefund);
            userWallet.transactions.push(...refundTransactions);
            await userWallet.save();
        }

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
            return res.status(404).render('404');
        }

        user.name = name;
        user.mobile = number;

        let passwordChanged = false;

        if (password && newpassword && confirmpassword) {
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                return res.status(400).render('profile', { message: 'Current password is incorrect' });
            }

            if (newpassword !== confirmpassword) {
                return res.status(400).render('profile', { message: 'New passwords do not match' });
            }

            const salt = await bcrypt.genSalt(10);
            user.password = await bcrypt.hash(newpassword, salt);

            passwordChanged = true;
        }

        await user.save();

        if (passwordChanged) {
            return res.redirect('/profile?success=1'); 
        }

        res.redirect('/profile');
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

//add,edit,delete address in profile

const loadAddressForm = async (req, res) => {
    try {
        res.render('user-adress')
    } catch (error) {
        console.log(error);
    }
}


const addNewAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { name, phone, buildingName, city, district, state, postcode } = req.body;


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('404');
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
            return res.status(400).render('error', { message: 'Address is already used' });
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

        res.redirect('/profile');
    } catch (error) {
        console.log(error);
        res.status(500).render('error', { message: 'Server Error' });
    }
};


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
        console.log(name, "name");
        const userId = req.session.user_id;


        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).render('404')
        }
        console.log(user);
        console.log(userId);

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

const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user_id;
        const { addressId } = req.body;
        const updateUser = await User.findOneAndUpdate(
            { _id: userId },
            { $pull: { address: { _id: addressId } } },
            { new: true }
        );
        if (!updateUser) {
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
    resetPass,
    resetPassword,
    verifyResetToken,
    changePassword,
    loadProfile,
    updateProfile,
    loadAddressForm,
    addNewAddress,
    editAddress,
    updateAddress,
    deleteAddress,
    load404Page,
}