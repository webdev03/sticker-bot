export type JWTData = {
  /**
   * Slack User ID
   */
  user: string;
  /**
   * Name of user
   */
  name: string;
  /**
   * Profile picture of user
   */
  image: string | null;
};
