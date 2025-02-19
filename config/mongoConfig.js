const mongoose = require('mongoose');
const config = require('./config');

// Database connection
mongoose.connect(config.databaseUrl)
    .then(() => console.log('Database connected successfully'))
    .catch(err => console.error('Database connection error:', err));

module.exports = mongoose;

