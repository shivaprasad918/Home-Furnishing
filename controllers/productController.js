const Product = require('../model/product');
const Category = require('../model/category');
const config = require("../config/config");
const Offer = require('../model/offerSchema');
require('dotenv').config();
const sharp = require("sharp");
const path = require("path");



const loadAddProduct = async(req,res)=>{
    try {
        res.render('addProduct')
    } catch (error) {
        console.log(error);
    }
}


const addProduct = async (req, res) => {
    try {
        const { productName, productPrice, quantity, mainCategory, subCategory, productDescription } = req.body;

        // Find the subcategory ID
        const find = await Category.findOne({ categoryName: mainCategory, subCategory: subCategory });

        if (!find) {
            return res.status(404).send("Category or subcategory not found");
        }
        const subCategory_id = find._id;

        // Process images
        const processedImages = await Promise.all(req.files.map(async (file) => {
            try {
                console.log("process image:", file.filename);
                const resizedFilename = `resized-${file.filename}`;
                const inputFilePath = path.join(__dirname, '../public/upload', file.filename);
                const resizedPath = path.join(__dirname, '../public/upload', resizedFilename);
                await sharp(inputFilePath)
                    .resize({ height: 600, width: 650, fit: 'fill' })
                    .toFile(resizedPath);
                console.log("image upload successfully:", file.filename);
                
                return {
                    filename: file.filename,
                    path: `/upload/${file.filename}`, 
                    resizedFile: `/upload/${resizedFilename}`
                };
            } catch (error) {
                console.log("Error processing image:", error);
                throw error;
            }
        }));




        
        const newProduct = new Product({
            productName: productName,
            category: subCategory_id,
            price: productPrice,
            quantity: quantity,
            description: productDescription,
            product_image: processedImages,
        });

     
        await newProduct.save();

        res.redirect('/admin/allProduct');
    } catch (error) {
        console.error("Error adding product:", error);
        res.status(500).send("Internal Server Error");
    }
};

 



const getSubcategories = async (req, res) => {
    const { selectedOption } = req.body;
    try {
        // Find the category based on the selected option
        const category = await Category.find({ categoryName: selectedOption }).select('subCategory');
    
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Extract subcategories from the category object
        // Send subcategories as response
        res.json({ category });
    } catch (error) {
        console.error('Error fetching subcategories:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    }
};





const loadAllProduct = async (req, res) => {
    try {
        const products = await Product.find({ isDeleted: false }).populate('category');
        const offers = await Offer.find({ status: true }); 

        res.render('allProduct', { products, offers });
    } catch (error) {
        console.log(error);
    }
};


//---------soft delete products--------
const softDeleteProducts = async (req, res) => {
    try {
        const productId = req.params.id;
        // Update the isDeleted field to true for the product with the given id
        const product = await Product.findById(productId);
        
        if (!product) {
            return res.status(404).send("Product not found");
        }

        product.isDeleted = true;
        await product.save(); // Save the changes
        
        res.redirect('/admin/allProduct');
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal Server Error");
    }
}



const renderEditProductPage = async (req, res) => {
    try {

        console.log('edit product page ---------------------')
        const productId = req.params.productId;
        console.log(`Fetching product with ID: ${productId}`); // Debugging line

        // Fetch the product from the database using the ID
        const product = await Product.findById(productId).populate('category');
        
        if (!product) {
            console.error(`Product not found with ID: ${productId}`);
            return res.status(404).send({ error: "Product not found" });
        }

        // Fetch categories from the database
        const categories = await Category.distinct('categoryName', {
            is_delete: false // Add any other conditions if needed
        });
        
        console.log(categories);
        console.log(`Categories fetched: ${categories.length}`); // Debugging line

        // Render the edit product form with product and categories data
        res.render('editProduct', { product, categories });
    } catch (error) {
        console.error("Error rendering edit product page:", error);
        res.status(500).send("Internal Server Error");
    }
};



const editProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const { productName, productPrice, quantity, mainCategory, subCategory, productDescription } = req.body;

        const find = await Category.findOne({ categoryName: mainCategory, subCategory: subCategory });
        if (!find) {
            return res.status(404).send("Category or subcategory not found");
        }
        const subCategory_id = find._id;
        const updateData = {
            productName,
            category: subCategory_id,
            price: productPrice,
            quantity,
            description: productDescription
        };

        if (req.files && req.files.length > 0) {
            const processedImages = await Promise.all(req.files.map(async (file) => {
                try {
                    console.log("process image:", file.filename);
                    const resizedFilename = `resized-${file.filename}`;
                    const inputFilePath = path.join(__dirname, '../public/upload', file.filename);
                    const resizedPath = path.join(__dirname, '../public/upload', resizedFilename);
                    await sharp(inputFilePath)
                        .resize({ height: 600, width: 650, fit: 'fill' })
                        .toFile(resizedPath);
                    console.log("image upload successfully:", file.filename);

                    return {
                        filename: file.filename,
                        path: `/upload/${file.filename}`,
                        resizedFile: `/upload/${resizedFilename}`
                    };
                } catch (error) {
                    console.log("Error processing image:", error);
                    throw error;
                }
            }));
            updateData.product_image = processedImages;
        }

        await Product.findByIdAndUpdate(productId, updateData);
        res.redirect('/admin/allProduct');
    } catch (error) {
        console.error("Error editing product:", error);
        res.status(500).send("Internal Server Error");
    }
};



const deleteProductImage = async (req,res)=>{

    const productId = req.params.productId;
    const imgId = req.query.imgId;

    try {
        // Find the product by ID
        const product = await Product.findById(productId);
        console.log(product);

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        await Product.updateOne({_id:productId},{$pull:{product_image:{_id:imgId}}})

        return res.redirect(`/admin/editProduct/${productId}`);
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Internal server error" });
    }
}



// list product on user side




const getProducts = async (req, res) => {
    try {
        const { sort, category, q, page } = req.query;

        // Pagination parameters
        const perPage = 8;
        const currentPage = parseInt(page, 10) || 1;
        const skip = (currentPage - 1) * perPage;

        const filter = { isDeleted: false };

        // If a category filter is applied and it's not 'all', add it to the filter object
        if (category && category !== 'all') {
            const categoryObjs = await Category.find({
                categoryName: category,
                is_block: false,
                is_delete: false
            });

            if (categoryObjs.length > 0) {
                const categoryIds = categoryObjs.map(cat => cat._id);
                filter.category = { $in: categoryIds };
            } else {
                return res.status(404).send('Category not found');
            }
        }

        // If a search query is provided, add it to the filter
        if (q) {
            filter.productName = { $regex: q, $options: 'i' }; // Case-insensitive regex search
        }

        // Sort products based on the sort parameter
        let sortObj = {};
        if (sort) {
            if (sort === 'priceLowToHigh') {
                sortObj.price = 1;
            } else if (sort === 'priceHighToLow') {
                sortObj.price = -1;
            } else if (sort === 'name') {
                sortObj.productName = 1;
            } else if (sort === 'latest') {
                sortObj.createdAt = -1;
            }
        }

        const totalProducts = await Product.countDocuments(filter);
        const totalPages = Math.ceil(totalProducts / perPage);
        const products = await Product.find(filter)
            .populate('category')
            .populate('offer')
            .sort(sortObj)
            .limit(perPage)
            .skip(skip)
            .exec();

        res.render('allProducts', {
            currentPage,
            totalPages,
            products,
            sortOption: sort || 'default',
            selectedCategory: category || 'all',
            searchTerm: q || '',
            queryParams: `&q=${q || ''}&sort=${sort || 'default'}&category=${category || 'all'}`
        });

    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};














const getSingleProduct = async (req,res)=>{
    try {
        const productId = req.query.productId;
        const product = await Product.findById(productId).populate('category').populate('offer');
        const relatedProducts = await Product.find({
            _id: { $ne: productId },
            category: product.category._id,
            isDeleted: false
        }).limit(4).exec();
        res.render('singleProduct',{product,relatedProducts})
    } catch (error) {
        console.log(error);
    }
}

const getProductAndRelated = async (req, res) => {
    console.log('getProductAndRelated function called'); // Log at the start of the function
    try {
        const productId = req.params.id;
        console.log('Product ID:', productId); // Log the product ID
        const product = await Product.findById(productId).populate('category').exec();

        if (!product) {
            console.log('Product not found');
            return res.status(404).send('Product not found');
        }

        console.log('Product:', product); // Log the fetched product

        const relatedProducts = await Product.find({
            _id: { $ne: productId },
            category: product.category._id,
            isDeleted: false
        }).limit(4).exec();

        console.log('Related Products:', relatedProducts); // Log the related products

        res.render('users/singleProduct', { product: product, relatedProducts: relatedProducts });
    } catch (error) {
        console.error('Error fetching product:', error);
        res.status(500).send('Internal Server Error');
    }
}













//apply offer 

const applyOffer = async (req, res) => {
    try {
        console.log("jf;woejfjwefienfihfi");
        const { productId } = req.params;
        const { offerId } = req.body;

        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ error: 'Product not found' });
        }

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        // Apply offer to product
        product.offer = offer._id;

        await product.save();

        res.status(200).json({ message: 'Offer applied successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};






















module.exports = {
    loadAllProduct,
    loadAddProduct,
    addProduct,
    getSubcategories,
    softDeleteProducts,
    renderEditProductPage,
    editProduct,
    getProducts,
    deleteProductImage,
    getSingleProduct,
    getProductAndRelated,
    applyOffer
}