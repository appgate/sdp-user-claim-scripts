/**
 * @name Appgate Azure AD SAML Add >= 150 Groups to User Claims
 * @description
 * 1. Retrieves Tenant ID and User ID from user claims.
 * 2. Requests an authorization token from Microsoft API and adds authorization token to headers.
 * 3. Requests all groups a user is a member of from the Microsoft Graph API.
 * 4. Reads paginated response(s) and aggregates group display names.
 * 5. Returns the aggregated group display names as `azureGroups` in the claim.
 * @returns {{azureGroups: string[], groupCount: number}}
 * @ref https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
 */

/**
 * ====================================
 *  Configurable Options
 * ====================================
 */

/**
 * @const applicationId
 * @description The Azure registered application ID for Appgate which includes permissions to call the Microsoft Graph API
 * @type {string}
 * @example "9697a0f1-3b26-40a1-96c3-8d78da688c55"
 */
const applicationId = "... enter the application id here ...";

/**
 * @const clientSecret
 * @description The corresponding client secret for the Azure registered application ID
 * @type {string}
 * @example "abc7Q~defghijklmnopqrs0t123456789-_.~"
 */
const clientSecret = "... enter the secret here ...";

/**
 * @const logging
 * @description Whether claims script logging is enabled for troubleshooting.
 * Set to `false` for production use.
 * @type {boolean}
 * @default `false`
 */
const logging = false;


/**
 * ====================================
 * Advanced Options
 * Contact Appgate support before changing anything below this line
 * ====================================
 */

/**
 * @const displayNamePrefixFilter
 * @description Filter returned group names to only those which start with this string.
 * @type {string}
 */
const displayNamePrefixFilter = "";

/**
 * @const apiTimeOut
 * @description Requests to the MS Graph API time out after this many milliseconds.
 * Default and maximum allowed is 3000ms.
 * @type {number}
 */
const apiTimeOut = 1500;

/**
 * @const apiMaxPages
 * @description The maximum number of pages to follow in the MS Graph API.
 * @type {number}
 */
const apiMaxPages = 5;

/** @const apiPageSize
 * @description The maximum number of groups returned per page. This must remain 999.
 * @type {number}
 * @default `999`
 */
const apiPageSize = 999;

/**
 * @const cacheTokenHours
 * @description The amount of time in hours to cache the authentication token.
 * Change to 0 to disable token caching.
 * @type {number}
 * @default 0.5
 */
const cacheTokenHours = 0.5;

/**
 * @const cacheGroupHours
 * @description **Warning: Group caching is memory intensive.** The amount of time in hours to cache groups.
 * `0` disables group caching.
 * @type {number}
 * @default 0
 */
const cacheGroupsHours = 0;

/**
 * ====================================
 * Do not edit anything below this line
 * ====================================
 */

/**
 * @const apiUrl
 * @description The Microsoft Graph API endpoint to get groups for a user.
 * Uses the `UserId` claim to fill the user's object ID or user principal name.
 * @type {string}
 */
const apiUrl = `https://graph.microsoft.com/v1.0/users/${ claims.user["UserId"] }/transitiveMemberOf`;
/**
 * @const cacheKeyToken
 * @description The authentication token key name to store the authorization token in Appgate's cache.
 * Irrelevant if @link cacheTokenHours is `0`
 * @type {string}
 */
const cacheKeyToken = `azure-ad-token-${ claims.user["TenantId"] }`;
/**
 * @const cacheKeyGroups
 * @type string
 * @description The group cache key name to store groups in Appgate's cache.
 * Irrelevant if @link cacheGroupsHours is `0`
 * @type {string}
 */
const cacheKeyGroups = `azure-ad-groups-${ claims.user["UserId"] }`;

/**
 * @const headers
 * @description The headers to include with MS Graph API requests.
 * @type {{key: string, value: string}}[]
 */
const headers = [{ key: "Accept", value: "*/*" }];

/**
 * @const defaultClaim
 * @description The default claim returned if there is an error or no groups were found.
 * @type {{groupCount: number, azureGroups: string[]}}
 */
const defaultClaim = { "azureGroups": [], "groupCount": 0 };


/**
 * @const log
 * @description Helper function that logs a message to console when logging is enabled.
 * @param {string} msg
 */
const log = (msg) => {
  if(logging) {
    console.log(msg);
  }
}

/**
 * @const validateConfig
 * @description Helper function that verifies configuration options are provided.
 * @returns {boolean} `true` if all options are configured. `false` if one or more options are not configured.
 */
const validateConfig = () => {
  let msg = "";
  if(!claims.user["TenantId"]) {
    msg += "TenantId map is not configured or is invalid."
  }
  if(!claims.user["UserId"]) {
    msg += "UserId map is not configured or is invalid."
  }
  if(!applicationId) {
    msg += "applicationId script variable is not configured or is invalid."
  }
  if(!clientSecret) {
    msg += "clientSecret script variable is not configured or is invalid."
  }
  if(msg !== "") {
    log(msg)
    return false;
  }
  return true;
}


/**
 * @const processResponse
 * @description Helper function which processes an HTTP response and returns data or `false`.
 * @param {{data: any, statusCode: number}} response The HTTP response to parse.
 * @returns {{data: any}|boolean} When response data is present and OK status, returns parsed JSON data, otherwise returns false.
 */
const processResponse = (response) => {
  if(!response) {
    log("processResponse: No response received.");
    return false;
  }
  if(!response.data || response.statusCode != 200) {
    log(`processResponse: Request failed with code ${ response.statusCode }`);
    return false;
  }
  return JSON.parse(response.data);
}

/**
 * @const getAccessToken
 * @description Requests a token from Microsoft Graph API for the default scope.
 * @returns {string|boolean} When successful, returns the access token, otherwise returns false.
 */
const getAccessToken = () => {
  const scope = "https://graph.microsoft.com/.default";
  const payload = `grant_type=client_credentials&client_id=${ applicationId }&client_secret=${ clientSecret }&scope=${ encodeURI(scope) }`;
  const endpoint = `https://login.microsoftonline.com/${ claims.user["TenantId"] }/oauth2/v2.0/token`;

  log("getAccessToken: Sending token request.");
  const response = httpPost(endpoint, payload, "application/x-www-form-urlencoded", [], apiTimeOut);

  const responseData = processResponse(response);
  if(!responseData) {
    log("getAccessToken: Error obtaining access token.");
    return false;
  }

  log("getAccessToken: Access token obtained.");
  return responseData.access_token;
}

/**
 * @const getEndpointUrl
 * @description Helper function which constructs the Microsoft Graph API endpoint URL with headers and query parameters.
 * @returns {string} The constructed endpoint URL.
 */
const getEndpointUrl = () => {
  const endpoint = `${ apiUrl }?$top=${ apiPageSize }`;

  if(!displayNamePrefixFilter) {
    log("getEndpointUrl: No display name filter configured; using default endpoint.")
    return endpoint;
  }

  log("getEndpointUrl: Using endpoint with displayNamePrefixFilter")
  headers.push({ key: "ConsistencyLevel", value: "eventual" });
  const filter = `&$count=true&$orderby=displayName&$filter=startswith(displayName,'${ displayNamePrefixFilter }')`;
  return `${ endpoint }${ encodeURI(filter) }`;
}

/**
 * @const getGroups
 * @description Helper function which attempts to retrieve groups for a user. When more than one page is returned, handles pagination.
 * @returns {string[]} Returns an array of group display names, or empty array if there is a failure.
 */
const getGroups = () => {
  const groups = [];
  const endpoint = getEndpointUrl();

  log("getGroups: Sending Page 1 groups request.");
  const response = httpGet(endpoint, headers, apiTimeOut);
  const graphResultData = processResponse(response);

  if(!graphResultData) {
    log("getGroups: graphResultData was invalid. Returning empty groups.")
    return groups;
  }

  graphResultData["value"].forEach(group => groups.push(group["displayName"]));
  let nextLink = graphResultData["@odata.nextLink"];

  let i = 0;
  while(nextLink && i++ < apiMaxPages) {
    const from = nextLink.indexOf("?");
    const until = nextLink.length;
    const parameterLink = nextLink.slice(from, until);
    const newLink = `${ apiUrl }${ parameterLink }`;

    log(`getGroups: Sending Page ${ i + 1 } groups request.`);
    const responseNext = httpGet(newLink, headers, apiTimeOut);
    const nextResultData = processResponse(responseNext);
    if(nextResultData) {
      nextResultData["value"].forEach(group => groups.push(group["displayName"]));
      nextLink = nextResultData["@odata.nextLink"];
    } else {
      nextLink = false;
    }
  }

  return groups;
}

/**
 * ==========
 * Main Module
 * ==========
 */

if(!validateConfig()) {
  return defaultClaim;
}


/**
 * @name groups
 * @type {string[]}
 */
let groups = [];

/** Get groups from Appgate cache if group caching is configured */
if(cacheGroupsHours > 0) {
  groups = cache.getIfPresent(cacheKeyGroups);
  if(groups) {
    log("Group caching is enabled, using the cache.");
    return { "azureGroups": groups, "groupCount": groups.length };
  } else {
    log("Group caching is enabled, but cache is empty.");
  }
}

/**
 * @name token
 * @type {string|boolean}
 */
let token;

/** Get token from Appgate cache if token caching is configured */
if(cacheTokenHours > 0) {
  token = cache.getIfPresent(cacheKeyToken);
  log("Token caching is enabled, using the cache.");
}

if(!token) {
  log("Token cache is empty, fetching access token.");
  token = getAccessToken();

  if(!token) {
    log("Failed to fetch token from cache and Microsoft login API.");
    return defaultClaim;
  }

  if(cacheTokenHours > 0) {
    log("Token caching is enabled, caching the token.");
    cache.put(cacheKeyToken, token, 60 * 60 * cacheTokenHours);
  }
}

headers.push({ key: "Authorization", value: `Bearer ${ token }` });

groups = getGroups();

log(`Fetched ${ groups.length } groups.`);

if(cacheGroupsHours > 0) {
  log("Group caching is enabled, caching the groups.");
  cache.put(cacheKeyGroups, groups, 60 * 60 * cacheGroupsHours);
}

return { "azureGroups": groups, "groupCount": groups.length };
