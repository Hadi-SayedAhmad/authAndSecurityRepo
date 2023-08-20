require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const encrypt = require("mongoose-encryption");
const app = express();
const mongoose = require("mongoose");
app.use(express.static("public"));
app.set("view engine", ejs);
app.use(bodyParser.urlencoded({ extended: true }));
mongoose.connect("mongodb://127.0.0.1:27017/userDB");
const port = process.env.PORT || 3000;





const userSchema = new mongoose.Schema({
    email: {
        type: String,
        required: true
    },
    password: {
        type: String,
        required: true
    }
});

userSchema.plugin(encrypt, {secret: process.env.SECRET, encryptedFields: ["password"]});

const User = new mongoose.model("user", userSchema);

app.route("/")
    .get((req, res) => {
        res.render("home.ejs");
    });

app.route("/login")
    .get((req, res) => {
        res.render("login.ejs");
    })
    .post(async (req, res) => {
        const userName = req.body.username;
        const password = req.body.password;
        const user = await User.findOne({ email: userName });
        console.log(user);
        if (user === null) {
            console.log("User not found! Register first.");
        }
        else
        {
            if (user.password === password) {
                res.render("secrets.ejs");
            }
            else {
                console.log("Wrong password!");
            }
        }
    })

app.route("/register")
    .get((req, res) => {
        res.render("register.ejs");
    })
    .post(async (req, res) => {
        const newUser = new User({
            email: req.body.username,
            password: req.body.password
        });
        if (await newUser.save()) {
            res.render("secrets.ejs");
        }
        else {
            console.log("Something went wrong!");
        }
    })

app.listen(port, () => {
    console.log("Server is alive!");
})
