# Fetching Groups from Microsoft Graph API

When authenticating via SAML or OIDC, Microsoft Entra ID returns only the first 150 group memberships for a user.

To retrieve the full list of group memberships, this user claim script utilizes the Microsoft Graph API.

### Prerequisites

* Must have administrator access to a Microsoft Entra ID tenant.
* Must have administrator access to the Admin UI of the AppGate SDP Controller.
* Must have a working login with SAML or OIDC Application in Azure.

## EntraID Configuration

1. Log into the [Azure Portal](https://portal.azure.com/#home)

1. Click on **App Registrations**.
    1. Find the relevant App Registration.
    1. Copy out the **Application (client) ID**.

1. Click on **Certificates & secrets**.
    1. Under **Client Secrets**, click on **New client secret**.
    1. Fill out info, click **Add**.
    1. Find the **Value** of the newly generated secret, copy out the value.

1. Click on **API Permissions**.
    1. Click **Add a permission**.
    1. In the **Request API permissions** page, select **Microsoft Graph**.
    1. Under **Microsoft Graph**, select **Application Permissions**.
    1. Under **GroupMember**, select **GroupMember.Read.All**.
    1. Under User, select **User.Read.All**.
    1. Click on **Add permissions**.
    1. Under **Configured permissions**, select **Grant admin consent for 'AppName'**.
    1. Confirm selection.

## AppGate SDP Controller Configuration

1. Login to AppGate Controller Admin UI.

1. Navigate to **System** > **Secrets**.
    1. Click **Add**.
    1. Type **AZURE_GRAPH_API_APPID** as name and  **Application ID from Azure** as value.
    1. Click **Save**.
    1. Click **Add**.
    1. Type **AZURE_GRAPH_ID_SECRET** as name and  **Client Secret from Azure**  as value.
    1. Click **Save**.

1. Navigate to **Identity** > **Identity Providers**.
    1. Select the relevant IdP.
    1. Under **Attributes Mapped to User Claims**:.
    1. Map **tid** to **tenantId**.
    1. Map **oid** to **usertId**.
    1. Note that attribute and claim names are case sensitive.
    1. Under **User Claim Scripts**.
    1. Add **Fetch Groups From Graph API**.
    1. Save.

1. Navigate to **Identity** > **User Claim Scripts**
    1. Click **Add**.
    1. Type **Fetch Groups From Graph API** as name.
    1. Copy contents of the **user-claims-script.js** file.
    1. Click **Save**.
    1. Test the script with an active session. The user must have logged in after any changes were made to the Identity Provider.

## Using the Fetched Groups

Going forward, the scripted groups claim (`claims.user.agScripted.groups`) should be used in place of the built-in groups claim (`claims.user.groups`).

When configuring the Assignment Criteria, select `agScripted` instead of `groups`, then use the following expression:

`groups.indexOf("group-name-here") > -1`
