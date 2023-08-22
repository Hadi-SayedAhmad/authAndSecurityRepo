require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate = require('mongoose-findorcreate')
//db encryption
// const encrypt = require("mongoose-encryption");

//hashing
// const md5 = require("md5");

//hash and salt
// const bcrypt = require("bcrypt");
// const saltRounds = 5;
const mongoose = require("mongoose");
//cookies and sessions:
//1st: require modules
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");


//usage: place the code of app.use just below all the other use and set code

const app = express();

app.use(express.static("public"));
app.set("view engine", ejs);
app.use(bodyParser.urlencoded({ extended: true }));

//hereeeeeeeeeeee
//https://stackoverflow.com/questions/40381401/when-to-use-saveuninitialized-and-resave-in-express-session
app.use(session({
    secret: 'Our little secret',
    resave: false,
    saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB");
const port = process.env.PORT || 3000;





const userSchema = new mongoose.Schema({
    email: String,
    password: String,
    googleId: String,
    secret: String
});

userSchema.plugin(passportLocalMongoose);//used to hash and salt and save
userSchema.plugin(findOrCreate);

// userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("user", userSchema);

passport.use(User.createStrategy()); //local strategy to authenticate users using email and pass 

// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser()); // this 2 lines will not work for google auth, use passport serializing
//serialize: create the cookie and put the data in it
//deserialize: destroy the cookie and get the data
passport.serializeUser(function (user, cb) {
    process.nextTick(function () {
        cb(null, { id: user.id, username: user.username });
    });
});

passport.deserializeUser(function (user, cb) {
    process.nextTick(function () {
        return cb(null, user);
    });
});


passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets"
},
    function (accessToken, refreshToken, profile, cb) {
        console.log(profile);
        User.findOrCreate({ googleId: profile.id }, function (err, user) {
            return cb(err, user);
        });
    }
));




app.route("/")
    .get((req, res) => {
        res.render("home.ejs");
    });


app.route("/auth/google")
    .get(passport.authenticate('google', { scope: ['profile'] }))


app.get('/auth/google/secrets',
    passport.authenticate('google', { failureRedirect: '/register' }),
    function (req, res) {
        // Successful authentication, redirect secrets.
        res.redirect('/secrets');
    });



app.route("/login")
    .get((req, res) => {
        res.render("login.ejs");
    })
    .post((req, res) => {
        const user = new User({
            username: req.body.username,
            password: req.body.password
        });
        req.login(user, (err) => {
            //req.login(user, ...: It's a method provided by Passport.js that is used to establish a session for the user. This means that after successful authentication, the user's session will contain information about their authentication status.
            if (err) {
                console.log(err);

            }
            else {
                passport.authenticate("local")(req, res, () => { //This is a function provided by Passport.js that performs user authentication using the "local" strategy. It checks the user's credentials (typically, username and password) provided in the request against the credentials stored in your application's database.
                    //passport.authenticate("local"): This is like a security check to see if the user's provided information (like username and password) is correct.

                    // (req, res, () => { ... }): Immediately after that security check, this function does something based on whether the check passed or not.

                    res.redirect("/secrets");
                });

            }
        })


    })


app.route("/submit")
    .get((req, res) => {
        if (req.isAuthenticated()) {
            res.render("submit.ejs");
        }
        else {
            res.redirect("/login");
        }
    })
    .post(async (req, res) => {
        const submittedSecret = req.body.secret;
        console.log(req.user.id)
        const user = await User.findById(req.user.id);

        user.secret = submittedSecret;
        await user.save();
        res.redirect("/secrets");

    })


app.route("/logout")
    .get((req, res) => {
        req.logout((err) => {
            if (err) { console.log(err); }
            res.redirect('/');
        });
    })


// const userName = req.body.username;
// const password = req.body.password;
// const user = await User.findOne({ email: userName });
// if (user === null) {
//     console.log("User not found! Register first.");
// }
// else
// {
//     bcrypt.compare(password, user.password, (err, result) => {
//         if (result == true) {
//             res.render("secrets.ejs");
//         }
//         else {
//             console.log("Wrong password!");
//         }
//     });

// }


app.route("/secrets")
    .get(async (req, res) => {
        const foundUsers = await User.find({ "secret":{ $ne:null } });
        res.render("secrets.ejs", {usersWithSecrets: foundUsers});
    });


app.route("/register")
    .get((req, res) => {
        res.render("register.ejs");
    })
    .post((req, res) => {

        User.register({ username: req.body.username, }, req.body.password, function (err, user) {
            if (err) {
                console.log(err);
                res.redirect("/register");
            }
            else {
                passport.authenticate("local")(req, res, () => {
                    res.redirect("/secrets");
                })
            }
        })
    })

// bcrypt.hash(req.body.password, saltRounds, async (err, hash) => {
//     const newUser = new User({
//         email: req.body.username,
//         password: hash
//     });
//     if (await newUser.save()) {
//         res.render("secrets.ejs");
//     }
//     else {
//         console.log("Something went wrong!");
//     }
// })



app.listen(port, () => {
    console.log("Server is alive!");
})
