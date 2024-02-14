export interface CustomIdpEvent {
  username: string;
  password: string;
  protocol: "SFTP" | "FTP" | "FTPS";
  serverId: string;
  sourceIp: string;
}

type IamArn = string;

type FailedIdpResponse = undefined;

type SucceedIdpResponse = {
  /**
   * Specifies the Amazon Resource Name (ARN) of the IAM role that controls your
   * users' access to your Amazon S3 bucket or Amazon EFS file system. The
   * policies attached to this role determine the level of access that you want
   * to provide your users when transferring files into and out of your Amazon
   * S3 or Amazon EFS file system. The IAM role should also contain a trust
   * relationship that allows the server to access your resources when servicing
   * your users' transfer requests.
   *
   * For details on establishing a trust relationship, see To establish a trust
   * relationship.
   */
  Role: IamArn;

  /**
   * The full POSIX identity, including user ID (Uid), group ID (Gid), and any
   * secondary group IDs (SecondaryGids), that controls your users' access to
   * your Amazon EFS file systems. The POSIX permissions that are set on files
   * and directories in your file system determine the level of access your
   * users get when transferring files into and out of your Amazon EFS file
   * systems.
   *
   * Required for Amazon EFS backing storage
   */

  PosixProfile?: { Uid: number; Gid: number; SecondaryGids: number[] };

  /**
   * A list of SSH public key values that are valid for this user. An empty list
   * implies that this is not a valid login. Must not be returned during
   * password authentication.
   */
  PublicKeys?: string[];

  /**
   * A session policy for your user so that you can use the same IAM role across
   * multiple users. This policy scopes down user access to portions of their
   * Amazon S3 bucket.
   */
  Policy?: string;

  /**
   * The type of landing directory (folder) that you want your users' home
   * directory to be when they log in to the server.
   *
   * If you set it to PATH, the user sees the absolute Amazon S3 bucket or
   * Amazon EFS paths as is in their file transfer protocol clients.
   *
   * If you set it to LOGICAL, you must provide mappings in the
   * HomeDirectoryDetails parameter to make Amazon S3 or Amazon EFS paths
   * visible to your users.
   */
  HomeDirectoryType?: "PATH" | "LOGICAL";

  /**
   * Logical directory mappings that specify which Amazon S3 or Amazon EFS paths
   * and keys should be visible to your user and how you want to make them
   * visible. You must specify the Entry and Target pair, where Entry shows how
   * the path is made visible and Target is the actual Amazon S3 or Amazon EFS
   * path.
   *
   * Required if HomeDirectoryType has a value of LOGICAL
   *
   * String representation of JSON: { Entry: string; Target: string }
   */
  HomeDirectoryDetails?: string;

  /**
   * The landing directory for a user when they log in to the server using the
   * client.
   *
   * Optional
   */
  HomeDirectory?: string;
};

export type CustomIdpResponse = SucceedIdpResponse | FailedIdpResponse;
