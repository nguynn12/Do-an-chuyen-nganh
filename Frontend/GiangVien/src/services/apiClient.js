const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export async function apiGet(path) {
  const response = await fetch(`${API_URL}${path}`, {
    method: "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API error: ${response.status}`);
  }

  return response.json();
}
