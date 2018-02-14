import axios from 'axios';
import { $ } from './bling';

function ajaxHeart(e) {     // this takes an event that we will be hooking up to the submit event
    // first stop the form from submitting itself on the browser. We ll handle form submission with javascript
    e.preventDefault();
    console.log("HEART IT!!!");
    console.log(this);

    // submit with ajax
    axios
        .post(this.action)     // remember, its a POST call. We are getting the url from this form's action attribute
        .then(res => {
            // console.log(res.data);

            // toggle heart button based on whether store is hearted or not
            const isHearted = this.heart.classList.toggle('heart__button--hearted');
            // console.log(isHearted);

            // update the heart count in the nav bar. we are selecting this item using bling.js shortcut
            $('.heart-count').textContent = res.data.hearts.length;

            // if hearted, lets add a fancy animation to the heart
            if (isHearted) {
                this.heart.classList.add('heart__button--float');

                // remove this class from this icon after 2.5 seconds
                setTimeout(() => this.heart.classList.remove('heart__button--float'), 2500);    // using arrow fxn so we can reference 'this'
            }
        })
        .catch(console.error);

}

export default ajaxHeart;