const express = require("express");
const router = express.Router();
const passport = require("passport");
const User = require("../models/user");
const Campground = require("../models/campground");
const Notification = require("../models/notification");
const middleware = require("../middleware"); // dont need '/index.js', express does it by just requiring '/middleware'
const async = require("async");
const nodemailer = require("nodemailer");
const crypto = require("crypto");


// root route
router.get("/", function(req, res){
    res.render("landing");
});

// show register form
router.get("/register", function(req, res){
    res.render("register", {page: "register"});
});
// handle sign-up logic
router.post("/register", function(req, res){
    let newUser = new User({
        username: req.body.username,
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        avatar: req.body.avatar
    });

    if(req.body.adminCode === "secretcode123"){
        newUser.isAdmin = true;
    }
    User.register(newUser, req.body.password, function(err, user){
        if(err){
            console.log(err);
            return res.render("register", {error: err.message});
        }
        passport.authenticate("local")(req, res, function(){
            req.flash("success", "Successfully Signed Up! Welcome to YelpCamp " + user.username);
            res.redirect("/campgrounds");
        })
    });
});

// show login form
router.get("/login", function(req, res){
    res.render("login", {page: "login"});
});

// handling login logic
// app.post(route, middleware, callback){}
//      **from 'passport-local-mongoose' package**
router.post("/login", passport.authenticate("local",
    {
        successRedirect: "/campgrounds",
        failureRedirect: "/register",
    }), function(req, res){
});

// LOGOUT ROUTE
router.get("/logout", function(req, res){
    req.logout();
    req.flash("success", "Logged you out!");
    res.redirect("/campgrounds");
});

// ===========
// FORGOT PASSWORD
// ===========
router.get("/forgot", function(req, res){
    res.render("users/forgot");
});

router.post("/forgot", function(req, res, next){
    async.waterfall([
        function (done) {
            crypto.randomBytes(20, function (err, buf) {
                let token = buf.toString("hex");
                done(err, token);
            });
        },
        function (token, done) {
            User.findOne({email: req.body.email}, function (err, user) {
                if (!user) {
                    req.flash("error", "No account with that email address exists.");
                    return res.redirect('/forgot');
                }
                user.resetPasswordToken = token;
                user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
                user.save(function (err) {
                    done(err, token, user);
                });
            });
        },
        function (token, user, done) {
            let smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: "codemode.io@gmail.com",
                    pass: process.env.GMAILPW
                }
            });
            let mailOptions = {
                to: user.email,
                from: "codemode.io@gmail.com",
                subject: "YelpCamp Password Reset",
                text: "You are receiving this because you (or someone else) have requested the reset of the password to the account associated with this e-mail address. " +
                    "Please click on the following link, or paste this into your web browser to complete the process.\n" +
                    "http://" + req.headers.host + "/reset/" + token + "\n\n" +
                    "If you did not request this, please disregard this message and your password will remain unchanged."
            };
            smtpTransport.sendMail(mailOptions, function(err) {
                console.log("mail sent to " + user.email);
                req.flash("success", "An e-mail has been sent to " + user.email + " with further instructions.");
                done(err, "done");
            });
        }
    ], function(err){
        if(err) return next(err);
        res.redirect("/forgot");
        }
    );
});

router.get("/reset/:token", function(req, res){
    User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()} }, function(err, user){
        if(!user){
            req.flash("error", "Password reset token is invalid or has expired.");
            return res.redirect("/forgot");
        }
        res.render("users/reset", {token: req.params.token});
    });
});

router.post("/reset/:token", function(req, res){
    async.waterfall([
        function(done){
            User.findOne({resetPasswordToken: req.params.token, resetPasswordExpires: {$gt: Date.now()} }, function(err, user){
                if(!user){
                    req.flash("error", "Password reset token is invalid or has expired.");
                    res.redirect("back");
                }
                if(req.body.password === req.body.confirm){
                    user.setPassword(req.body.password, function(err){
                        user.resetPasswordToken = undefined;
                        user.resetPasswordExpires = undefined;

                        user.save(function(err){
                            req.logIn(user, function(err){
                                done(err, user);
                            });
                        });
                    })
                } else {
                    req.flash("error", "Passwords do not match!");
                    return res.redirect("back");
                }
            });
        },
        function(user, done){
            let smtpTransport = nodemailer.createTransport({
                service: "Gmail",
                auth: {
                    user: 'codemode.io@gmail.com',
                    password: process.env.GMAILPW
                }
            });
            let mailOptions = {
                to: user.email,
                from: "codemode.io@gmail.com",
                subject: "Your password has been changed",
                text: "Hello,\n\n" +
                    "This is a confirmation that the password for your account " + user.email + " has just been changed.\n"
            };
            smtpTransport.sendMail(mailOptions, function(err){
                req.flash("success", "Success! Your password has been changed.");
                done(err);
            });
        }
    ], function(err){
        res.redirect("/campgrounds");
    })
});

// ===========
// USER PROFILES
// ===========

router.get("/users/:id", async function(req, res){
    try{
        let user = await User.findById(req.params.id).populate("followers").exec();
        let campground = await Campground.find().where("author.id").equals(user._id).exec();
        res.render("users/show", {user, campground});
    } catch(err) {
        req.flash("error", err.message);
        return res.redirect("back");
    }
});

// follow user
router.get('/follow/:id', middleware.isLoggedIn, async function(req, res) {
    try {
        let user = await User.findById(req.params.id);
        user.followers.push(req.user._id);
        user.save();
        req.flash('success', 'Successfully followed ' + user.username + '!');
        res.redirect('/users/' + req.params.id);
    } catch(err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
});

// view all notifications
router.get('/notifications', middleware.isLoggedIn, async function(req, res) {
    try {
        let user = await User.findById(req.user._id).populate({
            path: 'notifications',
            options: { sort: { "_id": -1 } }
        }).exec();
        let allNotifications = user.notifications;
        res.render('notifications/index', { allNotifications });
    } catch(err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
});

// handle notification
router.get('/notifications/:id', middleware.isLoggedIn, async function(req, res) {
    try {
        let notification = await Notification.findById(req.params.id);
        notification.isRead = true;
        notification.save();
        res.redirect(`/campgrounds/${notification.campgroundId}`);
    } catch(err) {
        req.flash('error', err.message);
        res.redirect('back');
    }
});

module.exports = router;