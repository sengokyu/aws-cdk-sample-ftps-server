#!/usr/bin/env node
import "source-map-support/register";
import * as cdk from "aws-cdk-lib";
import * as transfer from "aws-cdk-lib/aws-transfer";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as sm from "aws-cdk-lib/aws-secretsmanager";
import * as lambda_nodejs from "aws-cdk-lib/aws-lambda-nodejs";
import * as lambda from "aws-cdk-lib/aws-lambda";
import path = require("path");
import * as ec2 from "aws-cdk-lib/aws-ec2";
import * as iam from "aws-cdk-lib/aws-iam";

// Certificate of FTPS server
const certificateArn = process.env.CERTIFICATE_ARN!;

const app = new cdk.App();
const stack = new cdk.Stack(app, "Stack");

// S3 bucket
const bucket = new s3.Bucket(stack, "Bucket");

// Secret manager
const secret = new sm.Secret(stack, "Secret", {
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

// Lambda
const paramsAndSecrets = lambda.ParamsAndSecretsLayerVersion.fromVersion(
  lambda.ParamsAndSecretsVersions.V1_0_103
);
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

// Elastic IP
const eip = new ec2.CfnEIP(stack, "EIP");

// Transfer server
const server = new transfer.CfnServer(stack, "Server", {
  protocols: ["FTPS"],
  identityProviderType: "AWS_LAMBDA",
  identityProviderDetails: {
    function: idpFunction.functionArn,
  },
  // Require certificate for FTPS server
  certificate: certificateArn,
  endpointType: "VPC",
  endpointDetails: {
    vpcId: vpc.vpcId,
    addressAllocationIds: [eip.attrAllocationId],
    subnetIds: vpc.publicSubnets.map((x) => x.subnetId),
  },
  domain: "S3",
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

new cdk.CfnOutput(stack, "FtpServerAddress", {
  value: eip.domain ?? "Domain name unknown",
});
