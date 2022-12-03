# Authorization for Azure AD  via MS Graph API

Using SAML and Graph API to authorize by Azure AD groups

## Scenario

A company using Azure Active Directory that has more than 150 user groups for any users and is using SAML for authentication.  There is a size restriction in the SAML assertion which causes no groups to be returned through the normal SAML assertion.

The implementation comes from [Microsoft identity platform and the OAuth 2.0 client credentials flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow) article.

>The OAuth 2.0 client credentials grant flow permits a web service (confidential client) to use its own credentials, instead of impersonating a user, to authenticate when calling another web service.

### Prerequisites

* Must have administrator access to a Microsoft Azure Active Directory tenant.
* Must have administrator access to the Admin UI of the Appgate SDP Controller.
* Must have authtentication provided by SAML for MS Azure AD.

## Azure AD setup

Follow the [Authentication and authorization basics for Microsoft Graph](https://docs.microsoft.com/en-us/graph/auth/auth-concepts) article via the Application Permissions.  Use the [Register an application with the Microsoft identity platform](https://docs.microsoft.com/en-us/graph/auth-register-app-v2) article to register the Appgate SDP controller.

1. Log into the [Azure Portal](https://portal.azure.com/#home)
1. Navigate to **Azure Active Directory**
1. Create or Switch to the AD Tenant (if you are not already in it)
    1. Copy out the Tenant ID
1. Click on **App Registration**
    1. Click on **New Registration** if Appgate SDP Controller is not already registered.
        1. Fill in info, click **Register**
        1. Select the App from the list
        1. Copy out the Application (client) ID
    1. In “Client credentials”, click on **Add a certificate or secret**
        1. Under “Client Secrets”, click on **New client secret**
        1. Fill out info, click **Add**
        1. Find the “Value” of the newly generated secret, copy out the value.
    1. Click on **API Permissions** in the menu
        1. Click **Add a permission**
        1. In the “Request API permissions” modal, select **Microsoft Graph**
        1. Under “Microsoft Graph”, select **Application Permissions**
        1. Under Groupmember, select **GroupMember.Read.All**
        1. Under User, select **User.Read.All**
        1. Click on **Add permissions**
        1. Under “Configured permissions”, select **Grant admin consent for 'AppName'**
        1. Confirm selection
In “API Permissions”, verify

## Appgate Controller setup

1. Login to Appgate Controller Admin UI
1. Navigate to **Scripts** > **User Claims**
    1. Click **Add New**
    1. Provide name
    1. Replace JavaScript with code from [GraphAPI_Azure.js](./GraphAPI_Azure.js) file 
    1. Click **Save**
1. Navigate to **System** > **Identity Providers** 
    1. Select IDP that uses the SAML to authenticate against MS Azure AD
    1. Map Attributes to User Claims
        1. Must have a claim named TenantId mapped with the TenantID
        1. Must have a claim named UserId mapped with the Object Identitfier
    1. Add User Claim Script by selecting the name of the script you saved above
    1. verify
1. Navigate to **Operations** > **Policies**
    1. Create or select the Policy for users using MS Azure AD with SAML
    1. Under “Assignment”, click **Add New**
        1. Select Identity Provider, with the MS Azure AD using SAML from earlier
        1. Click on check mark to save
    1. Under “Assignment”, click **Add New**, again
        1. To create an assignment criteria that uses a group name from the new list provided, Select **User Claim Script** with an expression like this: “azureGroups.indexOf("INSERT YOUR GROUP NAME HERE") > -1”
        1. Click on check mark to save
        1. Click **Save**
