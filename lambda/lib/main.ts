import { Logger } from "@aws-lambda-powertools/logger";
import { CustomIdpEvent, CustomIdpResponse } from "../types";
import { verifyPassword } from "./credential-verifier";
import { fetchSecretString } from "./utils";
import ftpSessionPolicy = require("../ftp-session-policy.json");

const logger = new Logger();

interface mainArgs {
  secretId: string;
  iamRoleArn: string;
  bucketName: string;
}

export const main = async (
  event: CustomIdpEvent,
  { secretId, iamRoleArn, bucketName }: mainArgs
): Promise<CustomIdpResponse> => {
  const userAndPassword = await fetchSecretString(secretId);

  if (!(event.username in userAndPassword)) {
    logger.warn({
      message: "Authentication failed. Unknown user.",
      ...event,
    });
    return;
  }

  if (!verifyPassword(userAndPassword[event.username], event.password)) {
    logger.warn({
      message: "Authentication failed. Password mismatch.",
      ...event,
    });
    return;
  }

  return {
    Role: iamRoleArn,
    HomeDirectoryType: "PATH",
    HomeDirectory: `/${bucketName}/${event.username}`,
    Policy: JSON.stringify(ftpSessionPolicy),
  };
};
