// Consult the documentation first
// https://github.com/appgate/sdp-user-claim-scripts/tree/master/fetch-app-ids-from-okta

const logToConsole = false;

const TENANT_URL = "https://your-tenant.okta.com"; // replace with your Okta tenant URL

// advanced settings, contact AppGate support

const oktaApiToken = "%SECRET:OKTA_API_TOKEN%";

const apiTimeOut = 1500;    // milliseconds. max 3000 (default)
const apiMaxPages = 20;     // max number of pages to follow
const apiPageSize = 200;    // max number of apps per page. must be 200

// do not edit any setting after this line

const log = (msg) => logToConsole && console.log(msg);

const empty = { "appids": [] };

if (!oktaApiToken || !claims || !claims.user || !claims.user["oktaid"]) {
  log("ERROR: Okta API token or user oktaid claim is missing.");
  return empty;
}

const oktaUserId = claims.user["oktaid"];

const headers = [
  { key: "Accept", value: "application/json" },
  { key: "Authorization", value: `SSWS ${oktaApiToken}` }
];

const processOktaResponse = (response) => {
  if (!response) {
    log("ERROR: No response from API request.");
    return false;
  }
  if (!response.data || response.statusCode != 200) {
    log(`ERROR: Request failed with code ${response.statusCode}`);
    return false;
  }
  try {
    const parsed = JSON.parse(response.data);
    if (!Array.isArray(parsed)) {
      log("ERROR: Unexpected response format, expected an array.");
      return false;
    }
    return parsed;
  } catch (e) {
    log("ERROR: Failed to parse response JSON.");
    return false;
  }
};

const getAppIds = () => {
  const appIds = [];
  const filter = encodeURIComponent(`user.id eq "${oktaUserId}"`);
  const baseUrl = `${TENANT_URL}/api/v1/apps?filter=${filter}&limit=${apiPageSize}`;

  log("Sending first apps request.");
  const response = httpGet(baseUrl, headers, apiTimeOut);
  let lastPage = processOktaResponse(response);

  if (!lastPage) {
    log("ERROR: No response for apps query.");
    return appIds;
  }

  lastPage.forEach(app => app["id"] && appIds.push(app["id"]));

  let i = 0;
  // if the page was full, there may be more — use the last raw item's id as the after cursor
  while (lastPage.length === apiPageSize && i++ < apiMaxPages) {
    const after = lastPage[lastPage.length - 1]["id"];
    if (!after) {
      log("ERROR: Could not determine pagination cursor.");
      break;
    }
    log(`Sending next apps request ${i + 1}, after=${after}.`);
    const nextResponse = httpGet(`${baseUrl}&after=${after}`, headers, apiTimeOut);
    const nextPage = processOktaResponse(nextResponse);
    if (!nextPage) {
      break;
    }
    nextPage.forEach(app => app["id"] && appIds.push(app["id"]));
    lastPage = nextPage;
  }

  return appIds;
};

try {
  const appIds = getAppIds();
  log(`${appIds.length} app IDs collected, returning.`);
  return { "appids": appIds };
} catch (e) {
  log("ERROR: Unexpected error in getAppIds.");
  return empty;
}
