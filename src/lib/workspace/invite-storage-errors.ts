type SupabaseLikeError = {
  code?: string;
  message?: string;
};

const INVITE_TABLE_NAME = "family_workspace_invites";

export const isFamilyInviteStorageNotReadyError = (
  error: SupabaseLikeError | null | undefined,
): boolean => {
  if (!error) {
    return false;
  }

  if (error.code === "PGRST205") {
    return true;
  }

  const message = error.message?.toLowerCase() ?? "";
  return message.includes(INVITE_TABLE_NAME);
};
