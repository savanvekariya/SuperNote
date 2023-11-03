const express = require('express');
const router = express.Router();
const path = require('path');
const mongoose = require('mongoose');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const session = require('express-session');
const passport = require('passport');
const faceapi = require('@vladmandic/face-api');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');
const Note = require('./models/Note');
const indexRouter = require('./routes/index');
const MongoStore = require('connect-mongo');
const dotenv = require('dotenv');

dotenv.config();

const app = express();
app.use(express.json());

//app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static('public'));


//for dynamic
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({ mongoUrl: process.env.MONGODB_URI })
}));

app.use(passport.initialize());
app.use(passport.session());


// Configure the Google OAuth strategy
passport.use(
    new GoogleStrategy(
        {
            clientID: process.env.CLIENT_ID,
            clientSecret: process.env.CLIENT_SECRET,
            callbackURL: 'https://supernote.onrender.com/auth/google/secret', // Replace with your callback URL
            userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"
            
        },
        async (accessToken, refreshToken, profile, done) => {
            try {
              // Check if the user already exists in your database by their Google ID
              let user = await User.findOne({ googleId: profile.id });
      
              if (!user) {
                // If the user doesn't exist, check if the email exists
                user = await User.findOne({ email: profile.emails[0].value });
      
                if (!user) {
                  // If the email doesn't exist, create a new user
                  user = new User({
                    googleId: profile.id,
                    email: profile.emails[0].value,
                    username: profile.displayName,
                    // Add any other fields you want to save from the Google profile
                  });
                  await user.save();
                } else {
                  // Update the existing user's information (e.g., username)
                  user.username = profile.displayName;
                  // Add any other updates as needed
                  await user.save();
                }
              }
      
              return done(null, user);
            } catch (err) {
              return done(err);
            }
          }
    )
);

function generateUniqueEmail() {
    const uniqueSuffix = Math.random().toString(36).substring(2, 10); // Generate a random string
    return `unique-email-${uniqueSuffix}@example.com`; // Customize the email format as needed
  }


// Passport configuration
passport.use(new LocalStrategy(User.authenticate()));

// After your Passport strategies and before app routes

passport.serializeUser((user, done) => {
    done(null, user.id); // This stores the user.id in the session
});

passport.deserializeUser(async (id, done) => {
    try {
        const user = await User.findById(id);
        done(null, user);
    } catch (err) {
        console.error("Error deserializing user:", err);
        done(err, null);
    }
});
app.get('/auth/google', passport.authenticate('google', { scope: ['profile','email'] }));

app.get(
  '/auth/google/secret',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    // Successful authentication, redirect to the home page or wherever you want
    res.redirect('/profile');
  }
);


app.get('/logout', (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error('Error during logout:', err);
        // Handle the error as needed
      }
      // Redirect to the desired page after successful logout
      res.redirect('/');
    });
  });
  


// Connect to MongoDB, define routes, and start server...

app.use('/', indexRouter);
app.use(express.static('public'));


// mongoose.connect('mongodb://localhost/myapp', {useNewUrlParser: true, useUnifiedTopology: true});
mongoose.connect(`${process.env.MONGODB_URI}Supernote`, {
    useNewUrlParser: true,
    useUnifiedTopology: true
}).then(() => {
    console.log(`connection sucessful`);
}).catch((e) => {
    console.log(`no connection`);
    console.log(e);
})

app.listen(3000, () => console.log('Server is running on port 3000'));

module.exports = router;