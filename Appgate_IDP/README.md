# api_ldap_check.js

## Objective
Collect session attributes from an LDAP identity provider which a user has not signed in with

## Overview:
When an LDAP identity provider is configured it can 'test user *username*' retriving all attributes for the given username. This functionality can also be leveraged via the Appgate API. So when a user signs in and be assigned claims from their normal identity provider, then this script will run and call the API to retrieve additional attributes from the LDAP provider then storing them in JSON format in the session claim: agScripted

## Pre-requisite
- Correctly configured LDAP IDP in Appgate
- Matching claim between IDP user signs in with and the users 'username' in the LDAP IDP
- Valid certificate on the Admin Portal or have the Appgate Self-signed CA cert added to [Trusted Certificates](https://sdphelp.appgate.com/adminguide/trusted-certificate-configure.html)

## Configuration:
- Setup an API user on your collective (local user account with an admin-role that only allows it to query the LDAP IDP for attributes)
 	- View rights on LDAP IDP
 	- Test rights for selected IDPs
 	- Get user attributes for selected IDP

- Create a policy which assigns the new admin-role to the new api user 

- Get the GUID of your identity provider
	- Navigate to identity providers
	- Select the desired LDAP IDP
	- From the IDP edit screen the GUID will be the last segment of the url such as: 96a202db-774d-47d0-974c-a6a23284f6e7

- Modify the script 
	Variable | Line # | Purpose
    ---------|--------|---------
    APPGATE_CONTROLLER_URL    |   3   | URL of the Appgate API (admin portal)
    APPGATE_API_VERSION | 4 | Appgate API version the script is connecting with
    APPGATE_API_USER	| 5 | Username the local account being used to sign in the API (admin portal)
    APPGATE_API_PASSWORD	| 6 | Password for the local account signing in
    idp_guid	| 8 | id of the IDP the attributes will be retrived from
    username_claim	| 9 | name of session claim from the original IDP that will be passed to the LDAP IDP to identify the user to collect data from
    log2Console	| 11 | Will display custom logging in browser when using the 'test' function of the user-claim-script
    log2Audit | 12 | Will write the custom logging to the audit logs of the Appgate Collective 
	logTag | 13 | Prepends text to any custom logging for easy identification

- Create a new user claim script
	- Provide unique name
	- Place modified script in body
	- Test user claim script using “Test” button under script configuration in the AppGate Admin UI & ensure it is successful
	- Save

- Add user claim script to users normal IDP

- Test User login to to make sure script returns the expected values in users active session in AG Admin UI

## Usage
It is highly recommended the script be refined to only return the desired attribute & not everything as it is currently configured to do.


In the following example let us assume in the IDP the user-claim-script is mapped to the claim `dual_idp` and without being refiend returned the following for a user:
<pre><code>
{
	rawAttributes:{
		prop1: value,
		prop2: value,
		groups: [group1,group2,group3],
	},
	mappedAttributes:{
		groups:[group1,group2,group3]
	}
}
</code></pre>

A users session would show claim as:
<pre><code>
agScripted = {
	rawAttributes:{
		prop1: value,
		prop2: value,
		groups: [group1,group2,group3],
	},
	mappedAttributes:{
		groups:[group1,group2,group3]
	}
}
</code></pre>

To use these values as assignement criteria select 'User claims script' and then use a javascript expression to evaluate the value such as: `mappedAttributes.groups.toString().indexOf("group1") >= 0`


If the user-claims-script is edited to only return the `groups` attribute which contains a list and not a larger object the expression would be simplified to: `groups.indexOf("group1") >= 0`


To use in a custom script it the same expression would be:
`claims.user.agScripted.mappedAttributes.groups.toString().indexOf("group1") >= 0`


Using the claim in a policy or criteria script would look like..
![image](https://user-images.githubusercontent.com/32595348/122566537-a10ff400-d015-11eb-8b55-6bc70e368b9e.png)

## Considerations
- If the primary controller goes down will APPGATE_CONTROLLER_URL still work?
- If the script was refined, do the properties returned and used by policies have default values? or will undefined break cause an error in the policy