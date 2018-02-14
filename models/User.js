const mongoose = require('mongoose');
const Schema = mongoose.Schema;
mongoose.Promise = global.Promise;
const md5 = require('md5');
const validator = require('validator');     // we will be needing this to validate email and all
const mongodbErrorHandler = require('mongoose-mongodb-errors');
const passportLocalMongoose = require('passport-local-mongoose');

// make user model
const userSchema = new Schema({
    email: {
        type: String,
        unique: true,   // so no two users can have the same email
        lowercase: true,
        trim: true,      // take off white spaces
        validate: [validator.isEmail, 'Invalid Email Address'],
        required: 'Please supply an email address'
    },
    name: {
        type: String,
        required: 'Please supply a name',
        trim: true
    },
    // we add the two fields for password recovery
    resetPasswordToken: String,
    resetPasswordExpires: Date,

    // adding a new field called hearts, which is an array store ids
    hearts: [   // beacuse this will relate to many stores, we are using an array
        { type: mongoose.Schema.ObjectId, ref: 'Store' }
    ]
});

// make a virtual field for avater. We'll use the gravater service
// virtual field are data that you are better off generating them on the fly
userSchema.virtual('gravatar').get(function () {
    // the gravatar service hashes the user's email address using md5 library, so it is shown in the fetched image source
    const hash = md5(this.email);
    return `https://gravatar.com/avatar/${hash}?s=200`;     // with a size of 200
})

// we are using passportjs library through the passportLocalMongoose imported above
// passportLocalMongoose exposes to us a method called .register(), so we can create a user for us
userSchema.plugin(passportLocalMongoose, { usernameField: 'email' });  // adding the plugin and instructing it to use the email field as the username

// add the error handler plugin
userSchema.plugin(mongodbErrorHandler);     // for making the errors pretty readable for the user

// export this model so it can accessed when this file is required from other files
module.exports = mongoose.model('User', userSchema)