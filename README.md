# AWS CDK Sample - Transfer family FTPS server

## Included resources

- S3 bucket
- Secret
- IAM role
- Lambda function
- VPC
- EIP

## How to deploy

Create a certificate.

```bash
aws acm request-certificate --domain-name "ftps.server.host.name"
```

Create the .env file

```bash
cp .env.sample .env
vi .env
```

Run cdk.

```bash
npm run cdk deploy
```

## Environment variables

| Name            | Description                 |
| :-------------- | :-------------------------- |
| CREDENTIAL_ARN  | ACM ARN for the FTPS server |
| SERVER_HOSTNAME | Hostname of the FTPS server |
