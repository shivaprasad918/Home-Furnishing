const express = require('express');
const axios = require('axios');
const User = require('./model/userModel');
require('dotenv').config();

const router = express.Router();

const googleClientID = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const redirectUri = process.env.REDIRECT_URI;

// Initiates the Google Login flow
router.get('/auth/google', (req, res) => {
//   const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientID}&redirect_uri=${redirectUri}&response_type=code&scope=profile email`;
const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientID}&redirect_uri=${redirectUri}&response_type=code&scope=profile email&prompt=select_account`;

  res.redirect(url);
});

// Callback URL for handling the Google Login response
router.get('/auth/google/callback', async (req, res) => {
  const code = req.query.code;

  try {
    // Exchange authorization code for access token
    const { data } = await axios.post('https://oauth2.googleapis.com/token', null, {
      params: {
        client_id: googleClientID,
        client_secret: googleClientSecret,
        code: code,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      },
    });

    const accessToken = data.access_token;

    const { data: profile } = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    // Check if user already exists in database
    let user = await User.findOne({ email: profile.email });

    if (!user) {
      user = new User({
        name: profile.name,
        email: profile.email,
        password: profile.id,
        is_verified:true
      });

      await user.save();
    }

    req.session.user_id = user._id;

 
    res.redirect('/');
  } catch (error) {
    console.error('Error:', error.response);
    res.redirect('/login');
  }
});

module.exports = router;