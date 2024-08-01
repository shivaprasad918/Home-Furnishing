const Category = require('../model/category');
const config = require("../config/config");
const Offer = require('../model/offerSchema');




const loadCategory = async (req, res) => {
    try {
        res.render('category')
    } catch (error) {
        console.log(error);
    }
}

const addCategory = async (req, res) => {
    try {
        const { categoryLabel, subcategory, categoryDescription } = req.body;

        const existingCategory = await Category.findOne({ subCategory: subcategory });

        if (existingCategory) {
            res.status(400).json({ error: 'Subcategory already exists' });
        } else {
            const newCategory = new Category({
                categoryName: categoryLabel,
                subCategory: subcategory,
                description: categoryDescription
            });

            await newCategory.save();
            res.status(200).json({ success: 'Category added successfully' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'An error occurred while adding the category' });
    }
};




const loadEditCategory = async (req, res) => {
    try {
        const category = await Category.find({ is_delete: false });
        const offers = await Offer.find({ status: true });
        res.render('allCategory', { category, offers });
    } catch (error) {
        console.log(error);
        res.status(500).send("Internal Server Error");
    }
}

const applyOfferToCategory = async (req, res) => {
    try {
        const { categoryId } = req.params;
        const { offerId } = req.body;

        const category = await Category.findById(categoryId);
        if (!category) {
            return res.status(404).json({ error: 'Category not found' });
        }

        const offer = await Offer.findById(offerId);
        if (!offer) {
            return res.status(404).json({ error: 'Offer not found' });
        }


        category.offers = offer._id
        await category.save();

        res.status(200).json({ message: 'Offer applied to category successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};


const removeOfferFromCategory = async (req, res) => {
    try {
      const { categoryId } = req.params;
  
      const category = await Category.findById(categoryId);
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }
  
      // Remove the offer from the category
      category.offers = null;
      await category.save();
  
      res.status(200).json({ message: 'Offer removed from category successfully' });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  };
  






const updateCategorStatus = async (req, res) => {
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

        await Category.updateOne({ _id: categoryId }, {
            $set: {
                categoryName: categoryLabel,
                subCategory: subcategory,
                description: categoryDescription
            }
        });

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
    applyOfferToCategory,
    removeOfferFromCategory,
    updateCategorStatus,
    loadUpdateCategory,
    updateCategory,
    softDeleteCategory,
}