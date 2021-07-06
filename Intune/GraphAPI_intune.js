var tenant_id = "<tenant-id-guid>"; // REPLACE with real value
var client_id = "<client-id-guid>"; // REPLACE with real value
var client_secret = "<client-secret-value>"; // REPLACE with real value
var user_id = "<user-id-guid>";  // REPLACE with imported value

var scope = "https://graph.microsoft.com/.default";
var auth_endpoint = "https://login.microsoftonline.com/" + tenant_id + "/oauth2/v2.0/token";

///////////////
// Logging
var log2Console = true; //Visible UI edit mode test panel
var log2Audit = false;  //Visible in audit logs
function log(msg) {
	var prefix = "GraphAPI_Intune: ";
	msg = prefix + msg;
	if (log2Console)
		console.log(msg + "; ");
	if (log2Audit)
		auditLog(msg);
}

function process_response(response) {
	var dataObj;
	if (!response) {
		log("No reponse from api request");
	} else if (response.statusCode >= 200 && response.statusCode < 300 && response.data) {
		dataObj = JSON.parse(response.data);
	} else {
		log("Request failure [ " + response.statusCode + " ]:" + response.data);
	}
	return dataObj;
}

function CSF_Auth() {
	var success = false;
	var request_data = "grant_type=client_credentials&client_id=" + client_id + "&client_secret=" + client_secret + "&scope=" + encodeURI(scope);
	var auth_response = httpPost(auth_endpoint, request_data, "application/x-www-form-urlencoded");

	var response_data = process_response(auth_response);
	if (response_data) {
		headers.push({ key: "Authorization", value: "Bearer " + response_data.access_token });
		success = true;
	}
	return success;
}
///////////////
// MAIN
var headers = [{ key: "Accept", value: "*/*" }];
var userClaims = { "example": 5 };
try {
	var result = CSF_Auth();
	var response = httpGet("https://graph.microsoft.com/v1.0/users/" + user_id + "/memberOf", headers);
	result = process_response(response);
	log(JSON.stringify(result));
} catch (err) {
	log(err);
}

return userClaims;