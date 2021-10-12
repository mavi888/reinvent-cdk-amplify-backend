import { expect as expectCDK, matchTemplate, MatchStyle } from '@aws-cdk/assert';
import * as cdk from '@aws-cdk/core';
import * as ReinventCdkAmplify from '../lib/reinvent-cdk-amplify-stack';

test('Example Test', () => {
    const app = new cdk.App();
    // WHEN
    const stack = new ReinventCdkAmplify.ReinventCdkAmplifyStack(app, 'MyTestStack', {stage: 'dev'});
    // THEN
    expectCDK(stack).to(matchTemplate({
      "Resources": {}
    }, MatchStyle.SUPERSET))
});
