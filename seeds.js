const mongoose = require("mongoose");
const Campground = require("./models/campground");
const Comment = require("./models/comment");

const data = [
    {
        name: "Cloud's Rest",
        image: "https://images.unsplash.com/photo-1533873984035-25970ab07461?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=400&q=60",
        description: " Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin convallis rutrum congue. Donec in dolor bibendum, blandit quam id, iaculis ante. Duis molestie tortor non efficitur consectetur. Curabitur bibendum auctor tortor, in placerat dui malesuada a. In viverra lacus mi. Sed eget ligula magna. Nulla facilisi. Proin a tempor leo. Sed aliquam volutpat dui nec mattis. Vestibulum a justo convallis, mattis velit ac, tempor leo. Morbi interdum porta dolor non rutrum. Donec eleifend eu velit ut rutrum. Sed lorem leo, efficitur ut lorem eu, tristique sollicitudin nunc. Nullam blandit enim ut bibendum eleifend. ",
    },
    {
        name: "Desert Mesa",
        image: "https://images.unsplash.com/photo-1529968493954-06bbf3fdacc2?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=400&q=60",
        description: " Mauris enim nibh, ultricies eu mattis ac, euismod eu massa. Etiam at ornare felis. Pellentesque lacinia sem at eleifend egestas. Pellentesque et massa sed erat consequat pulvinar. Donec varius imperdiet ultricies. Suspendisse suscipit, dui eget placerat efficitur, lectus velit luctus tortor, vel convallis odio neque non nunc. Nam vel ligula ipsum. Aliquam molestie erat sit amet tellus vehicula, a aliquet nisl interdum. Morbi porta luctus lectus. ",
    },
    {
        name: "Eclipse Valley",
        image: "https://images.unsplash.com/photo-1520824071669-892f70d8a23d?ixlib=rb-1.2.1&ixid=eyJhcHBfaWQiOjEyMDd9&auto=format&fit=crop&w=400&q=60",
        description: " Mauris enim nibh, ultricies eu mattis ac, euismod eu massa. Etiam at ornare felis. Pellentesque lacinia sem at eleifend egestas. Pellentesque et massa sed erat consequat pulvinar. Donec varius imperdiet ultricies. Suspendisse suscipit, dui eget placerat efficitur, lectus velit luctus tortor, vel convallis odio neque non nunc. Nam vel ligula ipsum. Aliquam molestie erat sit amet tellus vehicula, a aliquet nisl interdum. Morbi porta luctus lectus. ",
    },

];

async function seedDB(){
    try {
        await Campground.remove({});
        console.log('Campgrounds removed');
        await Comment.remove({});
        console.log('Comments removed');

        for(const seed of seeds) {
            let campground = await Campground.create(seed);
            console.log('Campground created');
            let comment = await Comment.create(
                {
                    text: 'This place is great, but I wish there was internet',
                    author: 'Homer'
                }
            );
            console.log('Comment created');
            campground.comments.push(comment);
            campground.save();
            console.log('Comment added to campground');
        }
    } catch(err) {
        console.log(err);
    }
}

module.exports = seedDB;