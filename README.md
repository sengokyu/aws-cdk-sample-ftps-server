# AWS Transfer family FTPS server sample

## Includes resource

- S3 bucket
- Secret manager
- IAM role
- Lambda function
- VPC
- EIP

## Environment variables

| Name            | Description                 |
| :-------------- | :-------------------------- |
| CREDENTIAL_ARN  | ACM ARN for the FTPS server |
| SERVER_HOSTNAME | Hostname of the FTPS server |
