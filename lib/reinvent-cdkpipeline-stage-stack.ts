import { CfnOutput, Construct, Stage, StageProps } from '@aws-cdk/core';
import { ReinventCdkAmplifyStack } from './reinvent-cdk-amplify-stack';

/**
 * Deployable unit of web service app
 */
 export class ReinventCdkPipelineStageStack extends Stage {
    
    constructor(scope: Construct, id: string, props?: StageProps) {
      super(scope, id, props);
  
      if (id === 'prod') {
        const service = new ReinventCdkAmplifyStack(this, 'Prod-ReinventCdkAmplifyStack', {stage: 'prod'});
      } else {
        const service = new ReinventCdkAmplifyStack(this, 'Dev-ReinventCdkAmplifyStack', {stage: 'dev'});
      }   
    }
  }