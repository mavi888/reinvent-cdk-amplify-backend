import * as cdk from '@aws-cdk/core';
import cloudwatch = require('@aws-cdk/aws-cloudwatch');
import synthetics = require('@aws-cdk/aws-synthetics');
import { AlarmWidget, AlarmStatusWidget } from "@aws-cdk/aws-cloudwatch";
import { GraphWidget, Metric } from "@aws-cdk/aws-cloudwatch";
import * as path from 'path';

interface ReinventCdkObservabilityStackProps extends cdk.StackProps {
  readonly stage : string
}

export class ReinventCdkObservabilityStack extends cdk.Stack {
  constructor(scope: cdk.Construct, id: string, props: ReinventCdkObservabilityStackProps) {
    super(scope, id, props);

    const dashboard = new cloudwatch.Dashboard(this, `${props.stage}-Dashboard`);

    const canaryUrl = cdk.Fn.importValue(`${props.stage}-DefaultDomain`);
    const amplifyAppId = cdk.Fn.importValue(`${props.stage}-AppId`);
    const appsyncApiId = cdk.Fn.importValue(`${props.stage}-ApiId`);

    const canary = new synthetics.Canary(this, `${props.stage}-Canary`, {
      schedule: synthetics.Schedule.rate(cdk.Duration.minutes(1)),
      test: synthetics.Test.custom({
        code: synthetics.Code.fromAsset(path.join(__dirname, 'canary')),
        handler: 'index.handler',
      }),
      runtime: synthetics.Runtime.SYNTHETICS_NODEJS_PUPPETEER_3_2,
      environmentVariables: {
        url: canaryUrl,
      },
    });

    const canaryAlarm = new cloudwatch.Alarm(this, `${props.stage}-CanaryAlarm`, {
      metric: canary.metricSuccessPercent(),
      evaluationPeriods: 2,
      threshold: 90,
      comparisonOperator: cloudwatch.ComparisonOperator.LESS_THAN_THRESHOLD,
    });

    dashboard.addWidgets(
      new AlarmStatusWidget({
        width: 12,
        alarms: [canaryAlarm],
      }),
      new AlarmWidget({
        width: 12,
        title: "Synthetics Canary Errors",
        alarm: canaryAlarm,
      })
    );

    dashboard.addWidgets(
      new GraphWidget({
        title: "AWS Amplify Requests (sum)",
        width: 12,
        left: [
          new Metric({
            namespace: "AWS/AmplifyHosting",
            metricName: "Requests",
            dimensionsMap: {
              App: amplifyAppId,
            },
            statistic: "sum",
            label: "Count",
            period: cdk.Duration.minutes(1),
          }),
        ],
      }),
      new GraphWidget({
        title: "AWS Amplify 4xx errors (sum)",
        width: 12,
        left: [
          new Metric({
            namespace: "AWS/AmplifyHosting",
            metricName: "4xxErrors",
            dimensionsMap: {
              App: amplifyAppId,
            },
            statistic: "sum",
            label: "Count",
            period: cdk.Duration.minutes(1),
          }),
        ],
      })
    );

    dashboard.addWidgets(
    //   new GraphWidget({
    //     title: "Latency",
    //     width: 12,
    //     left: [
    //       new Metric({
    //         namespace: "AWS/AppSync",
    //         metricName: "Latency",
    //         dimensionsMap: {
    //           App: appsyncApiId,
    //         },
    //         statistic: "p90",
    //         label: "90th percentile",
    //         period: cdk.Duration.minutes(1),
    //         color: 'blue',
    //       }),
          // new Metric({
          //   namespace: "AWS/AppSync",
          //   metricName: "Latency",
          //   dimensionsMap: {
          //     App: appsyncApiId,
          //   },
          //   statistic: "p50",
          //   label: "Median",
          //   period: cdk.Duration.minutes(1),
          //   color: 'orange',
          // }),
          // new Metric({
          //   namespace: "AWS/AppSync",
          //   metricName: "Latency",
          //   dimensionsMap: {
          //     App: appsyncApiId,
          //   },
          //   statistic: "p10",
          //   label: "10th percentile",
          //   period: cdk.Duration.minutes(1),
          //   color: 'green',
          // }),
      //   ],
      // }),
      new GraphWidget({
        title: "AWS AppSync 5xx errors (sum)",
        width: 12,
        left: [
          new Metric({
            namespace: "AWS/AppSync",
            metricName: "5xxErrors",
            dimensionsMap: {
              App: appsyncApiId,
            },
            statistic: "sum",
            label: "Count",
            period: cdk.Duration.minutes(1),
          }),
        ],
      })
    );
  }
}