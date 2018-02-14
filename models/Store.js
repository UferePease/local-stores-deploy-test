const mongoose = require('mongoose');
mongoose.promise = global.Promise;
const slug = require('slugs');

const storeSchema = new mongoose.Schema({
    name: {
        type: String,
        trim: true,
        required: 'Please enter a store name!'
    },
    slug: String,
    description: {
        type: String,
        trim: true
    },
    tags: [String],
    created: {
        type: Date,
        default: Date.now
    },
    location: {
        type: {
            type: String,
            default: 'Point'
        },
        coordinates: [{
            type: Number,
            required: 'You must supply coordinates!'
        }],
        address: {
            type: String,
            required: 'You must supply an address!'
        }
    },
    photo: String,

    // a field that relates to the user
    author: {
        type: mongoose.Schema.ObjectId,     // notice how we are creating relationship to user model
        ref: 'User',         // tells mongo that author here references the user model
        required: 'You must supply an author'
    }
}, {
    toJSON: { virtuals: true },     // tell schema to populate vituals when shown as json
    toObject: { virtuals: true },     // tell schema to populate vituals when shown as object
});

// Define our indexes (for search purposes the name and description fields will be indexed)
// here we are making a compound index as texts
storeSchema.index({
    name: 'text',
    description: 'text'
});

// we will also index the lat and long as geospatial to enable quick searches
storeSchema.index({
    location: '2dsphere'
})

// creating the slug before the store object is saved to db
storeSchema.pre('save', async function (next) {   // use the function if you want to call 'this'. You can't do this with arrow functions
    // ensure that slugs are created only when the name is modified
    if (!this.isModified('name')) {
        next(); // skip it
        return; // stops this function from running
    }
    this.slug = slug(this.name);
    // find other stores that have a slug of say wes, wes-1, wes-2
    const slugRegEx = new RegExp(`^(${this.slug})((-[0-9]*$)?)$`, 'i');      // make a regex that starts with this.slug and maybe ends with say -1, -2, etc

    // pass regex into a query (to find Store models whose slugs match the regex, we use the this.constructor since this new store model is yet to be saved)
    const storesWithSlug = await this.constructor.find({ slug: slugRegEx });    // this method is async await
    
    // if matches are found, overwrite this store's slug to something unique by adding the 1 to the number at the end of the slug
    if (storesWithSlug.length) {
        this.slug = `${this.slug}-${storesWithSlug.length + 1}`;
    }

    next();
    // TODO make for resilience so slugs are unique
});

// add a static method to the schema. Its best to do this query in db rather than in controllers
storeSchema.statics.getTagsList = function () {   // it is important to use the proper fxn and not the arrow fxn bcos we will be use 'this' which is bound to the model
    // NOTE: 'this' keyword will not work if arrow fxn is used

    // this is the pipeline below
    return this.aggregate([     // use pipeline operators which starts with $
        { $unwind: '$tags' },     // pass an object for each pipeline operator. Adding $tags shows you want to unwind based on tags field
        { $group: { _id: '$tags', count: { $sum: 1 } } },   // pass another operator for grouping based on tags and create a new field for each group called count which adds to itself by one
        { $sort: { count: -1 }}     // add another operator for sorting either ascending(1) or descending order(-1)
    ]);        
}

// another static method to query the top-rated stores using ADVANCED AGGREGATION. Its best to do this query in db
// with aggregation, we are sort of creating a new document
storeSchema.statics.getTopStores = function () {
    
    // Note that aggregate() is a mongodb convenience method unlike virtual() which is specific to mongoose
    // hence, we can not use the virtual reviews field created below here

    // the line below return a promise that we can await
    return this.aggregate([     // aggregate() is similar to find() but much more powerful
        // 1. lookup stores and populate their reviews
        {
            $lookup: {
                from: 'reviews',    // mongodb grabs the model name, lowercases it and adds s to the end. 
                localField: '_id',  // same as in the virtual reviews field created below
                foreignField: 'store',      // same as in the virtual reviews field created below
                as: 'reviews'       // the name of the new field that will be created
            }
        },

        // 2. filter for only items that have 2 or more reviews
        {
            $match: {
                'reviews.1': {  // the second item in array has index 1, hence its accessed as reviews.1 in mongodb
                    $exists: true   // filters out stores with one or no reviews
                }
            }
        },

        // 3. add the average reviews field
        // with mongodb3.4 we may not need to use $project. $addField can be used and we do not have to add these fields: photo, name and reviews e.g
        // {
        //     $addFields: { // $addField operator adds a new field
        //         averageRating: {
        //             $avg: '$reviews.rating'     // $avg operator calculates the average of each of the review.rating field. $reviews.rating: the dollar sign means look for the rating field of the reviews being piped in from the $match operator
        //         }
        //     }
        // },
        {
            $project: { // $project operator adds a new field
                photo: '$$ROOT.photo',     // $$ROOT refers to the parent object
                name: '$$ROOT.name',     // $$ROOT refers to the parent object
                reviews: '$$ROOT.reviews',     // $$ROOT refers to the parent object
                slug: '$$ROOT.slug',     // $$ROOT refers to the parent object
                averageRating: {
                    $avg: '$reviews.rating'     // $avg operator calculates the average of each of the review.rating field. $reviews.rating: the dollar sign means look for the rating field of the reviews being piped in from the $match operator
                }
            }
        },

        // 4. sort it by our new field, highest reviews first
        {
            $sort: {
                averageRating: -1   // we are sorting based on averageRating in descending order
            }    
        },

        // 5. limit to at most 10
        {
            $limit: 10
        }
    ])
}

// adding new field called reviews to the schema (its a mongoose feature called virtual populate)
// so we are finding reviews where the store _id property === reviews store property
storeSchema.virtual('reviews', {
    // queries the review model
    ref: 'Review',          // what model to link
    localField: '_id',      // represents the field on the store that should be used for matching in the review model
    foreignField: 'store'   // represents the field on the review model that should be matched with the localfield
});

// function to auto populate the reviews
function autoPopulate(next) {
    this.populate('reviews');
    next();
};

// add hooks to auto populate the stores's reviews anytime a store is queried
storeSchema.pre('find', autoPopulate);
storeSchema.pre('findOne', autoPopulate);

// export this model so it can accessed when this file is required from other files
module.exports = mongoose.model('Store', storeSchema);
