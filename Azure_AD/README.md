# Authorization for Azure AD  via MS Graph API

Using SAML and Graph API to authorize by Azure AD groups

## Appgate Controller setup

1. Login to Appgate Controller Admin UI
1. Navigate to **Scripts** > **User Claims**
    1. Click **Add New**
    1. Provide name
    1. Replace JavaScript with code from [GraphAPI_Azure.js](./GraphAPI_Azure.js) file 
    1. Click **Save**
1. Navigate to **System** > **Identity Providers** 
    1. Select IDP that uses the SAML to authenticate against MS Azure AD
    1. Map Attributes to Use Claims
        1. Must have TenantId
        1. Must have UserId
    1. Add User Claim Script
    1. verify
1. Navigate to **Operations** > **Policies**
    1. Create or select the Policy for users using MS Azure AD with SAML
    1. Under “Assignment”, click **Add New**
        1. Select Identity Provider, with the MS Azure AD using SAML from earlier
        1. Click on check mark to save
    1. Under “Assignment”, click **Add New**, again
        1. Select **User Claim Script** with an expression like this: “azureGroups.indexOf("100") > -1”
        1. Click on check mark to save
        1. Click **Save**