var APPGATE_CONTROLLER_URI = "<appgate_controller_uri_with_portnumber>"; // REPLACE with real value
var APPGATE_API_VERSION = 14;
var APPGATE_API_USER = "<appgate-api-user>";  // REPLACE with real value
var APPGATE_API_PASSWORD = "<appgate-api-user-password>"; // REPLACE with real value

var idp_guid = "<idp-guid>"; // REPLACE with real value
var username_claim = "username";
var mapped_attribute = "sdpdemoadgroups";

var log2Console = true; //Visible UI edit mode test panel
var log2Audit = false;  //Visible in audit logs
var logTag = "dual_idp"
function log(msg) {
    var prefix = logTag + ": ";
    msg = prefix + msg;

    if (log2Console)
        console.log(msg + "; ");

    if (log2Audit)
        auditLog(msg);
}

function AG_Class(hostname, version_num, username, pwd, provider) {
    if (!provider) {
        provider = 'local';
    }
    this.ag_hostname = hostname;
    this.ag_version = version_num.toString();
    this.ag_user = username;
    this.ag_pwd = pwd;
    this.ag_provider = provider;

    this.new_guid = function () {
        var item = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
        return item;
    },

        this.setDefaultHeaders = function () {
            this.ag_headers = [
                { "key": "Content-Type", "value": "application/json" },
                { "key": "Accept", "value": "application/vnd.appgate.peer-v" + this.ag_version + "+json" }
            ];
        },

        this.sendRequest = function (HttpMethod, endpoint_segment, data, queryStrings) {
            var response = null;
            var endpoint = this.ag_hostname + "/admin/" + endpoint_segment;


            if (HttpMethod.toUpperCase() == "POST") {
                response = httpPost(endpoint, JSON.stringify(data), 'application/json', this.ag_headers);
            } else if (HttpMethod.toUpperCase() == "PUT") {
                response = httpPut(endpoint, JSON.stringify(data), 'application/json', this.ag_headers);
            } else if (HttpMethod.toUpperCase() == "GET") {
                response = httpGet(endpoint, this.ag_headers);
            } else {
                log("HttpMethod not implemented");
            }

            if (response && response.statusCode > 400) {
                log("Request error calling: " + endpoint_segment);
            }

            return response;
        },

        this.ensureAuth = function () {
            if (this.ag_headers["Authorization"] == null) {
                var ignore = this.login();
            }
        },

        this.login = function () {
            var response = false;
            if (this.ag_headers["Authorization"] == null) {
                var data = {
                    "providerName": "local",
                    "username": this.ag_user,
                    "password": this.ag_pwd,
                    "deviceId": "<device-guid>" // REPLACE with real value
                };
                response = this.sendRequest("post", "login", data);
                var status = response.statusCode;
                if (status == 200) {
                    var bodyObj = JSON.parse(response.data);
                    this.ag_headers.push({ 'key': 'authorization', 'value': 'Bearer ' + bodyObj.token });
                }
            }
            return response;
        },

        this.getUserAttributes = function (idp_id, username) {
            var data = { "username": username };
            var attribute_results;

            this.ensureAuth();
            var response = this.sendRequest("post", "identity-providers/" + idp_id + "/attributes", data);
            var status = response.statusCode;
            if (status == 200) {
                attribute_results = JSON.parse(response.data);
            } else {
                log(response)
            }

            return attribute_results;
        }
    this.setDefaultHeaders();
};

var userAttributes;
var groups_attr;
if (claims.user[username_claim]) {
    var conn = new AG_Class(APPGATE_CONTROLLER_URI, APPGATE_API_VERSION, APPGATE_API_USER, APPGATE_API_PASSWORD);
    var authRequest = conn.login();
    if (authRequest.statusCode == 200) {
        userAttributes = conn.getUserAttributes(idp_guid, claims.user[username_claim]);
    }
}

if (userAttributes && userAttributes.mappedAttributes[mapped_attribute]) {
    groups_attr = { mapped_attribute: userAttributes.mappedAttributes[mapped_attribute] };
} else {
    //Default value
    groups_attr = { mapped_attribute: "none" };
}
return groups_attr;