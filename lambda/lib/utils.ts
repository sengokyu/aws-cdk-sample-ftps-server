const secretsExtensionUrl = `http://localhost:${process.env.PARAMETERS_SECRETS_EXTENSION_HTTP_PORT}/secretsmanager/get`;

/**
 * Secret manager ラムダレイヤからシークレットを取得
 * @param secretId
 */
export const fetchSecretString = async (secretId: string) => {
  const url = secretsExtensionUrl + "?secretId=" + encodeURIComponent(secretId);

  const headers = new Headers();
  headers.append(
    "X-Aws-Parameters-Secrets-Token",
    process.env.AWS_SESSION_TOKEN!
  );

  const requestInit: RequestInit = {
    method: "GET",
    headers,
  };

  const response = await fetch(url, requestInit);

  if (!response.ok) {
    throw new Error(
      `Cannot retrieve secret value. ${response.status} ${response.statusText}`
    );
  }

  const secretValue = await response.json();

  return JSON.parse(secretValue.SecretString);
};
