export async function fetchJson(url) {
  const response = await fetch(url, { headers: { Accept: 'application/json' } });

  if (!response.ok) {
    throw new Error(`Falha ao buscar ${url}: ${response.status}`);
  }

  return response.json();
}
