// Consult the documentation first
// https://github.com/appgate/sdp-user-claim-scripts/tree/master/fetch-groups-from-ldap

const logToConsole = false;

const agControllerUrl = "https://ctrl.company.com:8443";   // Controller URL
const agLdapUuid = "a65d5c2c-2e88-45f1-8c03-c21ee607463a"; // LDAP IdP UUID to fetch groups from
const agUsernameClaimName = "username";                    // Name of the Identifier Claim

const agApiVersion = 22;                                   // API Version
const agApiProvider = "local";                             // API User Identity Provider
const agApiUsername = "ldap-api-user";                     // API User Username
const agApiPassword = "%SECRET:LDAP_API_USER_PASSWORD%";   // API User Credentials Secret Name

// advanced settings, contact Appgate support

const ldapTimeoutMs = 5000;   // Max 5 seconds
const cacheTokenHours = 0.5;  // 0 to disable auth caching

// do not edit any setting after this line

const log = (msg) => logToConsole && console.log(msg);

const cacheKeyToken = "fetch-groups-from-ldap-token-cache";

const empty = { "groups": [], "groupsCount": 0 };
const headers = [
  { key: "Content-Type", value: "application/json" },
  { key: "Accept", value: `application/vnd.appgate.peer-v${agApiVersion}+json` }
];

if (!claims || !claims.user || !claims.user[agUsernameClaimName]) {
  log("ERROR: username claim is not found.");
  return empty;
}

const username = claims.user[agUsernameClaimName];

const getControllerToken = () => {
  const payload = {
    providerName: agApiProvider,
    username: agApiUsername,
    password: agApiPassword,
    deviceId: "4c07bc67-57ea-42dd-b702-c2d6c45419fc"
  };

  log("Logging in to the Controller.");
  const endpoint = `${agControllerUrl}/admin/login`;
  const response = httpPost(endpoint, JSON.stringify(payload), "application/json", headers);

  if (!response || response.statusCode !== 200) {
    log(`ERROR: Failed to fetch token from the Controller ${response && response.statusCode}.`);
    return false;
  }

  log("Returning the access token");
  return JSON.parse(response.data).token;
}

const getLdapUserAttributes = (token) => {
  const authHeaders = headers.slice();
  authHeaders.push({ key: "Authorization", value: `Bearer ${token}` });

  const payload = { username: username };
  const endpoint = `${agControllerUrl}/admin/identity-providers/${agLdapUuid}/attributes`;

  log("Getting user attributes from LDAP IdP.");
  const response = httpPost(endpoint, JSON.stringify(payload), "application/json", authHeaders, ldapTimeoutMs);

  if (!response) {
    log("ERROR: Failed to get user attributes from LDAP.");
    return false;
  }

  if (response.statusCode === 401 || response.statusCode === 403) {
    log("ERROR: Token expired or revoked.");
    throw new Error("403");
  }

  if (response.statusCode !== 200) {
    log(`ERROR: Failed to get user attributes from LDAP: ${response.statusCode}.`);
    return false;
  }

  log("Returning user attributes.");
  const userAttributes = JSON.parse(response.data);

  if (!userAttributes.mappedAttributes || !userAttributes.mappedAttributes.groups) {
    log("ERROR: user attributes are empty.");
    return false;
  }

  return userAttributes.mappedAttributes.groups;
}

const getToken = (forceRefresh = false) => {
  let token = null;

  if (!forceRefresh && cacheTokenHours > 0) {
    log("Token caching is enabled, using the cache.");
    token = cache.getIfPresent(cacheKeyToken);

    if (token) {
      return token;
    }
  }

  log("Fetching the Controller API access token.");
  token = getControllerToken();

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

const getGroups = (forceRefresh = false) => {
  const token = getToken(forceRefresh);
  if (!token) {
    log("ERROR: Failed to get access token.");
    return empty;
  }

  const groups = getLdapUserAttributes(token);
  if (!groups) {
    log("ERROR: Failed to get groups.");
    return empty;
  }

  log("Success.");
  return { "groups": groups, "groupsCount": groups.length };
}

try {
  return getGroups();
} catch (error) {
  if (cacheTokenHours > 0 && error.message === "403") {
    // token maybe revoked, try again after refreshing
    log("WARNING: Force refreshing the token.");
    return getGroups(true);
  }

  log(`ERROR: Unknown error. Returning empty ${error && error.message} .`);
  return empty;
}
