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

var list_of_group_displayNames = [];
var groupsCount = 0;
var headers = [{ key: "Accept", value: "*/*" }];

///////////////
// Logging
var log2Console = true; //Visible UI edit mode test panel
var log2Audit = false;  //Visible in audit logs
function log(msg) {
	var prefix = "GraphAPI_Azure: ";
	msg = prefix + msg;
	if (log2Console)
		console.log(msg + "; ");
	if (log2Audit)
		auditLog(msg);
}

function process_response(response) {
	if (!response) {
		log("No reponse from api request");
	} else if (response.statusCode >= 200 && response.statusCode < 300 && response.data) {
		return JSON.parse(response.data);
	}
	log("Request failure [ " + response.statusCode + " ]:" + response.data);
	return undefined;
}

function authorizeViaAzure_AD(tenant_id) {
	var application_id = "<application-id-guid>";  // REPLACE with real value
	var client_secret_value = "<client-secret-value>";  // REPLACE with real value
	var scope = "https://graph.microsoft.com/.default";
	var request_data = "grant_type=client_credentials&client_id=" + application_id + "&client_secret=" + client_secret_value + "&scope=" + encodeURI(scope);
	var auth_endpoint = "https://login.microsoftonline.com/" + tenant_id + "/oauth2/v2.0/token";
	var auth_response = httpPost(auth_endpoint, request_data, "application/x-www-form-urlencoded");

	var response_data = process_response(auth_response);
	if (response_data) {
		headers.push({ key: "Authorization", value: "Bearer " + response_data.access_token });
		return true;
	}
	return false;
}

function addDisplayNameToList(groups) {
	for (var index = 0; index < groups.length; index++) {
		var group = groups[index];
		list_of_group_displayNames.push(group["displayName"]);
		groupsCount++;
	}
}

function getGroupNamesFromApi() {
	var tenant_id = claims.user["TenantId"];
	var user_id = claims.user["UserId"];
	var graph_api_url = "https://graph.microsoft.com/v1.0/users/";
	if (tenant_id && user_id) {
		try {
			if (authorizeViaAzure_AD(tenant_id)) {
				var endpoint = filterBydisplayName(graph_api_url + user_id + "/memberOf");
				var response = httpGet(endpoint, headers);
				var graphResultData = process_response(response);
				if (graphResultData) {
					var groups = graphResultData["value"];
					addDisplayNameToList(groups);
					getGroupsOverlimit(graphResultData["@odata.nextLink"]);
				}
			}
		} catch (err) {
			log(err);
		}
	}

	function filterBydisplayName(endpoint) {
		var displayNameStartswith = undefined;  // REPLACE with real value if filtering
		var filter = "$count=true&$orderby=displayName&$filter=startswith(displayName,'" + displayNameStartswith + "')";
		if (displayNameStartswith) {
			endpoint = endpoint + "?" + encodeURI(filter);
			headers.push({ key: "ConsistencyLevel", value: "eventual" });
		}
		return endpoint;
	}

	function getGroupsOverlimit(nextLink) {
		while (nextLink) {
			var from = nextLink.indexOf("?");
			var until = nextLink.length;
			var parameterLink = nextLink.slice(from, until);
			var newLink = graph_api_url + user_id + "/memberOf" + parameterLink;
			var responseNext = httpGet(newLink, headers);
			var nextResultData = process_response(responseNext);
			if (nextResultData) {
				var additionalGroups = nextResultData["value"];
				addDisplayNameToList(additionalGroups);
				nextLink = nextResultData["@odata.nextLink"];
			} else {
				nextLink = undefined;
			}
		}
	}
}
///////////////
// MAIN
getGroupNamesFromApi();

return { 
	"azureGroups": list_of_group_displayNames, 
	"groupsCount": groupsCount
};
