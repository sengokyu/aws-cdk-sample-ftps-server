#!/usr/bin/env node
import * as cdk from "aws-cdk-lib";
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as lambda_nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as logs from "aws-cdk-lib/aws-logs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sm from "aws-cdk-lib/aws-secretsmanager";
import * as transfer from "aws-cdk-lib/aws-transfer";
import "source-map-support/register";
import path = require("path");

// Certificate of FTPS server
const certificateArn = process.env.CERTIFICATE_ARN!;

// Hostname of FTPS server
const serverHostname = process.env.SERVER_HOSTNAME;

const app = new cdk.App();
const stack = new cdk.Stack(app, "Stack", { stackName: "FtpsServerSample" });

// S3 bucket
const bucket = new s3.Bucket(stack, "Bucket", {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
});

// Secret manager
const secret = new sm.Secret(stack, "Secret", {
  description: "FTPS server sample",
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  secretObjectValue: {
    // Unsafe!! Just a sample.
    ftpuser: cdk.SecretValue.unsafePlainText("ftppasswd"),
  },
});

// IAM managed policy
const managedPolicy = new iam.ManagedPolicy(stack, "ManagedPolicy", {
  statements: [
    new iam.PolicyStatement({
      actions: ["s3:ListBucket"],
      effect: iam.Effect.ALLOW,
      resources: [`arn:aws:s3:::${bucket.bucketName}`],
    }),
    new iam.PolicyStatement({
      actions: [
        "s3:PutObject",
        "s3:GetObject",
        "s3:GetObjectTagging",
        "s3:DeleteObject",
        "s3:DeleteObjectVersion",
        "s3:GetObjectVersion",
        "s3:GetObjectVersionTagging",
      ],
      effect: iam.Effect.ALLOW,
      resources: [`arn:aws:s3:::${bucket.bucketName}/*`],
    }),
  ],
});

// IAM role for FTPS user
const role = new iam.Role(stack, "Role", {
  assumedBy: new iam.ServicePrincipal("transfer.amazonaws.com"),
  managedPolicies: [managedPolicy],
});

// Lambda layer
const paramsAndSecrets = lambda.ParamsAndSecretsLayerVersion.fromVersion(
  lambda.ParamsAndSecretsVersions.V1_0_103
);

// Lambda
const idpFunction = new lambda_nodejs.NodejsFunction(stack, "Handler", {
  runtime: lambda.Runtime.NODEJS_LATEST,
  entry: path.resolve("lambda/index.ts"),
  environment: {
    BUCKET_NAME: bucket.bucketName,
    IAM_ROLE_ARN: role.roleArn,
    SECRET_ID: secret.secretName,
    PARAMETERS_SECRETS_EXTENSION_HTTP_PORT: "2773",
  },
  paramsAndSecrets,
  bundling: {
    minify: true,
    sourcesContent: false,
  },
});

secret.grantRead(idpFunction);

// VPC
const vpc = new ec2.Vpc(stack, "Vpc", {
  natGateways: 0,
  maxAzs: 1,
  subnetConfiguration: [{ name: "public", subnetType: ec2.SubnetType.PUBLIC }],
});
vpc.addGatewayEndpoint("S3Endpoint", {
  service: ec2.GatewayVpcEndpointAwsService.S3,
});

// Default security group
const securityGroup = ec2.SecurityGroup.fromSecurityGroupId(
  stack,
  "SecurityGroup",
  vpc.vpcDefaultSecurityGroup
);
securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(21));
securityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcpRange(8192, 8200));
securityGroup.addEgressRule(ec2.Peer.anyIpv4(), ec2.Port.allTraffic());

// Elastic IP
const eip = new ec2.CfnEIP(stack, "EIP");

// Log group
const logGroup = new logs.LogGroup(stack, "LogGroup", {
  removalPolicy: cdk.RemovalPolicy.DESTROY,
  retention: logs.RetentionDays.ONE_DAY,
});

// Transfer server
const server = new transfer.CfnServer(stack, "Server", {
  protocols: ["FTPS"],
  protocolDetails: {
    tlsSessionResumptionMode: "ENABLED",
  },
  identityProviderType: "AWS_LAMBDA",
  identityProviderDetails: {
    function: idpFunction.functionArn,
  },
  // Require certificate for FTPS server
  certificate: certificateArn,
  domain: "S3",
  endpointType: "VPC",
  endpointDetails: {
    vpcId: vpc.vpcId,
    addressAllocationIds: [eip.attrAllocationId],
    // Require only one subnet
    subnetIds: [vpc.publicSubnets[0].subnetId],
    securityGroupIds: [securityGroup.securityGroupId],
  },
  structuredLogDestinations: [logGroup.logGroupArn],
});

// Allow invoke lambda
idpFunction.grantInvoke(
  new iam.PrincipalWithConditions(
    new iam.ServicePrincipal("transfer.amazonaws.com"),
    {
      ArnLike: {
        "aws:SourceArn": server.attrArn,
      },
    }
  )
);

cdk.Tags.of(stack).add("Application", "FtpsServerSample");
