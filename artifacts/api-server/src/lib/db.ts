const CLOUDFLARE_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID || "";
const CLOUDFLARE_API_TOKEN = process.env.CLOUDFLARE_API_TOKEN || "";
const CLOUDFLARE_D1_DATABASE_ID = process.env.CLOUDFLARE_D1_DATABASE_ID || "";

interface D1Response {
  result: Array<{
    results: any[];
    success: boolean;
    meta: any;
  }>;
  success: boolean;
  errors: any[];
  messages: any[];
}

export async function queryD1(sql: string, params: any[] = []): Promise<any[]> {
  if (!CLOUDFLARE_API_TOKEN || !CLOUDFLARE_ACCOUNT_ID || !CLOUDFLARE_D1_DATABASE_ID) {
    console.warn("[D1] Cloudflare credentials missing. Falling back to mock data or error.");
    throw new Error("Cloudflare D1 credentials not configured.");
  }

  const url = `https://api.cloudflare.com/client/v4/accounts/${CLOUDFLARE_ACCOUNT_ID}/d1/database/${CLOUDFLARE_D1_DATABASE_ID}/query`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${CLOUDFLARE_API_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      sql,
      params,
    }),
  });

  const data = (await response.json()) as D1Response;

  if (!data.success) {
    throw new Error(`D1 Query Failed: ${JSON.stringify(data.errors)}`);
  }

  return data.result[0]?.results || [];
}


export async function executeD1(sql: string, params: any[] = []): Promise<void> {
  await queryD1(sql, params);
}
