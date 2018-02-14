import axios from 'axios';
import { $ } from './bling';    // enables shortcut like jquery

// some map options here
const mapOptions = {
    center: { lat: 43.2, lng: -79.8 },
    zoom: 10
};

function loadPlaces(map, lat = 43.2, lng = -79.8) {
    // make ajax call
    axios.get(`/api/v1/stores/near?lat=${lat}&lng=${lng}`)
        .then(res => {
            const places = res.data;
            // console.log(places);
            if (!places.length) {
                alert('no places found!');
                return;
            }

            // create a bounds. This will make all places/markers to be properly centered on the map
            const bounds = new google.maps.LatLngBounds();

            // make the info window
            const infoWindow = new google.maps.InfoWindow();

            // make markers for our places
            const markers = places.map(place => {
                // we mapping the coordinates of these places
                const [placeLng, placeLat] = place.location.coordinates;
                // console.log(placeLng, placeLat);

                // make position objects for google map
                const position = { lat: placeLat, lng: placeLng };

                // before making this marker, we extend the bounds to accomodate this new position
                bounds.extend(position);

                // create the actual marker
                const marker = new google.maps.Marker({
                    map: map,   // the map div
                    position: position
                });

                // attach the place data (from our api) to the marker
                marker.place = place;

                // we finally return the marker
                return marker;
            });

            // loop over these markers and attach an evenlistener so that when clicked, the details will show in an infowindow
            markers.forEach(marker => marker.addListener('click', function () {
                // get the place details attached to this marker
                // console.log(this.place);

                // we make html for the content of the infowindow
                const html = `
                    <div class="popup">
                        <a href="/store/${this.place.slug}">
                            <img src="/uploads/${this.place.photo || 'store.png'}" alt="${this.place.name}" />
                            <p>${this.place.name} - ${this.place.location.address}</p>
                        </a>
                    </div>
                `;

                // populate the infowindow
                infoWindow.setContent(html);

                // open the infowindow on the map and on top of this current marker
                infoWindow.open(map, this);
            }))

            // console.log(markers);

            // now zoom the map to fit all the markers perfectly
            map.setCenter(bounds.getCenter());
            map.fitBounds(bounds);
        });
}

// you can default location to user's location using this line below
// navigator.geolocation.getCurrentPosition

function makeMap(mapDiv) {
    // dont run this function is there is no map div
    if (!mapDiv) return;
    // console.log(mapDiv);

    // make our map
    const map = new google.maps.Map(mapDiv, mapOptions)     // reference our map variable

    // load places on our map
    loadPlaces(map);

    // grab the input. The $ shortcut used here is made possible by bling.js
    const input = $('[name="geolocate"]');
    // console.log(input);

    // make this input field autocomplete
    const autocomplete = new google.maps.places.Autocomplete(input);

    // add listener to the autocomplete field
    autocomplete.addListener('place_changed', () => {   // using arrow fxn since we don't need to use 'this'
        const place = autocomplete.getPlace();
        // console.log(place);

        // load this place on the map
        loadPlaces(map, place.geometry.location.lat(), place.geometry.location.lng())
    });
}

export default makeMap;