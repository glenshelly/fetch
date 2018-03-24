import fetch from "../util/fetch-fill";
import URI from "urijs";

// /records endpoint
window.path = "http://localhost:3000/records";

// Your retrieve function plus any additional functions go here ...

const primaryColors = ['red', 'blue', 'yellow'];
const pageSize = 10;
const isDebug = false;

/**
 * Determine if the given color is a primary color
 * @param color
 * @returns boolean - true if the given color is a primary color
 */
let isPrimary = function (color) {
    // perhaps not complicated enough to warrant a method, but does enacapsulate the logic.
    // Maybe green will become a primary color some day?
    return primaryColors.includes(color);
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
    // Specify to get 11 items, in order to easily discern if there's a next page
    // We'll remove the 11th item from the returned data, if that many are returned
    backendUri
        .addSearch("limit", pageSize + 1)
        .addSearch("offset", (pageToDisplay - 1) * pageSize);
    if (options && options.colors) {
        options.colors
            .map(singleColor => backendUri
                .addSearch("color[]", singleColor));
    }
    return backendUri.href();
};

/**
 *
 * @param options, with 'page' and 'colors' fields
 * @returns a promise with the results
 */
let retrieve = function (options) {

    let pageToDisplay = options && options.page ? options.page : 1;
    let backendServiceHref = makeBackendServiceHref(options, pageSize, pageToDisplay);


    // Call the backend service to get the data
    let errorInformation = "";
    return fetch(backendServiceHref)
        .then(response => {
            if (isDebug) console.log(JSON.stringify(response));
            // If the backend service failed, log some pertinent information
            if (response && response.status !== 200) {
                errorInformation = "Unexpected response.status=" + response.status + "; href=" + backendServiceHref + "; ";
            }
            return response.json();
        })
        .then(returnJson => {

            let returnObject = {};

            // Determine the previous and next page
            let numReturnObjects = returnJson.length;
            returnObject.previousPage = pageToDisplay === 1 ? null : pageToDisplay - 1;
            returnObject.nextPage = numReturnObjects === pageSize + 1 ? pageToDisplay + 1 : null;


            // remove 11th item, if there is one
            if (numReturnObjects === pageSize + 1) {
                returnJson.pop();
            }


            // Add ID's
            returnObject.ids =
                returnJson
                    .map((item) => {
                        return item.id
                    });


            // Add Open primary objects to an array
            returnObject.open =
                returnJson
                    .filter(item => {
                        return item.disposition === "open"
                    })
                    .map(item => {
                        item.isPrimary = isPrimary(item.color);
                        return item;
                    });


            // Add closedPrimaryCount
            returnObject.closedPrimaryCount =
                returnJson
                    .filter(item => {
                        return item.disposition === "closed"
                    })
                    .filter(item => {
                        return isPrimary(item.color)
                    })
                    .length;

            return returnObject;
        })
        .catch(
            error => console.log("error for href=" + backendServiceHref + ": " + errorInformation + error)
        );

};



export default retrieve;
