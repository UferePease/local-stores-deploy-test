const mongoose = require('mongoose');
const User = mongoose.model('User');    // we can do this because we already imported the model in start.js file
const promisify = require('es6-promisify');

exports.loginForm = (req, res) => {
    res.render('login', { title: 'Login' });
};

exports.registerForm = (req, res) => {
    res.render('register', { title: 'Register' });
};

// make middleware for request validation
exports.validateRegister = (req, res, next) => {
    // sanitise the name using the sanitizeBody() method of the expressValidator that was pulled in in our app.js
    req.sanitizeBody('name');
    req.checkBody('name', 'You must supply a name!').notEmpty();    // checks that name is empty
    req.checkBody('email', 'That Email is not valid').notEmpty().isEmail(); // checks that email is not empty and valid
    // then normalize the email (i.e resolve the uppercases etc)
    req.sanitizeBody('email').normalizeEmail({
        remove_dots: false,
        remove_extension: false,
        gmail_remove_subaddress: false
    });
    // check that password cannot be blank
    req.checkBody('password', 'Password cannot be blank!').notEmpty();
    req.checkBody('password-confirm', 'Confirm Password cannot be blank!').notEmpty();
    req.checkBody('password-confirm', 'Oops! Your passwords do not match').equals(req.body.password);  // check that the supplied passwords match

    // get the validation errors, if there are any
    const errors = req.validationErrors();
    if (errors) {
        // handle the error ourselves (not passing it to any middleware) by flashing it to the user
        req.flash('error', errors.map(err => err.msg));
        // re-render the form with the user-supplied data along with the flash message
        res.render('register', { title: 'Register', body: req.body, flashes: req.flash() })
        return; // stop the fnction from running
    }
    // if there are no errors, move to next
    next();     // call the next piece of middleware down the line
};

//  another method to register. Also note that this is a middleware hence the next param
exports.register = async (req, res, next) => {
    // make a user object
    const user = new User({ email: req.body.email, name: req.body.name });

    // using the register() made available by passportLocalMongoose library
    // register() does not return a promise so we can use a callback instead of a async await
    // User.register(user, req.body.password, function (err, user) {
        
    // });

    // or better still we use the promisify library to make our callback into a promise-based one that we can await
    // first we make the method that is promisified
    const register = promisify(User.register, User); // pass the method and the object that the method binds to in as parameters
    // we await the register method above
    await register(user, req.body.password);    // stores the hashed password
    // res.send('It works!');
    next(); // pass to authControler for login

};

// user account method
exports.account = (req, res) => {
    res.render('account', { title: 'Edit Your Account' });
};

// updating an account
exports.updateAccount = async (req, res) => {
    const updates = {   // we are specifying the fields that will be updated
        name: req.body.name,
        email: req.body.email
    };

    // find this specific user from the db and update her details
    const user = await User.findOneAndUpdate(
        { _id: req.user._id },  // query param
        { $set: updates },       // update param
        { new: true, runValidators: true, context: 'query' }      // options params. Read Doc for more details
    );

    // res.json(user);      // just testing
    req.flash('success', 'Profile Updated!');
    res.redirect('back');
};