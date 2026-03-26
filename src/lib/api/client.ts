import { clientEnv } from "@/lib/config/client-env";

type ApiRequestInit = RequestInit & {
  query?: Record<string, string | number | boolean | undefined>;
};

const withQuery = (path: string, query?: ApiRequestInit["query"]): string => {
  if (!query) {
    return path;
  }

  const searchParams = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined) {
      searchParams.set(key, String(value));
    }
  });

  const queryPart = searchParams.toString();
  return queryPart ? `${path}?${queryPart}` : path;
};

export const apiRequest = async <T>(
  path: string,
  init: ApiRequestInit = {},
): Promise<T> => {
  const { query, headers, ...restInit } = init;
  const baseUrl = clientEnv.apiBaseUrl.replace(/\/$/, "");
  const finalPath = path.startsWith("/") ? path : `/${path}`;
  const url = `${baseUrl}${withQuery(finalPath, query)}`;

  const response = await fetch(url, {
    ...restInit,
    headers: {
      "Content-Type": "application/json",
      ...headers,
    },
  });

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }

  return (await response.json()) as T;
};
