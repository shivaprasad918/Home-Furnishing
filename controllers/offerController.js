const Offer = require('../model/offerSchema');
const Product = require('../model/product')


const createOffer = async (req, res) => {
    try {
        const { name, percentage, startDate, endDate } = req.body;

        if (!name || !percentage || !startDate || !endDate) {
            return res.status(400).json({ message: 'Please provide all required fields' });
        }

        const newOffer = new Offer({
            name,
            percentage,
            startDate,
            endDate
        });

        await newOffer.save();

        res.status(201).json({ message: 'Offer created successfully', offer: newOffer });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const getOffers = async (req, res) => {
    try {
        const offers = await Offer.find();
        console.log(offers);
        res.render('offer', { offers })
        // res.status(200).json({ offers });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

const deleteOffer = async (req, res) => {
    try {
        const { id } = req.params;

        const deletedOffer = await Offer.findByIdAndDelete(id);

        if (!deletedOffer) {
            return res.status(404).json({ error: 'Offer not found' });
        }

        res.status(200).json({ message: 'Offer deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};






module.exports = {
    createOffer,
    getOffers,
    deleteOffer,
};