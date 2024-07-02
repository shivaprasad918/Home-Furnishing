const Category = require('../model/category');
const config = require("../config/config");




const loadCategory = async(req,res)=>{
    try {
        res.render('category')
    } catch (error) {
        console.log(error);
    }
}

const addCategory = async(req,res)=>{
    try {
        const { categoryLabel, subcategory,categoryDescription} = req.body;
        const newCategory = new Category({
            categoryName: categoryLabel,
            subCategory:subcategory,
            description:categoryDescription
        });

        // Save the category to the database
        await newCategory.save();
        res.redirect('/admin/category')
        
    } catch (error) {
        console.log(error);
    }
}


const loadEditCategory = async (req, res) => {
    try {
        const category = await Category.find({ is_delete: false }); // Filter out categories with is_delete: true
        res.render('allCategory', { category });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
}


const blockOrUnblock = async (req, res) => {
    try {
        const categoryId = req.query.id;
        const category = await Category.findById(categoryId);

        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        // Toggle the block status
        category.is_block = !category.is_block;
        await category.save();

        res.redirect('/admin/allCategory')
    } catch (error) {
        console.log(error);
        res.status(500).json({ error: 'Internal server error' });
    }
};


const loadUpdateCategory = async (req, res) => {
    try {
        const categoryId = req.query.id;
        const category = await Category.findById(categoryId);
    
        if (!category) {
          return res.status(404).send('Category not found');
        }
    
        res.render('updateCategory', { category });
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
}

const updateCategory = async (req, res) => {
    try {
        const categoryId = req.body.categoryId;
        const { categoryLabel, subcategory, categoryDescription } = req.body;
    
    await Category.updateOne({_id:categoryId}, {$set:{
        categoryName: categoryLabel,
        subCategory: subcategory,
        description: categoryDescription
 }}); 
     
        res.redirect('/admin/allCategory'); // Redirect to category list (adjust)
      } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
      }
}

const softDeleteCategory = async (req, res) => {
    try {
        const categoryId = req.params.id;
        const category = await Category.findById(categoryId);

        category.is_delete = true; // Mark as soft deleted
        await category.save();
        res.redirect('/admin/allCategory'); 
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error"); // Add error handling
    }
}


module.exports = {
    loadCategory,
    addCategory,
    loadEditCategory,
    blockOrUnblock,
    loadUpdateCategory,
    updateCategory,
    softDeleteCategory,
}