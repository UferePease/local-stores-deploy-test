const express = require('express');
const router = express.Router();
// import the controlers
const storeController = require('../controllers/storeController');
const userController = require('../controllers/userController');
const authController = require('../controllers/authController');
const reviewController = require('../controllers/reviewController');
const { catchErrors } = require('../handlers/errorHandlers');

// using route-specific middleware
// router.get('/', storeController.myMiddleWare, storeController.homePage)
router.get('/', catchErrors(storeController.getStores));   // using aync-await, so wrap in catchError method
router.get('/stores', catchErrors(storeController.getStores));
router.get('/stores/page/:page', catchErrors(storeController.getStores));

// add a middleware to this route to ensure users are logged in before they can add a store
router.get('/add', authController.isLoggedIn, storeController.addStore);

// add the upload, resize middlewares to the createStore method. 
router.post('/add',
    storeController.upload,     // upload middleware
    catchErrors(storeController.resize),    // Note: resize middleware is an async-await fxn, hence wrapped in a catchErrors object
    catchErrors(storeController.createStore)
);  // wrap the route that can throw an error with the catchError object

// add the upload, resize middlewares to the updateStore method.
router.post('/add/:id',
    storeController.upload,     // upload middleware
    catchErrors(storeController.resize),    // Note: resize middleware is an async-await fxn, hence wrapped in a catchErrors object
    catchErrors(storeController.updateStore)
);  // wrap the route that can throw an error with the catchError object

router.get('/stores/:id/edit', catchErrors(storeController.editStore));  // wrap the route that can throw an error with the catchError object

router.get('/store/:slug', catchErrors(storeController.getStoreBySlug));    // for viewing a single store

// Do work here
// router.get('/', (req, res) => {
//   // console.log('Hey!!!')
//   const wes = { name: 'Wes', age: 100, cool: true };
//   // res.send('Hey! It works!');
//   // res.json(wes)
//   // res.send(req.query.name)
//   // res.json(req.query)

//   // rendering response
//   // res.render('hello');  // renders the hello.pug file

//   // parse data from the route
//   res.render('hello', {
//     name: 'Peace',
//     dog: req.query.dog,
//     title: 'I love food'
//   })
// });

// // route with name variable/parameter
// router.get('/reverse/:name', (req, res) => {
//   const reverse = [...req.params.name].reverse().join('');
//   res.send(reverse);
// })

// tag routes
router.get('/tags', catchErrors(storeController.getStoresByTag));
router.get('/tags/:tag', catchErrors(storeController.getStoresByTag));

// user routes
router.get('/login', userController.loginForm);
router.post('/login', authController.login);
router.get('/register', userController.registerForm);

// 1. validate the registration data
// 2. register the user
// 3. we need to log the user in
router.post('/register',
    userController.validateRegister,    // validate
    userController.register,    // register
    authController.login    // authenticate and login

);

router.get('/logout', authController.logout);

// user account route
// add a middleware to this route to ensure users are logged in before they can view/edit their account
router.get('/account', authController.isLoggedIn,  userController.account);
// we wrap the updateAccount in catchErrors since we will be using async-await
router.post('/account', catchErrors(userController.updateAccount)); 

// forgot password routes and flow
router.post('/account/forgot', catchErrors(authController.forgot));

// route for resetting password
router.get('/account/reset/:token', catchErrors(authController.reset));
// we will use a middleware to check if the passwords match
router.post('/account/reset/:token',
    authController.confirmedPasswords,
    catchErrors(authController.updatePassword)
);

router.get('/map', storeController.mapPage);

// router for fetching hearted stores. They must be logged in to view this hence the middleware
router.get('/hearts', authController.isLoggedIn, catchErrors(storeController.getHearts));

// route for posting a review
router.post('/reviews/:id',
    authController.isLoggedIn,
    catchErrors(reviewController.addReview)
);

// route for top ratings
router.get('/top', catchErrors(storeController.getTopStores));

/*
    API for search and all
    */

router.get('/api/v1/search', catchErrors(storeController.searchStores));    // api for searching stores based on name and description

router.get('/api/v1/stores/near', catchErrors(storeController.mapStores));   // api for searching stores based on location

// route for hearting a store
router.post('/api/v1/stores/:id/heart', catchErrors(storeController.heartStore));

module.exports = router;
