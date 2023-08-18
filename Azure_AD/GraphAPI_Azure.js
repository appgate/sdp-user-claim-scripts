/*
Microsoft identity platform and the OAuth 2.0 client credentials flow
https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow
 1. Get Tenant ID and User ID from Claims
 2. Call MS Login to get Authorization token
 3. Add Authorization token as Bearer JWT
 4. Call MS Graph API to get groups that user is a member of
 5. If a '"@odata.nextLink' is provided, then call again until all groups are loaded
 6. Collect the displayNames of the Groups
*/

// update values below

const applicationId = "... enter the application id here ...";
const clientSecret = "... enter the secret here ...";

const logging = false;


// advanced settings, contact Appgate support

// group name prefix to filter, if any.
const displayNameStartsWith = ""; 

const apiTimeOut = 1500; // miliseconds. max 3000 (default)
const apiMaxPages = 5;   // max number of pages to follow in graph api
const apiPageSize = 999;  // max number of groups per page. must be 999.

const cacheTokenHours = 0.5; // 0 to disable auth caching.
const cacheGroupsHours = 0; // 0 to disable group caching. memory intensive.

// do not edit any setting after this line

const apiUrl = `https://graph.microsoft.com/v1.0/users/${claims.user["UserId"]}/transitiveMemberOf`;
const cacheKeyToken = `azure-ad-token-${claims.user["TenantId"]}`;
const cacheKeyGroups = `azure-ad-groups-${claims.user["UserId"]}`;

const headers = [{ key: "Accept", value: "*/*" }];
const empty = { "azureGroups": [], "groupCount": 0 };

// fail if not configured correctly
if (!claims.user["TenantId"] || !claims.user["UserId"] || !applicationId || !clientSecret) {
  return empty;
}

const log = (msg) => {
  if (logging) {
    console.log(msg);
  }
}

const processResponse = (response) => {
  if (!response) {
    log("No reponse from api request.");
    return false;
  }
  if (!response.data || response.statusCode != 200) {
    log(`Request failed with code ${response.statusCode}`);
    return false;
  }
  return JSON.parse(response.data);
}

const getAccessToken = () => {
  const scope = "https://graph.microsoft.com/.default";
  const payload = `grant_type=client_credentials&client_id=${applicationId}&client_secret=${clientSecret}&scope=${encodeURI(scope)}`;
  const endpoint = `https://login.microsoftonline.com/${claims.user["TenantId"]}/oauth2/v2.0/token`;

  log("Sending token request.");
  const response = httpPost(endpoint, payload, "application/x-www-form-urlencoded", [], apiTimeOut);

  const responseData = processResponse(response);
  if (!responseData) {
    return false;
  }

  return responseData.access_token;
}

const getEndpointUrl = () => {
  const endpoint = `${apiUrl}?$top=${apiPageSize}`;

  if (!displayNameStartsWith) {
    return endpoint;
  }

  headers.push({ key: "ConsistencyLevel", value: "eventual" });
  const filter = `&$count=true&$orderby=displayName&$filter=startswith(displayName,'${displayNameStartsWith}')`;
  return `${endpoint}${encodeURI(filter)}`;
}

const getGroups = () => {
  const groups = [];
  const endpoint = getEndpointUrl();

  log("Sending first groups request.");
  const response = httpGet(endpoint, headers, apiTimeOut);
  const graphResultData = processResponse(response);

  if (!graphResultData) {
    return groups;
  }

  graphResultData["value"].forEach(group => groups.push(group["displayName"]));
  let nextLink = graphResultData["@odata.nextLink"];

  let i = 0;
  while (nextLink && i++ < apiMaxPages) {
    const from = nextLink.indexOf("?");
    const until = nextLink.length;
    const parameterLink = nextLink.slice(from, until);
    const newLink = `${apiUrl}${parameterLink}`;

    log(`Sending next groups request ${i + 1}.`);
    const responseNext = httpGet(newLink, headers, apiTimeOut);
    const nextResultData = processResponse(responseNext);
    if (nextResultData) {
      nextResultData["value"].forEach(group => groups.push(group["displayName"]));
      nextLink = nextResultData["@odata.nextLink"];
    } else {
      nextLink = false;
    }
  }

  return groups;
}

let groups = [];
if (cacheGroupsHours > 0) {
  groups = cache.getIfPresent(cacheKeyGroups);
  if (groups) {
    log("Group caching is enabled, using the cache.");
    return { "azureGroups": groups, "groupCount": groups.length };
  } else {
    log("Group caching is enabled, but cache is empty.");
  }
}

let token;
if (cacheTokenHours > 0) {
  token = cache.getIfPresent(cacheKeyToken);
  log("Token caching is enabled, using the cache.");
}

if (!token) {
  log("Token is empty, fetching again.");
  token = getAccessToken();

  if (!token) {
    log("Failed to fetch token, failing.");
    return empty;
  }

  if (cacheTokenHours > 0) {
    log("Token caching is enabled, caching the token.");
    cache.put(cacheKeyToken, token, 60 * 60 * cacheTokenHours);
  }
}

headers.push({ key: "Authorization", value: `Bearer ${token}` });

groups = getGroups();

log(`Fetched groups: ${groups.length}`);

if (cacheGroupsHours > 0) {
  log("Group caching is enabled, caching the groups.");
  cache.put(cacheKeyGroups, groups, 60 * 60 * cacheGroupsHours);
}

return { "azureGroups": groups, "groupCount": groups.length };
