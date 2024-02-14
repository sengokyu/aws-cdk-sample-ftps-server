import { sha512 } from "sha512-crypt-ts";

const isHashedPasswd = (src: string): boolean => src.startsWith("$6$");

const verifyHashedPassword = (
  hashedPasswd: string,
  inputPasswd: string
): boolean => {
  const algSalt = hashedPasswd.substring(0, hashedPasswd.lastIndexOf("$"));

  return hashedPasswd === sha512.crypt(inputPasswd, algSalt);
};

const verifyPlainText = (plainText: string, inputPasswd: string): boolean =>
  plainText === inputPasswd;

/**
 * パスワード検査
 * @param storedPasswd /etc/shadow へ格納されている形式のハッシュ (SHA512のみ対応) あるいはプレーンテキスト
 * @param inputPasswd
 */
export const verifyPassword = (
  storedPasswd: string,
  inputPasswd: string
): boolean =>
  isHashedPasswd(storedPasswd)
    ? verifyHashedPassword(storedPasswd, inputPasswd)
    : verifyPlainText(storedPasswd, inputPasswd);
