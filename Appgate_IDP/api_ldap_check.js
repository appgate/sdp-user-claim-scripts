///////////
// Settings
var APPGATE_CONTROLLER_URL="https://appgate-controller1.example.com:8443/";
var APPGATE_API_VERSION=14;
var APPGATE_API_USER="my_api_account";
var APPGATE_API_PASSWORD="my_api_password";

var idp_guid = "63100f4c-f279-4ac7-aa9c-7d2a6b0fe72a";
var username_claim = "username";

var log2Console = true; //Visible UI edit mode test panel
var log2Audit = false;  //Visible in audit logs
var logTag="dual_idp"

////////////
// Helpers
function log(msg) {
     var prefix = logTag+": ";
     msg = prefix + msg;

     if (log2Console)
        console.log(msg + "; ");

     if (log2Audit)
        auditLog(msg);
}

//Handles Controller API calls from script
function AG_Class(hostname,version_num,username,pwd,provider) {
	if(!provider){
		provider='local';
	}
	this.ag_hostname = hostname;
	this.ag_version=version_num.toString();
	this.ag_user=username;
	this.ag_pwd = pwd;
	this.ag_provider = provider;
	
	this.new_guid= function() {
		var item = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
			var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
			return v.toString(16);
		});
		return item;
	},
	
	this.setDefaultHeaders= function(){
		this.ag_headers=[
			{"key":"Content-Type","value":"application/json"},
			{"key":"Accept","value":"application/vnd.appgate.peer-v"+this.ag_version+"+json"}
		];
	},
	
	this.sendRequest= function(HttpMethod,endpoint_segment,data,queryStrings){
		var response = null;
		var endpoint = this.ag_hostname+"/admin/"+endpoint_segment;
				
		
		if(HttpMethod.toUpperCase()=="POST"){
			response = httpPost(endpoint,JSON.stringify(data), 'application/json', this.ag_headers);			
		}else if(HttpMethod.toUpperCase()=="PUT"){
			response = httpPut(endpoint,JSON.stringify(data), 'application/json', this.ag_headers);			
		}else if(HttpMethod.toUpperCase()=="GET"){
			response=httpGet(endpoint,this.ag_headers);
		}else{
			log("HttpMethod not implemented");
		}
		
		if(response && response.statusCode > 400){
			log("Request error calling: "+endpoint_segment);
		}
		
		return response;
	},
	
	this.ensureAuth= function(){		
		if(this.ag_headers["Authorization"]==null){
			var ignore = this.login();
		}
	},
	
	this.login= function(){
		var response = false;
		if(this.ag_headers["Authorization"]==null){
			var data={
			  "providerName": "local",
			  "username": this.ag_user,
			  "password": this.ag_pwd,
			  "deviceId": "4c07bc67-57ea-42dd-b702-c2d6c45419fc"
			};
			response = this.sendRequest("post","login",data);
			var status = response.statusCode;
			if(status == 200){
				var bodyObj = JSON.parse(response.data);
				this.ag_headers.push({'key': 'authorization', 'value': 'Bearer ' + bodyObj.token});
			}
		}
		return response;
	},	
	
	this.getUserAttributes = function(idp_id,username){
		var data ={"username":username};
		var attribute_results;
		
		this.ensureAuth();
		var response = this.sendRequest("post","identity-providers/"+idp_id+"/attributes",data);
		var status = response.statusCode;
		if(status == 200){
			attribute_results = JSON.parse(response.data);
		}else{
          console.log(response)
        }
		
		return attribute_results;
	}
	this.setDefaultHeaders();
};


//////////
// Main
var userAttributes;
//var group_list=[]; //refinement example - part 1: declare default value of proper datatype

if(claims.user[username_claim]){
	var conn=new AG_Class(APPGATE_CONTROLLER_URI,APPGATE_API_VERSION,APPGATE_API_USER,APPGATE_API_PASSWORD);
	var authRequest = conn.login();
	if(authRequest.statusCode ==200){
		userAttributes = conn.getUserAttributes(idp_guid,claims.user[username_claim]);
		/*refinement example - part 2: set desired value(s)
		 *	if(userAttributes && userAttributes.mappedAttributes.groups){
		 *		group_list = userAttributes.mappedAttributes.groups;
		 *	}
		 */
	}
}
//Default Values
if(!userAttributes){
  userAttributes ={"rawAttributes":{},"mappedAttributes":{"groups":"none"}}
}
//Ensure groups
if(!userAttributes.groups){
  userAttributes.groups="none";
}
return userAttributes;
// return {groups:group_list};	// refinement example - part 3: return desired value(s)