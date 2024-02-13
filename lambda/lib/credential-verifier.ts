import { sha512 } from "sha512-crypt-ts";

/**
 * パスワード検査
 * @param hashedPasswd /etc/shadow へ格納されている形式のハッシュ SHA512のみ対応
 * @param inputPasswd
 */
export const verifyPassword = (
  hashedPasswd: string,
  inputPasswd: string
): boolean => {
  const [_empty, _alg, salt, hashed] = hashedPasswd.split("$");

  return hashed === sha512.crypt(inputPasswd, salt);
};
