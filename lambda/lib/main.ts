import { Logger } from "@aws-lambda-powertools/logger";
import { CustomIdpEvent, CustomIdpResponse } from "../types";
import { fetchSecretString } from "./utils";
import * as ftpSessionPolicy from "../ftp-session-policy.json";
import { verifyPassword } from "./credential-verifier";

const logger = new Logger();

export const main = async (
  event: CustomIdpEvent,
  secretId: string,
  iamRoleArn: string,
  bucketName: string
): Promise<CustomIdpResponse | undefined> => {
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
