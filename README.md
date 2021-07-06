# User Claim Scripts for Appgate SDP Controller

This repo is to provide customers using Appgate SDP templates of User Claim Scripts to be used in their Policies.  

The individual files are for different Identity Providers that are used to do a call from the Controller to IdP after getting a claim from the SDP Client in order to authorize the user (typically through user groups).

## Appgate Controller setup

1. Login to Appgate Controller Admin UI
1. Navigate to **Scripts** > **User Claims**
    1. Click **Add New**
    1. Provide name
    1. Replace JavaScript with code from code in the appropriate file
    1. Click **Save**
