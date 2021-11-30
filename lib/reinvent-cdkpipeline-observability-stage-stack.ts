import { Construct, Stage, StageProps } from '@aws-cdk/core';
import { ReinventCdkObservabilityStack } from './reinvent-cdk-observability-stack';

import * as config from '../config.json'  

/**
 * Deployable unit of the observability stack
 */
export class ReinventCdkPipelineObservabilityStageStack extends Stage {
    
  constructor(scope: Construct, id: string, props?: StageProps) {
    super(scope, id, props);

    if (id === 'prodObservability') {
      const dashboard = new ReinventCdkObservabilityStack(this, 'Prod-ReinventCdkObservabilityStack', {stage: config.environments.production.name});
    } else {
      const dashboard = new ReinventCdkObservabilityStack(this, 'Dev-ReinventCdkObservabilityStack', {stage: config.environments.dev.name});
    }   
  }
}