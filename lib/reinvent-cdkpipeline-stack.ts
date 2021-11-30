import * as cdk from '@aws-cdk/core';
import * as codepipeline from '@aws-cdk/aws-codepipeline';
import * as codepipeline_actions from '@aws-cdk/aws-codepipeline-actions';
import { Construct, SecretValue, Stack, StackProps } from '@aws-cdk/core';
import { CdkPipeline, SimpleSynthAction } from "@aws-cdk/pipelines";
import { ReinventCdkPipelineStageStack } from './reinvent-cdkpipeline-stage-stack';
import { ReinventCdkPipelineObservabilityStageStack } from './reinvent-cdkpipeline-observability-stage-stack';

import * as lambda from '@aws-cdk/aws-lambda';
import * as lambdaNode from '@aws-cdk/aws-lambda-nodejs';
import * as path from 'path';

import * as config from '../config.json'  

/**
 * The stack that defines the application pipeline
 */
export class ReinventCdkpipelineStack extends Stack {
    constructor(scope: Construct, id: string, props?: StackProps) {
      super(scope, id, props);

      const sourceArtifact = new codepipeline.Artifact();
      const cloudAssemblyArtifact = new codepipeline.Artifact();

      const pipeline = new CdkPipeline(this, 'CDKAmplifyPipeline', {
        // The pipeline name
        pipelineName: config.cdk_pipeline.pipeline_name,
        cloudAssemblyArtifact,

        // Where the source can be found
        sourceAction: new codepipeline_actions.GitHubSourceAction({
        actionName: 'GitHub',
        output: sourceArtifact,
        oauthToken: SecretValue.secretsManager('github-token'),
        owner: config.cdk_pipeline.repository_owner,
        repo: config.cdk_pipeline.repository_name,
        branch: config.cdk_pipeline.branch
      }),

      // How it will be built and synthesized
      synthAction: SimpleSynthAction.standardNpmSynth({
        sourceArtifact,
        cloudAssemblyArtifact,
        
        // We need a build step to compile the TypeScript Lambda
        buildCommand: 'npm run build'
      }),
  });
   // This is where we add the application stages
  const preprod = new ReinventCdkPipelineStageStack(this, config.environments.dev.name, {
    env: { account: config.environments.dev.env.account, region: config.environments.dev.env.region }
  });

  // put validations for the stages 
  const preprodStage = pipeline.addApplicationStage(preprod);

  // Add test action
  const handler = new lambdaNode.NodejsFunction(this, 'CDKAmplifyPipelineTests', {
    runtime: lambda.Runtime.NODEJS_12_X,
    handler: 'handler',
    entry: path.resolve(__dirname, 'test') + '/index.js',
  });

  const prod = new ReinventCdkPipelineStageStack(this, config.environments.production.name, {
    env: { account: config.environments.production.env.account, region: config.environments.production.env.region }
  })

  const prodStage = pipeline.addApplicationStage(prod);

   // Add observability
  const devObservability = new ReinventCdkPipelineObservabilityStageStack(this, config.environments.dev.name + 'Observability', {
    env: { account: config.environments.dev.env.account, region: config.environments.dev.env.region }
  });

  const devObservabilityStage = pipeline.addApplicationStage(devObservability);

  const prodObservability = new ReinventCdkPipelineObservabilityStageStack(this, config.environments.production.name + 'Observability', {
    env: { account: config.environments.production.env.account, region: config.environments.production.env.region }
  });

  const prodObservabilityStage = pipeline.addApplicationStage(prodObservability);
  }
}