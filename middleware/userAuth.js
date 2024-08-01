const User=require('../model/userModel')

const isLogin = async(req,res,next)=>{
    try {
        if(!req.session){
            res.redirect('/');
        }
        else{
            next()
        }
    } catch (error) {
        console.log(error);
    
    }
}

const loginPagecheck = async(req,res,next)=>{
    try {
        if(!req.session.user_id){
            next()
        }
        else{
            res.redirect('/')
        }
    } catch (error) {
        console.log(error);
    }
}


//blocking the user
const isBlocked = async (req, res, next) => {
    try {
        // Check if the user is logged in
        if (req.session && req.session.user_id) {
            const userId = req.session.user_id;

            const userData = await User.findById(userId);

            // Check if the user is blocked by the admin
            if (userData && userData.is_block === 'blocked') {
               
                req.session.user_id=null
                    return res.redirect('/');
        
            }
        }
        next();
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};

const isVerified = async (req, res, next) => {
    try {
        if (req.session.user_id) {
            const user = await User.findById(req.session.user_id);

            if (!user || !user.is_verified) {
                req.session.destroy(err => {
                    if (err) {
                        console.log(err);
                        return res.status(500).send('Internal Server Error');
                    }
                    return res.redirect('/otp');
                });
            } else {
                next();
            }
        } else {
            next();
        }
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};




module.exports = {
    isLogin,
    isBlocked,
    loginPagecheck,
    isVerified
}