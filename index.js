require('dotenv').config();
const express = require('express');
const path = require('path');
const nocache = require('nocache');
const session = require('express-session');
const config = require('./config/config');
require('./config/mongoConfig');

const app = express();

app.use(nocache());
app.use(express.static(path.join(__dirname, 'public')));

// Session configuration
app.use(session({
  secret: config.sessionSecret,
  resave: false,
  saveUninitialized: true,
}));

const userRoute = require('./routes/userRoute');
const adminRoute = require('./routes/adminRoute');
const googleAuth = require('./googleAuth');

app.use('/admin', adminRoute);
app.use('/', userRoute);
app.use('/', googleAuth);


app.listen(config.port, () => {
  console.log(`Server running at http://localhost:${config.port}/`);
});
