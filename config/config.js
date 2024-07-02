
require('dotenv').config();

module.exports = {
  databaseUrl: process.env.DATABASE_URL || 'mongodb://127.0.0.1:27017/project',
  port: process.env.PORT || 3005,
  sessionSecret: process.env.SESSION_SECRET,
};
