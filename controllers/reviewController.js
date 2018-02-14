const mongoose = require('mongoose');
const Review = mongoose.model('Review');

// handler for adding reviews
exports.addReview = async (req, res) => {
    req.body.author = req.user._id;     // assign the user as the author to the request payload
    req.body.store = req.params.id;     // fetch the store id from request params (i.e from the url parameters)
    // res.json(req.body);

    // make a new review fron the request body
    const newReview = new Review(req.body);
    await newReview.save();     // wait for it to save

    req.flash('success', 'Review Saved');
    res.redirect('back');

}