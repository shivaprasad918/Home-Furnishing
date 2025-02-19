

const isLogin = async(req,res,next)=>{
    try {
        if(!req.session.isAdminLoggedIn){
           res.redirect('/admin');
        }
        else{
            next()
        }
    } catch (error) {
        console.log(error); 
    }
}


module.exports = {
    isLogin,
}