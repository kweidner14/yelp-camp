const express = require("express");
const router = express.Router();
const Campground = require("../models/campground");
const Comment = require("../models/comment");
const Notification = require("../models/notification");
const Review = require("../models/review");
const User = require("../models/user");
const middleware = require("../middleware"); // dont need '/index.js', express does it by just requiring '/middleware'
const multer = require("multer");
const cloudinary = require("cloudinary");
const mbxGeocoding = require("@mapbox/mapbox-sdk/services/geocoding");
const geocodingClient = mbxGeocoding({accessToken: process.env.MAPBOX_TOKEN});


// creates 'storage' variable with 'filename' object with custom name.
// originalname = current timestamp + original filename
const storage = multer.diskStorage({
    filename: function (req, file, callback) {
        callback(null, Date.now() + file.originalname)
    }
});
// enforces file is uploaded with with .jpg .jpeg .pneg or .gif format
// returns error if improper file format uploaded
const imageFilter = function (req, file, cb){
    // accept image files only
    if(!file.originalname.match(/\.(jpg|jpeg|pneg|gif)$/i)){
        return cb(new Error("Only image files are allowed!"), false);
    }
    cb(null, true);
};
var upload = multer({storage: storage, fileFilter: imageFilter});


cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// INDEX ROUTE - Show all campgrounds
router.get("/", function(req, res){
    // search bar logic
    if(req.query.search){
        const regex = new RegExp(escapeRegex(req.query.search), "gi");
        Campground.find({name: regex}, function(err, allCampgrounds){
            if(err){
                console.log(err);
            } else {
                if(allCampgrounds.length < 1){
                    req.flash("error", "Campground not found. Please refine your search and try again.");
                    return res.redirect("back");
                }
                res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds"});
            }
        })
    } else {
        //get all campgrounds from DB
        Campground.find({}, function (err, allCampgrounds) {
            if (err) {
                console.log(err);
            } else {
                res.render("campgrounds/index", {campgrounds: allCampgrounds, page: "campgrounds"});
            }
        })
    }
});

// CREATE ROUTE - Add new campground to DB
router.post("/", middleware.isLoggedIn, upload.single("image"), async function(req, res){
    cloudinary.v2.uploader.upload(req.file.path, {moderation: "webpurify"}, async function(err, result){
        if(err){
            req.flash("error", err.message);
            return res.redirect("back");
        }
        // add cloudinary url for the image to the campground object under image property
        req.body.campground.image = result.secure_url;
        // add author to campground
        req.body.campground.author = {
            id: req.user._id,
            username: req.user.username
        };
        req.body.campground.price = req.body.price;

        let response = await geocodingClient.forwardGeocode({
            query: req.body.campground.location,
            limit: 1
        })
            .send();

        req.body.campground.coordinates = response.body.features[0].geometry.coordinates;

        try{
            let campground = await Campground.create(req.body.campground);
            let user = await User.findById(req.user._id).populate("followers").exec();
            let newNotification = {
                username: req.user.username,
                campgroundId: campground.id
            };
            for(const follower of user.followers){
                let notification = await Notification.create(newNotification);
                follower.notifications.push(notification);
                follower.save();
            }

            res.redirect(`/campgrounds/${campground.id}`);
        } catch(err){
            req.flash("error", err.message);
            res.redirect("back");
        }
    })
});

// NEW ROUTE - show form to create new campground
router.get("/new", middleware.isLoggedIn, function(req, res){
    res.render("campgrounds/new");
});

// SHOW - shows more info about one campground
router.get("/:id", function (req, res) {
    //find the campground with provided ID
    Campground.findById(req.params.id).populate("comments").populate({
        path: "reviews",
        options: {sort: {createdAt: -1}}
    }).exec(function (err, foundCampground) {
        if (err) {
            console.log(err);
        } else {
            //render show template with that campground
            res.render("campgrounds/show", {campground: foundCampground});
        }
    });
});


// EDIT CAMPGROUND ROUTE
router.get("/:id/edit", middleware.checkCampgroundOwnership, function(req, res){
    Campground.findById(req.params.id, function(err, foundCampground){
        res.render("campgrounds/edit", {campground: foundCampground});
    });
});

// UPDATE CAMPGROUND ROUTE
router.put("/:id", middleware.checkCampgroundOwnership, function(req, res){
    delete req.body.campground.rating;
    // find and update the correct campground
    // redirect somewhere(show page)
    Campground.findByIdAndUpdate(req.params.id, req.body.campground, function(err, updatedCampground){
        if(err || !updatedCampground){
            req.flash("error", err.message);
            res.redirect("/campgrounds");
        } else {
            res.redirect("/campgrounds/" + req.params.id);
        }
    })
});

// DESTROY CAMPGROUND ROUTE
// delets all associated comments/reviews as well
router.delete("/:id", middleware.checkCampgroundOwnership, function (req, res) {
    Campground.findById(req.params.id, function (err, campground) {
        if (err) {
            res.redirect("/campgrounds");
        } else {
            // deletes all comments associated with the campground
            Comment.remove({"_id": {$in: campground.comments}}, function (err) {
                if (err) {
                    console.log(err);
                    return res.redirect("/campgrounds");
                }
                // deletes all reviews associated with the campground
                Review.remove({"_id": {$in: campground.reviews}}, function (err) {
                    if (err) {
                        console.log(err);
                        return res.redirect("/campgrounds");
                    }
                    //  delete the campground
                    campground.remove();
                    req.flash("success", "Campground deleted successfully!");
                    res.redirect("/campgrounds");
                });
            });
        }
    });
});

function escapeRegex(text){
    return text.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = router;