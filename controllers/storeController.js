// import { Promise } from 'mongoose';
// const Promise = require('mongoose.Promise')
const mongoose = require('mongoose');
const Store = mongoose.model('Store')
const User = mongoose.model('User')
const multer = require('multer');
const jimp = require('jimp');   // for image resize
const uuid = require('uuid');   // for making file names unique
// mongoose.promise = global.Promise;

const multerOptions = {
    storage: multer.memoryStorage(),   // where to store the uploaded file (in memory)
    fileFilter: function (req, file, next) {
        // check that the file is an image
        const isPhoto = file.mimetype.startsWith('image/');
        if (isPhoto) {
            next(null, true);   // continue with file uploading
        } else {
            next({ message: 'That filetype isn\'t allowed!' }, false);
        }
    }
}

// create route-specific middleware
// exports.myMiddleWare = (req, res, next) => {
//     req.name = 'Wes';
//     if (req.name === 'Wes') {
//         throw Error('That is a stupid name');
//     }
//     next();
// }

exports.homePage = (req, res) => {
    res.render('index');
}

// displaying form for adding new store
exports.addStore = (req, res) => {
    // console.log(req.name)
    res.render('editStore', {title: 'Add Store'});
}

// middleware for working with createStore() - saves to memory of server temporarily (not to disk)
exports.upload = multer(multerOptions).single('photo');     // look for a single field called 'photo'

// image resize middleware
exports.resize = async (req, res, next) => {
    // check is there is no new file to resize
    if (!req.file) {
        next();     // skip to the next middleware
        return;
    }
    // console.log(req.file);

    // obtain filetype from the mimetype, e.g say splitting 'image/jpeg' by '/'
    const extension = req.file.mimetype.split('/')[1];
    req.body.photo = `${uuid.v4()}.${extension}`;   // using the uuid library to ensure unique filename

    // now we resize using jimp library. we use await since jimp is based on promises
    const photo = await jimp.read(req.file.buffer);     // jimp.read() takes a either filepath on a server or a buffer(which is a photo in memory temporarily)
    await photo.resize(800, jimp.AUTO); // resize
    await photo.write(`./public/uploads/${req.body.photo}`);       // now to actual folder. Note, all fxns are asynchronous, so must wait for response b4 proceeding
    // once we have written the photo to our file system, keep going
    next();
}


// storing new store to db
// exports.createStore = (req, res) => {
exports.createStore = async (req, res) => {     // async tells function to use aync-await
    // console.log(req.name)
    
    // save to mongodb 
    // const store = new Store(req.body);      // passing the request parameters to the store object
    // store.save(function (err, store) {
    //     if (!err) {
    //         console.log('It worked!');
    //         res.redirect('/');
    //     }
    // });
    
    // using promise
    // const store = new Store(req.body);      // passing the request parameters to the store object    
    // store.save()
    //     .then(store => {
    //         // now that store has been saved successfully, return a list of all the stores
    //         return Store.find()
    //     })
    //     .then(stores => {   // use the the list of stores returned in promise
    //         res.render('storeList', { stores: stores })
    //     })
    //     .catch(err => {
    //         throw Error(err);
    //     })

    // set the author of this store in the request body
    req.body.author = req.user._id;

    // using async-await
    const store = await (new Store(req.body)).save();      // passing the request parameters to the store object    
    // await store.save();     // add await here to ensure that it doesnt move to next line until this successfully happens
    req.flash('success', `Successfully created ${store.name}. Care to leave a review?`);
    res.redirect(`/store/${store.slug}`);

}

// fetching all stores
exports.getStores = async (req, res) => {
    // we are implementing pagination
    const page = req.params.page || 1;   // if no page param is available (e.g for home page), set it to 1

    // we set the number of items per page
    const limit = 4;

    // specify how many items to skip
    const skip = (page * limit) - limit;

    // 1. Query the database for a list of all stores. We will await for the promise along with the count promise
    const storesPromise = Store
        .find()  // find() fetches all data in the db based on skip and limit 
        .skip(skip)
        .limit(limit)
        .sort({ created: 'desc' });
    
    // promise that returns the number of stores in db
    const countPromise = Store.count();

    // await the two promises
    const [stores, count] = await Promise.all([storesPromise, countPromise]);

    // we compute the number of pages
    const pages = Math.ceil(count / limit);

    // we guard against visit a page that does not exist, by redirecting to last page
    if (!stores.length && skip) {
        req.flash('info', `Hey! You asked for page ${page}. But that doesn't exist. So i put you on page ${pages}`);
        res.redirect(`/stores/page/${pages}`);  // remember that redirecting to his page, this getStores() method will be called again
        return;
    }
    
    // console.log(stores);
    res.render('stores', { title: 'Stores', stores, page, pages, count });      // if variable name is same as property name, you can just pass the variable instead of 'stores': stores
}

// method to confirm owner
const confirmOwner = (store, user) => {
    if (!store.author.equals(user._id)) {
        throw Error('You must own a store in order to edit it!');
    }
}

// edit a store
exports.editStore = async (req, res) => {
    // 1. find the store given the ID
    const store = await Store.findOne({ _id: req.params.id });
    // res.json(store)
    // 2. confirm they are the owner of the store
    // TODO
    confirmOwner(store, req.user);  // if user is not owner, error will be thrown and error handling middleware will take care of it

    // 3. Render out the edit form so the user can update the store
    res.render('editStore', {title: `Edit ${store.name}`, store: store});
    
};

// update a store
exports.updateStore = async (req, res) => {
    // set the location data type to ba a point
    req.body.location.type = 'Point';
    // find and update the store
    const store = await Store.findOneAndUpdate({ _id: req.params.id }, req.body, {
        new: true,   // returns the newly updated data instead of the old store data
        runValidators: true,    // forces the model to check that required fields are not empty
    }).exec();
    
    // Redirect them to the store and tell them it worked
    req.flash('success', `Successfully updated <strong>${store.name}</strong>. <a href="/stores/${store.slug}">View Store</a>`)
    res.redirect(`/stores/${store._id}/edit`);
    // Redirect them, the store and tell them it worked
};

exports.getStoreBySlug = async (req, res, next) => {
    // res.send('It works')
    // res.json(req.params);    // just to show the request params
    const store = await Store.findOne({ slug: req.params.slug }).populate('author reviews');    // we retrieve the slug of interest from the request params
    if (!store) {
        return next();  // next assumes this to be a middleware and passes result down to the next fxn
    }
    // res.json(store)  // just testing out to see that store record is captured

    // render a template
    res.render('store', { store, title: store.name });
}

exports.getStoresByTag = async (req, res) => {
    // res.send('It works!');

    // get a list of all of the stores
    const tag = req.params.tag;
    const tagQuery = tag || { $exists: true };      // we are adding an $exists property, to enable returning all stores with as least a single tag in it when no specific tag is queried
    const tagsPromise = Store.getTagsList();     // we are creating a static method in our store model for fetching the list of tags
    const storesPromise = Store.find({ tags: tagQuery })

    // we wait for these twp promises to return using Promise.all() and pass the two promises in an array.
    // Note that using Promise.all() means we should not use 'await' for each of these promise responses
    // This method reduces wait time especially if the request are independent of each other
    const [tags, stores] = await Promise.all([tagsPromise, storesPromise]);     // we have de-structured the result array into tags and stores
    
    // you can do this but we ve already taken advantage of de-structuring in ES6 above
    // var tags = result[0];
    // var stores = result[1];

    // render the tag.pug file
    // res.json(tags);
    res.render('tag', { tags, title: 'Tags', tag, stores })      // Note passing only { tags } as first argument represents { tags: tags }, same with tag and stores
};

// search store methods based on name and description
exports.searchStores = async (req, res) => {
    // res.json({ it: 'Worked!' });
    // Note that the search queries are not params they are queries. So to obtain them we use req.query
    // res.json(req.query);

    const stores = await Store
        .find({
            // we are using the text operator, which performs a text search on the content of the fields indexed with a text index
            $text: {
                $search: req.query.q,
            }
        },        
        {
            score: { $meta: 'textScore' }   // we add another param for meta data, we are projecting based on textScore
        })
        .sort({
            score: { $meta: 'textScore' }   // we are sorting by the value of the textScore
        })
        // limit to only 5 results
        .limit(5);
    
    res.json(stores);
}

// search stores based on location
exports.mapStores = async (req, res) => {
    // mongodb expects an array of lng and lat values
    var q = {};
    if (req.query.lng && req.query.lat) {
        const coordinates = [req.query.lng, req.query.lat].map(parseFloat);     // we map and parse the values to float instead of leaving them as strings
        // res.json(coordinates);

        q = {
            location: {
                $near: {    // observer that we are using the mongodb $near operator to return stores close to the lat and long
                    $geometry: {
                        type: 'Point',
                        coordinates     // coordinates: coordinates
                    },
                    $maxDistance: 10000     // 10km
                }
            }
        };
    }
    
    
    // since we dont nned all the store details in our payload, we can select the fields we need using the select() method
    const stores = await Store.find(q).select('slug name description location photo').limit(10);    // we specify that we need just the slug,  name, description and location fields, and also limit the search to the closest 10 stores
    // const stores = await Store.find(q).select('-author -tags');    // we specify that we don't need autho and tags fields
    res.json(stores);

};

//  method for map page
exports.mapPage = (req, res) => {
    res.render('map', { title: 'Map' });
};

// method for hearting stores
exports.heartStore = async (req, res) => {
    //  check if user already have this store in heart. If so, remove it, else add to his/her heart
    // lets get the list of user's heart and then map through them
    const hearts = req.user.hearts.map(obj => obj.toString());
    // console.log(hearts);

    // check if the store id is in the user hearts, if so remove ($pull) from hearts, else add ($addToSet) to hearts
    const operator = hearts.includes(req.params.id) ? '$pull' : '$addToSet';
    const user = await User
        .findOneAndUpdate(
            req.user._id,   // find the user with this id
            { [operator]: { hearts: req.params.id } },   // now, either pull or add this store's id to the user's list of hearts. Notice how the computed proprty is user here in square bracket [operator]. since it can either be $pull or $addToSet
            { new: true }   // so after updating the user, it returns the new updated user
        )
    res.json(user);
};

// method for getting user-hearted stored
exports.getHearts = async (req, res) => {

    // we are fetching the stores whose id is in the user's heart
    const stores = await Store.find({
        _id: { $in: req.user.hearts }   // using the $in operator to query if the store's id is in the user's heart
    });
    // res.json(stores);
    res.render('stores', { title: 'Hearted Stores', stores: stores });  // re-using the stores.pug file
}

// method for getting top-rated stores
exports.getTopStores = async (req, res) => {

    // we are fetching the stores with high ratings using the schema methods. Its not efficient to run this query here in the controller
    const stores = await Store.getTopStores();
    // res.json(stores);
    res.render('topStores', { title: 'Top Stores', stores: stores });  // using the topStores.pug file
}