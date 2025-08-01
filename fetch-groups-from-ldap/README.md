# Fetching Groups from LDAP

When using SAML or OIDC for authentication, user group memberships can be retrieved from an external LDAP identity provider, such as Active Directory.

This script interacts with the Controller to obtain group information from the specified LDAP provider, using the username of the currently logged-in user.

### Prerequisites

* Must have administrator access to the Admin UI of the Appgate SDP Controller.
* Must have a working SAML or OIDC Identity Provider.
* Must have a working LDAP Identity Provider.

## Appgate SDP Controller Configuration

1. Login to Appgate Controller Admin UI

1. Navigate to **Identity** > **Local Users**
    1. Click **Add**
    1. Type **ldap-api-user** as name and fill-in rest of the values.
    1. Note the password.
    1. Click **Save**

1. Navigate to **Access** > **Admin Roles**
    1. Click **Add Generic**
    1. Type **LDAP API Access Role** as name.
    1. Add **View** privilege on **Identity Provider** target, limit the scope to the relevant LDAP IdP.
    1. Add **Get User Attrivutes** privilege on **Identity Provider** target, limit the scope to the relevant LDAP IdP.
    1. Click **Save**

1. Navigate to **Access** > **Policies**
    1. Click **Add Admin Policy**
    1. Type **LDAP API Access Policy** as name.
    1. Add **identity provider is local** and **username is ldap-api-user** as criteria.
    1. Add **LDAP API Access Role** under Admin Roles.
    1. Click **Save**

1. Navigate to **System** > **Secrets**
    1. Click **Add**
    1. Type **LDAP_API_USER_PASSWORD** as name and type the password for **ldap-api-user** as value.
    1. Click **Save**

1. Navigate to **Identity** > **User Claim Scripts**
    1. Click **Add**
    1. Type **Fetch Groups From Graph API** as name.
    1. Copy contents of the **user-claims-script.js** file.
    1. Set **agControllerUrl** to Controller Admin UI URL.
    1. Set **agLdapUuid** to the UUID of the LDAP provider.
    1. Set **agUsernameClaimName** to the claim name that contains user identifier.
    1. Click **Save**
    1. Test the script with an active session.

## Using the Fetched Groups

Going forward, the scripted groups claim (`claims.user.agScripted.ldapGroups`) should be used in place of the built-in groups claim (`claims.user.groups`).

When configuring the Assignment Criteria, select `agScripted` instead of `groups`, then use the following expression:

`ldapGroups.indexOf("group-name-here") > -1`
