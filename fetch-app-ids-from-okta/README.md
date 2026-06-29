# Fetching App IDs from Okta

This user claim script retrieves the list of Okta application IDs that the authenticating user has been assigned to.

The resulting claim can be used in AppGate SDP policies to grant access based on a user's Okta application memberships.

### Prerequisites

* Must have administrator access to an Okta tenant.
* Must have administrator access to the Admin UI of the AppGate SDP Controller.
* Must have a working login with SAML or OIDC configured against your Okta tenant.

## Okta Configuration

1. Log into the [Okta Admin Console](https://your-tenant-admin.okta.com).

1. Navigate to **Security** > **API** > **Tokens**.
    1. Click **Create Token**.
    1. Give it a descriptive name (e.g. `AppGate SDP User Claim Script`).
    1. Copy the token value — it will only be shown once.

## AppGate SDP Controller Configuration

1. Login to AppGate Controller Admin UI.

1. Navigate to **System** > **Secrets**.
    1. Click **Add**.
    1. Type `OKTA_API_TOKEN` as name and the **Okta API Token** as value.
    1. Click **Save**.

1. Navigate to **Identity** > **Identity Providers**.
    1. Select the relevant `OIDC` or `SAML` IdP connected to Okta.
    1. Under **Attributes Mapped to User Claims**:
        1. Map the Okta user ID attribute to `oktaid`. For OIDC this is typically the `sub` claim. For SAML it is typically `NameID` or `http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier`.
    1. Note that attribute and claim names are **case sensitive**.
    1. Under **User Claim Scripts**.
    1. Add **Fetch App IDs From Okta**.
    1. Save.

1. Navigate to **Identity** > **User Claim Scripts**
    1. Click **Add**.
    1. Type **Fetch App IDs From Okta** as name.
    1. Copy contents of the **user-claims-script.js** file.
    1. Set `TENANT_URL` at the top of the script to your Okta tenant base URL (e.g. `https://your-tenant.okta.com`).
    1. Click **Save**.
    1. Test the script with an active session. The user must have logged in after any changes were made to the Identity Provider.

## Using the Fetched App IDs

The script returns a claim `claims.user.agScripted.appids` containing a flat list of Okta application IDs the user is assigned to.

When configuring the Assignment Criteria, select `agScripted` instead of `appids`, then use the following expression:

`appids.indexOf("0oa1b2c3d4e5f6g7h8i9") > -1`

Replace `0oa1b2c3d4e5f6g7h8i9` with the actual Okta application client ID you want to match against.
