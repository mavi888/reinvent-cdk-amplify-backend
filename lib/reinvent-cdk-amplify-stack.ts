import * as cdk from '@aws-cdk/core';
import * as cognito from "@aws-cdk/aws-cognito";
import * as amplify from "@aws-cdk/aws-amplify";
import * as appsync from "@aws-cdk/aws-appsync";
import * as lambda from "@aws-cdk/aws-lambda";
import * as lambdaNode from "@aws-cdk/aws-lambda-nodejs";
import * as path from 'path';
import * as sns from '@aws-cdk/aws-sns';
import * as subs from '@aws-cdk/aws-sns-subscriptions';

import * as cdk_appsync_transformer from "cdk-appsync-transformer";

import * as config from '../config.json'  
import { Tracing } from '@aws-cdk/aws-lambda';

interface ReinventCdkAmplifyStackProps extends cdk.StackProps {
  readonly stage : string
}

export class ReinventCdkAmplifyStack extends cdk.Stack {
  public readonly amplifyApp: cdk.CfnOutput;
  public readonly urlOutput: cdk.CfnOutput;
  constructor(scope: cdk.Construct, id: string, props: ReinventCdkAmplifyStackProps) {
    super(scope, id, props);

    
    // CREATE COGNITO USER POOL AND IDENTITY POOL 
    const userPool = new cognito.UserPool(this, `${props.stage}-AmplifyCDKUserPool`, {
      selfSignUpEnabled: true, // Allow users to sign up
      autoVerify: { email: true }, // Verify email addresses by sending a verification code
      signInAliases: { email: true }, // Set email as an alias
    });

    const userPoolClient = new cognito.UserPoolClient(this, `${props.stage}-AmplifyCDKUserPoolClient`, {
      userPool,
      generateSecret: false, // Don't need to generate secret for web app running on browsers
    });

    const identityPool = new cognito.CfnIdentityPool(this, `${props.stage}-AmplifyCDKIdentityPool`, {
      allowUnauthenticatedIdentities: true, 
      cognitoIdentityProviders: [ {
          clientId: userPoolClient.userPoolClientId,
          providerName: userPool.userPoolProviderName,
      }],
    });

     // CREATE SNS TOPIC THAT SENDS EMAILS
     const purchaseTopic = new sns.Topic(this, `${props.stage}-SNSTopic`, {
      displayName: 'Purchase all',
    });

    purchaseTopic.addSubscription(new subs.EmailSubscription(config.application.sns_subscription.email));


    //CREATE THE FUNCTION THAT MARKS THINGS PURCHASED
    const notifyShoppingDoneFunction = new lambdaNode.NodejsFunction(this, `${props.stage}-NotifyShoppingDoneFunction`, {
      runtime: lambda.Runtime.NODEJS_14_X,
      handler: 'handler',
      entry: path.resolve(__dirname, 'functions') + '/notifyShoppingDone.js',
      environment: {
        TOPIC: purchaseTopic.topicArn
      },
      bundling: {
        nodeModules: ["aws-xray-sdk"],
      },
      tracing: Tracing.ACTIVE
    })

    // ALLOW FUNCTION TO PUBLISH IN THE TOPIC
    purchaseTopic.grantPublish(notifyShoppingDoneFunction)

    // CREAT THE APPSYNC API
    const appsync_api = new cdk_appsync_transformer.AppSyncTransformer(this, `${props.stage}-CDKAmplifyProject`, {
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
      },
      xrayEnabled: true,
    });

    appsync_api.addLambdaDataSourceAndResolvers('notifyShoppingDoneFunction', `${props.stage}-NotifyShoppingDoneDS`, notifyShoppingDoneFunction, {
      name: 'notifyShoppingDoneDataSource'
    })

    // AMPLIFY APPLICATION
    const amplifyApp = new amplify.App(this, `${props.stage}-CDKAmplifyAppsync`, {
      sourceCodeProvider: new amplify.GitHubSourceCodeProvider({
        owner: config.frontend.owner, 
        repository: config.frontend.repository_name,
        oauthToken: cdk.SecretValue.secretsManager('github-token')
      }),
      environmentVariables: {
        'IDENTITY_POOL_ID': identityPool.ref,
        'USER_POOL_ID': userPool.userPoolId,
        'USER_POOL_CLIENT_ID': userPoolClient.userPoolClientId,
        'REGION': this.region,
        'APPSYNC_API': appsync_api.appsyncAPI.graphqlUrl,
      },
      autoBranchCreation: { // Automatically connect branches that match a pattern set
        patterns: ['feature/*']
      },
      autoBranchDeletion: true // Automatically disconnect a branch when you delete a branch from your repository
    });

    if (props.stage === 'prod') {
      const main = amplifyApp.addBranch("main");
      main.addEnvironment('STAGE', 'prod');
    } else {
      const dev = amplifyApp.addBranch('develop');
      dev.addEnvironment('STAGE', 'dev')
    }

    // Outputs and exports
    this.amplifyApp = new cdk.CfnOutput(this, `${props.stage}-AppName`, { value: amplifyApp.appName, exportName: `${props.stage}-AppName` });
    this.amplifyApp = new cdk.CfnOutput(this, `${props.stage}-AppId`, { value: amplifyApp.appId, exportName: `${props.stage}-AppId` });
    this.amplifyApp = new cdk.CfnOutput(this, `${props.stage}-ApiId`, { value: appsync_api.appsyncAPI.apiId, exportName: `${props.stage}-ApiId` });
    if (props.stage === 'prod') {
      this.urlOutput = new cdk.CfnOutput(this, `${props.stage}-DefaultDomain`, { value: `https://main.${amplifyApp.defaultDomain}`, exportName: `${props.stage}-DefaultDomain` });
    } else {
      this.urlOutput = new cdk.CfnOutput(this, `${props.stage}-DefaultDomain`, { value: `https://develop.${amplifyApp.defaultDomain}`, exportName: `${props.stage}-DefaultDomain` });
    }
  }
}
