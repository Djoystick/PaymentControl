export const normalizeTravelInviteToken = (input: string): string => {
  const trimmed = input.trim();
  if (!trimmed) {
    return "";
  }

  const directMatch = trimmed.match(/trip_[A-Za-z0-9]+/);
  if (directMatch?.[0]) {
    return directMatch[0];
  }

  try {
    const url = new URL(trimmed);
    const paramCandidates = [
      url.searchParams.get("invite_token"),
      url.searchParams.get("token"),
      url.searchParams.get("startapp"),
      url.searchParams.get("start"),
    ].filter((value): value is string => typeof value === "string");

    for (const value of paramCandidates) {
      const match = value.match(/trip_[A-Za-z0-9]+/);
      if (match?.[0]) {
        return match[0];
      }
    }

    const pathnameMatch = url.pathname.match(/trip_[A-Za-z0-9]+/);
    if (pathnameMatch?.[0]) {
      return pathnameMatch[0];
    }
  } catch {
    return "";
  }

  return "";
};

export const maskTravelInviteToken = (input: string): string => {
  const token = input.trim();
  if (!token) {
    return "empty";
  }

  if (token.length <= 14) {
    return token;
  }

  return `${token.slice(0, 10)}...${token.slice(-4)}`;
};
