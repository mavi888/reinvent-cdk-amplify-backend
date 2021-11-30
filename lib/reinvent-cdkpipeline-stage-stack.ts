import * as cdk from '@aws-cdk/core';
import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { ReinventCdkAmplifyStack } from './reinvent-cdk-amplify-stack';

import * as config from '../config.json'  

/**
 * Deployable unit of web service app
 */
export class ReinventCdkPipelineStageStack extends Stage {
  public readonly urlOutput: cdk.CfnOutput;
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    if (id === 'prod') {
      const service = new ReinventCdkAmplifyStack(this, 'Prod-ReinventCdkAmplifyStack', {stage: config.environments.production.name});
      this.urlOutput = service.urlOutput;
    } else {
      const service = new ReinventCdkAmplifyStack(this, 'Dev-ReinventCdkAmplifyStack', {stage: config.environments.dev.name});
      this.urlOutput = service.urlOutput;
    }
  }
}