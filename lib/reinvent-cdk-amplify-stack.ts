import * as cdk from '@aws-cdk/core';
import * as cognito from "@aws-cdk/aws-cognito";
import * as amplify from "@aws-cdk/aws-amplify";
import * as appsync from "@aws-cdk/aws-appsync";

import * as cdk_appsync_transformer from "cdk-appsync-transformer";

export class ReinventCdkAmplifyStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // CREATE COGNITO USER POOL AND IDENTITY POOL 
    const userPool = new cognito.UserPool(this, "AmplifyCDKUserPool", {
      selfSignUpEnabled: true, // Allow users to sign up
      autoVerify: { email: true }, // Verify email addresses by sending a verification code
      signInAliases: { email: true }, // Set email as an alias
    });

    const userPoolClient = new cognito.UserPoolClient(this, "AmplifyCDKUserPoolClient", {
      userPool,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
    });

    const identityPool = new cognito.CfnIdentityPool(this, "AmplifyCDKIdentityPool", {
      allowUnauthenticatedIdentities: true, 
      cognitoIdentityProviders: [ {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
      }],
    });

    // CREAT THE APPSYNC API
    const appsync_api = new cdk_appsync_transformer.AppSyncTransformer(this, "CDKAmplifyProject", {
      schemaPath: 'graphql/schema.graphql',
      authorizationConfig: {
        defaultAuthorization: {
            authorizationType: appsync.AuthorizationType.USER_POOL,
            userPoolConfig: {
                userPool: userPool,
                appIdClientRegex: userPoolClient.userPoolClientId,
                defaultAction: appsync.UserPoolDefaultAction.ALLOW
            }
        }
      }
    });

    // AMPLIFY APPLICATION
    const amplifyApp = new amplify.App(this, "cdk-amplify-appsync", {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: "mavi888",
        repository: "reinvent-cdk-amplify-frontend",
        oauthToken: cdk.SecretValue.secretsManager('github-token')
      }),
      environmentVariables: {
        'IDENTITY_POOL_ID': identityPool.ref,
        'USER_POOL_ID': userPool.userPoolId,
        'USER_POOL_CLIENT_ID': userPoolClient.userPoolClientId,
        'REGION': this.region,
        'APPSYNC_API': appsync_api.appsyncAPI.graphqlUrl,
      }
    });

    const masterBranch = amplifyApp.addBranch("main");
  }
}
