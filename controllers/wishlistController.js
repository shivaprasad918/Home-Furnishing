// controllers/wishlistController.js
const Wishlist = require('../model/wishlistSchema');
const Product = require('../model/product');



const addToWishlist = async (req, res) => {
    const { productId } = req.body;
    const userId = req.session.user_id; // Assuming you have user authentication set up


    try {
        let wishlist = await Wishlist.findOne({ user: userId });

        if (!wishlist) {
            wishlist = new Wishlist({
                user: userId,
                products: [{ productId: productId }]
            });
        } else {
            const existingProduct = wishlist.products.find(item => item.productId.toString() === productId.toString());
            if (existingProduct) {
                return res.status(400).json({ message: 'Product already exists in the wishlist' });
            } else {
                wishlist.products.push({ productId: productId });
            }
        }

        await wishlist.save();
        res.status(200).json({ message: 'Product added to wishlist successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Server error' });
    }
};

const getUserWishlist = async (req, res) => {
    const { user_id } = req.session;
    if (!user_id) {
        return res.redirect('login');
    }
    try {
        const wishlist = await Wishlist.findOne({ user: user_id }).populate('products.productId');

        if (wishlist && wishlist.products) {
            wishlist.products = wishlist.products.filter(product => product.productId !== null);
        }

        res.render('wishlist', { wishlist });
    } catch (error) {
        console.log(error);
        res.status(500).send('Internal Server Error');
    }
};




const removeProductFromWishlist = async (req, res) => {
    try {
        const userId = req.session.user_id; // Use session to get user_id
        console.log("User ID:", userId);

        const productId = req.params.productId; // Extract productId from request parameters
        console.log("Product ID:", productId);

        const wishlist = await Wishlist.findOneAndUpdate(
            { user: userId },
            { $pull: { products: { productId: productId } } },
            { new: true }
        );

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        res.status(200).json({ message: 'Product removed from wishlist' });
    } catch (error) {
        console.error('Server error:', error);
        res.status(500).json({ message: 'Server error', error });
    }
};









module.exports = {
    addToWishlist,
    removeProductFromWishlist,
    getUserWishlist,
}