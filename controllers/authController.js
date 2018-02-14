const passport = require('passport');
const crypto = require('crypto');    // for generating random reset strings
const mongoose = require('mongoose');
const User = mongoose.model('User');
const promisify = require('es6-promisify');
const mail = require('../handlers/mail');

// using the local strategy. Local strategy is about logging user in using normal email/username/password
// authenticate() method takes in the type of strategy as first param and a config object as second parameter
exports.login = passport.authenticate('local', {
    failureRedirect: '/login',  // redirect user to login if anything fails
    failuerFlash: 'Failed Login!',
    successRedirect: '/',
    successFlash: 'You are now logged in!'
});

// log out method
exports.logout = (req, res) => {
    req.logout();
    req.flash('success', 'You are now logged out!');
    res.redirect('/');
};

// make  middleware that checks if a user is logged in
exports.isLoggedIn = (req, res, next) => {
    // first check if user is authenticated
    if (req.isAuthenticated()) {    // isAuthenticated() method shipps with the passport library
        next();     // carry on! They are logged in
        return false;   // leave this function
    }
    // else
    req.flash('error', 'Oops you must be logged in to do that!');
    res.redirect('/login');
}

// forgot auth method
exports.forgot = async (req, res) => {
    // 1. check if the user with that email exists
    const user = await User.findOne({ email: req.body.email });
    if (!user) {
        // req.flash('error', 'No account with that email exists');
        req.flash('error', 'A password reset has been mailed to you, if an account exists with this email');
        return res.redirect('/login');
    }

    // 2. set reset tokens and expiry on their account
    // since it is found that the user exist, we generate a reset token for user
    user.resetPasswordToken = crypto.randomBytes(20).toString('hex');   // assigns this token to the user
    user.resetPasswordExpires = Date.now() + 3600000;   // 1 hour from now
    // save this new user reset data
    await user.save();

    // 3. send them an email with the token
    const resetURL = `http://${req.headers.host}/account/reset/${user.resetPasswordToken}`;  // the reset url
    await mail.send({
        user: user,     // using just 'user' is enough since key and value are same name
        filename: 'password-reset',
        subject: 'PASSWORD RESET',
        resetURL: resetURL,     // also using just 'resetURL' is enough since key and value are same name
    });
    req.flash('success', `You have been emailed a password reset link.`);

    // 4. redirect to login page after link is clicked
    res.redirect('/login');
};

// reset method
exports.reset = async (req, res) => {
    // check that there is someone with this token and that the token has not expired
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }   // $gt for greater than. We are checking that the token hasnt expired
    });
    if (!user) {
        req.flash('error', 'Password reset is invalid or has expired!');
        return res.redirect('/login');
    }
    // if there is a user, show the reset password form
    res.render('reset', { title: 'Reset your Password' });
};

// middleware for confirming passwords
exports.confirmedPasswords = (req, res, next) => {
    if (req.body.password === req.body['password-confirm']) {   // how to access a property with "-" in its name
        next();     // keep it going! Go to the actual password update method
        return;     // stop this function from running
    }
    // otherwise flash an error message and redirect
    req.flash('error', 'Passwords do not match!');
    res.redirect('back');
};

exports.updatePassword = async (req, res) => {
    // still check that the user token is valid
    const user = await User.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }   // $gt for greater than. We are checking that the token hasnt expired
    });

    if (!user) {
        req.flash('error', 'Password reset is invalid or has expired!');
        return res.redirect('/login');
    }

    // update the password using the setPassword() method made available to us by passport. we need to promisify it since it returns a callback by default
    // this is a method we can await
    const setPassword = promisify(user.setPassword, user);
    await setPassword(req.body.password);   // resets the password and hashes them, etc

    // now erase the password reset token and expiry time
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    // update this user
    const updatedUser = await user.save();

    // automatically log this user in
    await req.login(updatedUser);      // login() method made available by passport library
    req.flash('success', 'Nice! Your password has been reset! You are now logged in!');
    res.redirect('/');
};