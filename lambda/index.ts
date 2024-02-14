import { LambdaInterface } from "@aws-lambda-powertools/commons";
import { Logger } from "@aws-lambda-powertools/logger";
import { main } from "./lib/main";
import { CustomIdpEvent, CustomIdpResponse } from "./types";

const iamRoleArn = process.env.IAM_ROLE_ARN!;
const secretId = process.env.SECRET_ID!;
const bucketName = process.env.BUCKET_NAME!;
const logger = new Logger();

class LambdaHandler implements LambdaInterface {
  @logger.injectLambdaContext({ logEvent: false })
  public handler(
    event: CustomIdpEvent,
    _context: unknown
  ): Promise<CustomIdpResponse> {
    return main(event, { secretId, iamRoleArn, bucketName });
  }
}

const instance = new LambdaHandler();
export const handler = instance.handler.bind(instance); // handlerメソッドのなかでthisを使えるようにする
