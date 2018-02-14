// const axios = require('axios');  // importing using traditional require
import axios from 'axios';       // using es6 import cos we are being consistent with es6 on frontend
// Note that in server side javascript (i.e node) there is no es6 for it yet, so traditional javascript is used

// since we are embedding html in our code, we should be careful of user input
import dompurify from 'dompurify';  // this library helps sanitize the html that user provides

// function for displaying our search results
function searchResultsHTML(stores) {
    return stores.map(store => {    // we are returning a link to each of the returned stores by mapping over each stores
        return `
            <a href="/store/${store.slug}" class="search__result">
                <strong>${store.name}</strong>
            </a>
        `;
    })
    // since map returns an array, we need to join them
    .join('');
}

// fxn for search stores
function typeAhead(search) {
    // dont run this function is there is no item to search
    if (!search) return;

    const searchInput = search.querySelector('input[name="search"]');
    const searchResults = search.querySelector('.search__results');

    // console.log(searchInput, searchResults);

    // listen for input event on the searchInput element
    // Note that .on() is shortcut for .addEventListener() on bling.js
    searchInput.on('input', function () {
        // console.log(this.value);
        
        // if there is no value, quit it
        if (!this.value) {
            searchResults.style.display = 'none';
            return;     // stop!
        }

        // else show the search results
        searchResults.style.display = 'block';
        // but initially, set the result to empty until result is gotten from ther server
        searchResults.innerHTML = '';

        // use axios to hit the endpoint to do the search on our db
        axios
            .get(`/api/v1/search?q=${this.value}`)
            .then(res => {      // we chain the response which is a promise
                if (res.data.length) {
                    // console.log('There is something to show!');

                    // render the search result after converting to html links. Note that we are sanitizing the html too
                    searchResults.innerHTML = dompurify.sanitize(searchResultsHTML(res.data));
                    return;
                }
                // else tell user that no match was found. after sanitization
                searchResults.innerHTML = dompurify.sanitize(`<div class="search__result">No results for <strong>${this.value}</strong> found!</div>`);
            })
            // we catch any errors here
            .catch(err => {
                console.error(err);
            })

    });

    // handle keyboard inputs
    searchInput.on('keyup', (e) => {
        // console.log(e.keyCode);
        // if they aren't pressing up, down or enter keys, who cares!
        if (![38, 40, 13].includes(e.keyCode)) {
            return;     // do nothing
        }
        // otherwise, do something
        // console.log('DO SOMETHING!!');

        // set the name of the class of the actively selected result item
        const activeClass = 'search__result--active';
        
        // search for the currently selected search result item
        const current = search.querySelector(`.${activeClass}`);
        
        // we capture all the result items here
        const items = search.querySelectorAll('.search__result');

        // we are using 'let' below because we are going to be constanly updating the value based on current selection
        let next;
        
        // if down key is pressed and there is a currently selected item already, set the next one to the next sibling or the first item if the current item is the last sibling
        if (e.keyCode === 40 && current) {
            next = current.nextElementSibling || items[0];
        }
        // else if down key is pressed without any currently selected item, select the first item
        else if (e.keyCode === 40) {
            next = items[0];
        }
        // else if the up key is pressed and there is a currently selected item, set the next item to the previous sibling, or the last result item if the current item is the first sibling
        else if (e.keyCode === 38 && current) {
            next = current.previousElementSibling || items[items.length - 1];
        }
        // else if up key is pressed without any currently selected item, select the last item
        else if (e.keyCode === 38) {
            next = items[items.length - 1];
        }
        // if the enter key is pressed and there is a result item currently selected with href attribute on it, go to that url
        else if (e.keyCode === 13 && current.href) {
            window.location = current.href;
            return;     // stop this function from running
        }

        // console.log(next);

        // with the next item identified, remove the active class from the current item if there is any current item
        if (current) {
            current.classList.remove(activeClass);
        }

        // with the next item identified, add the active class styling to the next item to show that it is currently selected
        next.classList.add(activeClass)

    })
}

export default typeAhead;