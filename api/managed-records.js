import fetch from "../util/fetch-fill";
import URI from "urijs";

// /records endpoint
window.path = "http://localhost:3000/records";

// Your retrieve function plus any additional functions go here ...

const PRIMARY_COLORS = ['red', 'blue', 'yellow'];
const PAGE_SIZE = 10;
const IS_DEBUG = false;
const OPEN_VALUE = 'open';  // avoiding magic strings in the code...
const CLOSED_VALUE = 'closed';

/**
 * Determine if the given color is a primary color
 * @param color
 * @returns boolean true if the given color is a primary color
 */
let isPrimary = function (color) {
    // perhaps not complicated enough to warrant a method, but does enacapsulate the logic.
    // Maybe green will become a primary color some day?
    return PRIMARY_COLORS.includes(color);
};

/**
 * Define a backend URI to call, based on the given options
 * @param options
 * @param pageSize
 * @param pageToDisplay
 * @returns a URI to the backend ser ice
 */
let makeBackendServiceHref = function (options, pageSize, pageToDisplay) {
    let backendUri = URI(window.path);
    // Specify to get an additional item, beyond the page size, in order to easily discern if there's a next page
    // We'll remove this additional item from the returned data, if that many are returned
    backendUri
        .addSearch("limit", pageSize + 1)
        .addSearch("offset", (pageToDisplay - 1) * pageSize);
    if (options && options.colors) {
        options.colors
            .map(singleColor => backendUri.addSearch("color[]", singleColor));
    }
    return backendUri.href();
};

/**
 *
 * @param options, with possible 'page' and 'colors' values
 * @returns a promise with the results
 */
let retrieve = function (options) {

    let pageToDisplay = options && options.page ? options.page : 1;
    let backendServiceHref = makeBackendServiceHref(options, PAGE_SIZE, pageToDisplay);


    // Call the backend service to get the data
    let errorInformation = "";
    return fetch(backendServiceHref)
        .then(response => {
            if (IS_DEBUG) {
                console.log(JSON.stringify(response));
            }

            // If the backend service failed, log some pertinent information
            // If the API returns response codes, in additional to 200, that are 'OK', adjust this next assignment.
            let isBadResponse = response && response.status !== 200;
            if (isBadResponse) {
                errorInformation = "Unexpected response.status=" + response.status + "; href=" + backendServiceHref + "; ";
            }
            return response.json();
        })
        .then(returnJson => {

            // Define the object we'll return
            let returnObject = {};


            // Next and Previous Page
            // We requested one extra item beyond the PAGE_SIZE; if that extra item was returned, then
            //    set an appropriate nextPage value and remove the extra item gotten from the request
            let nextPageValue;
            let numReturnObjects = returnJson.length;
            if (numReturnObjects > PAGE_SIZE) {
                nextPageValue = pageToDisplay + 1;
                returnJson.pop();
            } else {
                nextPageValue = null;
            }
            returnObject.nextPage = nextPageValue;

            returnObject.previousPage = pageToDisplay === 1 ? null : pageToDisplay - 1;


            //  ID's
            returnObject.ids = returnJson.map(item => item.id);


            // Open primary objects (with an additional property indicating color primacy)
            returnObject.open =
                returnJson
                    .filter(item => item.disposition === OPEN_VALUE)
                    .map(item => {
                        item.isPrimary = isPrimary(item.color);
                        return item;
                    });


            // closedPrimaryCount
            returnObject.closedPrimaryCount =
                returnJson
                    .filter(item => item.disposition === CLOSED_VALUE)
                    .filter(item => isPrimary(item.color))
                    .length;  // alas, could not justify using .reduce() here to round out the functional trifecta...


            return returnObject;
        })
        .catch(
            error => console.log("error for href=" + backendServiceHref + ": " + errorInformation + error)
        );

};


export default retrieve;
