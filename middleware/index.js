const Campground = require("../models/campground");
const Comment = require("../models/comment");
const Review = require("../models/review");

// all the middleware goes here
const middlewareObj = {};

middlewareObj.checkCampgroundOwnership = function(req, res, next){
    // checks to see if logged in user = author of posts
    if(req.isAuthenticated()){
        Campground.findById(req.params.id, function(err, foundCampground){
            if(err || !foundCampground){
                req.flash("error", "Error 404: Campground Not Found!");
                res.redirect("back");
            } else {
                //  does user own the campground?
                // must use '.equals' because foundCampground.author.id = mongoose OBJECT
                //   and req.user._id = STRING
                if(foundCampground.author.id.equals(req.user._id) || req.user.isAdmin){
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that.");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You must be logged in to do that!");
        res.redirect("back");
    }
};

middlewareObj.checkCommentOwnership = function(req, res, next){
    if(req.isAuthenticated()){
        Comment.findById(req.params.comment_id, function(err, foundComment){
            if(err || !foundComment){
                req.flash("error", "Error: Comment Not Found!");
                res.redirect("back");
            } else {
                //  does user own the comment?
                // must use '.equals' because foundComment.author.id = mongoose OBJECT
                //   and req.user._id = STRING
                if(foundComment.author.id.equals(req.user._id || req.user.isAdmin)){
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that.");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You must be logged in to do that!");
        res.redirect("back");
    }
};

middlewareObj.isLoggedIn = function(req, res, next){
    //  - checks to see if User is logged in, if not, redirect to login page
    if(req.isAuthenticated()){
        return next();
    }
    req.flash("error", "You must be logged in to do that");
    res.redirect("/login");
};

middlewareObj.checkReviewOwnership = function(req, res, next) {
    if(req.isAuthenticated()){
        Review.findById(req.params.review_id, function(err, foundReview){
            if(err || !foundReview){
                res.redirect("back");
            }  else {
                // does user own the comment?
                if(foundReview.author.id.equals(req.user._id)) {
                    next();
                } else {
                    req.flash("error", "You don't have permission to do that");
                    res.redirect("back");
                }
            }
        });
    } else {
        req.flash("error", "You need to be logged in to do that");
        res.redirect("back");
    }
};

middlewareObj.checkReviewExistence = function (req, res, next) {
    if (req.isAuthenticated()) {
        Campground.findById(req.params.id).populate("reviews").exec(function (err, foundCampground) {
            if (err || !foundCampground) {
                req.flash("error", "Campground not found.");
                res.redirect("back");
            } else {
                // check if req.user._id exists in foundCampground.reviews
                var foundUserReview = foundCampground.reviews.some(function (review) {
                    return review.author.id.equals(req.user._id);
                });
                if (foundUserReview) {
                    req.flash("error", "You already wrote a review.");
                    return res.redirect("/campgrounds/" + foundCampground._id);
                }
                // if the review was not found, go to the next middleware
                next();
            }
        });
    } else {
        req.flash("error", "You need to login first.");
        res.redirect("back");
    }
};



module.exports = middlewareObj;