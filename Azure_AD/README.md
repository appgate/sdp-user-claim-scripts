# GraphAPI_Azure.js

| On This Page |
| --- |
| [Objective](#objective)<br>[Prerequisites](#prerequisites)<br>[Configuration](#configuration) |

Using Azure AD SAML and Graph API to authorize by Azure AD group names

## Objective

Allow companies using Azure Active Directory with SAML with more than 150 user groups to circumvent the 150 group limit.

For users with >= 150 group assignments, the SAML assertion contains a MS Graph API link to request the groups rather
than a group list.

The implementation comes
from [Microsoft identity platform and the OAuth 2.0 client credentials flow](https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-oauth2-client-creds-grant-flow)
article.

> The OAuth 2.0 client credentials grant flow permits a web service (confidential client) to use its own credentials,
> instead of impersonating a user, to authenticate when calling another web service.

## Prerequisites

* Must have administrator access to a Microsoft Azure Active Directory tenant.
* Must have administrator access to the Admin UI of the Appgate SDP Controller.
* Must have authentication provided by SAML for MS Azure AD.

## Configuration

| In This Section                                                                                                                                                                                                                                                                                                                  |
|----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| [Required Information](#required-information)<br>[(1) Retrieve Azure AD tenant and application IDs](#1-retrieve-azure-ad-tenant-and-application-ids)<br>[(2) Prepare script for Appgate use](#2-prepare-script-for-appgate-use)<br>[(3) Create a new user claim script in Appgate](#3-create-a-new-user-claim-script-in-appgate) |

### Required Information

| Information                                 | Format | Purpose                                                                           |
|---------------------------------------------|--------|-----------------------------------------------------------------------------------|
| Azure Active Directory Tenant ID            | GUID   | Used in Appgate identity providers to map the Tenant ID attribute to a user claim |
| Azure Application ID for Appgate            | GUID   | Used to call the Microsoft Graph API to request group names for user claims       |
| Azure Application client secret for Appgate | text   | Used to call the Microsoft Graph API to request group names for user claims       |       

### (1) Retrieve Azure AD tenant and application IDs

If the below instructions do not align with the current Azure Portal portal interface, please reference the official
Microsoft links following these instructions.

1. Log into the [Azure Portal](https://portal.azure.com/#home)
1. Navigate to **Azure Active Directory**
1. Create or switch to the correct Active Directory tenant
    1. Copy the **Tenant ID** for later use
1. Click on **App Registration**
    1. Select the Appgate SDP Controller application, if it has already been registered.
       <br>If there is no registered application for the Appgate SDP Controller, click **New Registration**.
        1. Fill out the required information, and click **Register** to create the application.
        1. Select the Appgate SDP Controller application from the list.
    1. Copy the **Application ID** for later use in the script.
    1. In **Client credentials**, click **Add a certificate or secret**.
        1. Within **Client Secrets**, click **New client secret**.
        1. Fill out the required information, and click **Add**.
        1. Copy the **Value** of the generated secret for later use.
    1. In the menu, click **API Permissions**.
        1. Click **Add a permission**
        1. In the **Request API permissions** modal, select `Microsoft Graph`.
            1. Within **Microsoft Graph**, select `Application Permissions`.
                1. Within **GroupMember**, select `GroupMember.Read.All`.
                1. Within **User**, select `User.Read.All`
        1. Click **Add permissions**.
        1. Within **Configured permissions**, select **Grant admin consent for '{Your_AppName}'**
            1. Confirm selection.
        1. In **API Permissions**, verify:
            - `GroupMember.Read.All` is included
            - `User.Read.All` is included
            - Admin consent is granted

**Reference Links**
* [Authentication and authorization basics (external)](https://learn.microsoft.com/en-us/graph/auth/auth-concepts) - Use application permissions (app roles) scenario for Microsoft Graph permissions
* [Register an application with the Microsoft identity platform (external)](https://docs.microsoft.com/en-us/graph/auth-register-app-v2) - Create an application for the AppGate SDP Controller

---

### (2) Prepare script for Appgate use

**Options**

| Variable        | Type      | Line Number | Purpose                                                                                                                                                                                 |
|-----------------|-----------|-------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| `applicationId` | `string`  | `20`        | The Azure application ID of the registered application created for the Appgate SDP Controller with permissions to call the Microsoft Graph API to retrieve group names for user claims. |
| `clientSecret`  | `string`  | `33`        | The client secret that corresponds to the `applicationId` with permissions to call the Microsoft Graph API to retrieve group names for user claims.                                     |
| `logging`       | `boolean` | `42`        | `false`: Do not enable logging for troubleshooting purposes.<br>`true`: Enable logging for troubleshooting purposes.                                                                    |

1. Copy the code from [GraphAPI_Azure.js](./GraphAPI_Azure.js) in this repository.
2. Replace the value of `applicationId` with the Azure application ID. Ensure this value is wrapped in a single set of
   quotation marks.
3. Replace the value of `clientSecret` with the Azure application client secret. Ensure this value is wrapped in a
   single set of quotation marks.
4. _Optionally_, temporarily change `logging` to `true` (no quotation marks) to troubleshoot where the script is
   failing.<br>Ensure this is changed back to `false` once troubleshooting is complete.

---

### (3) Create a new user claim script in Appgate

#### Create a user claims script
1. In the Appgate Controller Admin UI, navigate to **Scripts** > **User Claims**
1. Click **Add New**.
1. Provide a name for the user claims script and note it for a later step.
1. Replace JavaScript with prepared code.
1. Click **Save**

#### Apply claims script to identity provider
1. Navigate to **System** > **Identity Providers**
1. Select the Azure AD SAML identity provider.
1. Map attributes to user claims. ***Claim name capitalization must be exactly as listed below.***
   1. Must have a claim named `TenantId` mapped to the Azure Tenant ID.
   1. Must have a claim named `UserId` mapped to the Azure user's object ID or user principal name (UPN).
1. Add User Claim Script by selecting the name of the previously created script.

#### Create a policy assignment

1. Navigate to **Operations** > **Policies**
1. Create or select the Policy for users using MS Azure AD with SAML
1. Within **Assignment**, click **Add New**
    1. Select the SAML MS Azure AD identity provider
    1. Click check mark to save
1. Under **Assignment**, click **Add New**
    1. Create a group name assignment criteria by selecting **User Claim Script**.
        1. Create an expression to select the group, replacing `YOUR_GROUP_NAME` with the relevant group
           name. ```azureGroups.indexOf("YOUR_GROUP_NAME") > -1```
   1. Click on the check mark to save the assignment.
1. Click **Save** to save the policy.
---

**Future documentation clarifications**
- Suggest how to get Azure Tenant ID into user claim map as `TenantId`.
