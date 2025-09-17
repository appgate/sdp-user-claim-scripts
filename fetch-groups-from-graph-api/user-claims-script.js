// Consult the documentation first
// https://github.com/appgate/sdp-user-claim-scripts/tree/master/fetch-groups-from-graph-api

const logToConsole = false;

// advanced settings, contact Appgate support

const applicationId = "%SECRET:AZURE_GRAPH_API_APPID%";
const clientSecret = "%SECRET:AZURE_GRAPH_ID_SECRET%";

const nameStartsWith = "";   // group display name prefix to filter, if any

const apiTimeOut = 1500;     // milliseconds. max 3000 (default)
const apiMaxPages = 5;       // max number of pages to follow in graph api
const apiPageSize = 999;     // max number of groups per page. must be 999

const cacheTokenHours = 0.5; // 0 to disable auth caching

// do not edit any setting after this line

const log = (msg) => logToConsole && console.log(msg);

const apiUrl = `https://graph.microsoft.com/v1.0/users/${claims.user["userId"]}/transitiveMemberOf`;
const cacheKeyToken = `entr-ad-token-${claims.user["tenantId"]}`;

const headers = [{ key: "Accept", value: "*/*" }];
const empty = { "groups": [], "groupsCount": 0 };

if (!claims || !claims.user || !claims.user["tenantId"] || !claims.user["userId"] || !applicationId || !clientSecret) {
  log("ERROR: user info is missing or script not configured correctly.");
  return empty;
}


const processGraphResponse = (response) => {
  if (!response) {
    log("ERROR: No response from api request.");
    return false;
  }
  if (!response.data || response.statusCode != 200) {
    log(`ERROR: Request failed with code ${response.statusCode}`);
    return false;
  }
  return JSON.parse(response.data);
}

const getGraphAccessToken = () => {
  const scope = "https://graph.microsoft.com/.default";
  const payload = `grant_type=client_credentials&client_id=${applicationId}&client_secret=${clientSecret}&scope=${encodeURI(scope)}`;
  const endpoint = `https://login.microsoftonline.com/${claims.user["tenantId"]}/oauth2/v2.0/token`;

  log("Sending access token request.");
  const response = httpPost(endpoint, payload, "application/x-www-form-urlencoded", [], apiTimeOut);
  const responseData = processGraphResponse(response);
  if (!responseData) {
    log("ERROR: No response for access token request.");
    return false;
  }

  log("Returning the access token.");
  return responseData.access_token;
}

const getGraphEndpointUrl = () => {
  const endpoint = `${apiUrl}?$top=${apiPageSize}`;

  if (!nameStartsWith) {
    return endpoint;
  }

  headers.push({ key: "ConsistencyLevel", value: "eventual" });
  const filter = `&$count=true&$orderby=displayName&$filter=startswith(displayName,'${nameStartsWith}')`;
  return `${endpoint}${encodeURI(filter)}`;
}

const getGraphGroups = () => {
  const groups = [];
  const endpoint = getGraphEndpointUrl();
  log("Sending first groups request.");
  const response = httpGet(endpoint, headers, apiTimeOut);
  const graphResultData = processGraphResponse(response);

  if (!graphResultData) {
    log("ERROR: No response for graph query.");
    return groups;
  }

  log("Processing graph result.");
  if (graphResultData["value"]) {
    graphResultData["value"].forEach(group => group["displayName"] && groups.push(group["displayName"]));
  } else {
    log("ERROR graph result has no value.");
  }

  let nextLink = graphResultData["@odata.nextLink"];

  let i = 0;
  while (nextLink && i++ < apiMaxPages) {
    log(`Sending next groups request ${i + 1}.`);
    const responseNext = httpGet(nextLink, headers, apiTimeOut);
    const nextResultData = processGraphResponse(responseNext);
    if (nextResultData) {
      nextResultData["value"].forEach(group => group["displayName"] && groups.push(group["displayName"]));
      nextLink = nextResultData["@odata.nextLink"];
    } else {
      nextLink = false;
    }
  }

  return groups;
}


const getAccessToken = () => {
  let token = null;

  if (cacheTokenHours > 0) {
    log("Token caching is enabled, using the cache.");
    token = cache.getIfPresent(cacheKeyToken);
    if (token) {
      return token;
    }
  }

  log("Fetching Graph API access token.");
  token = getGraphAccessToken();

  if (!token) {
    log("ERROR: Failed to fetch token, failing.");
    return false;
  }

  if (cacheTokenHours > 0) {
    log("Token caching is enabled, caching the token.");
    cache.put(cacheKeyToken, token, 60 * 60 * cacheTokenHours);
  }

  return token;
}

const token = getAccessToken();

if (!token) {
  log("ERROR: No access token.");
  return empty;
}

headers.push({ key: "Authorization", value: `Bearer ${token}` });

const groups = getGraphGroups();

log(`${groups.length} groups collected, returning.`);
return { "groups": groups, "groupsCount": groups.length };
