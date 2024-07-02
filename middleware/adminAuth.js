

const isLogin = async(req,res,next)=>{
    try {
        if(!req.session.isAdminLoggedIn){
            redirect('/admin/');
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