import '../sass/style.scss';

import { $, $$ } from './modules/bling';
import autocomplete from './modules/autocomplete';
import typeAhead from './modules/typeAhead';
import makeMap from './modules/map';
import ajaxHeart from './modules/heart';

// adding autocomplete to the address input of the store form
autocomplete($('#address'), $('#lat'), $('#long'));     // NOTE: the $, and $ are made possible by the use of bling.js

typeAhead($('.search'));    // call the typeAhead fxn

makeMap($('#map'));         // call the makeMap fxn

// we select all heart forms and call the ajaxHeart fxn on their submit event
// we select all forms using the $$ shortcut courtesy of bling.js
const heartForms = $$('form.heart');
// console.log(heartForms);

// add event listener to their submit events. Bling.js has afforded the chance to listen to multiple events without having to loop over them
heartForms.on('submit', ajaxHeart);