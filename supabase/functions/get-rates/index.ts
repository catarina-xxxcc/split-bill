// 汇率服务：代理 Frankfurter（欧洲央行日度汇率，免费无 key）。
// 部署：supabase functions deploy get-rates
// 请求：POST { base: "USD" } → 返回 { base, date, rates: { EUR, CNY, ... } }

Deno.serve(async (req) => {
  const headers = { 'Content-Type': 'application/json' };
  try {
    const body = await req.json().catch(() => ({}));
    const base = (typeof body?.base === 'string' ? body.base : 'USD').toUpperCase();
    if (!/^[A-Z]{3}$/.test(base)) {
      return new Response(JSON.stringify({ error: 'invalid base' }), { status: 400, headers });
    }
    const res = await fetch(`https://api.frankfurter.dev/v1/latest?base=${base}`);
    if (!res.ok) {
      return new Response(JSON.stringify({ error: `upstream ${res.status}` }), {
        status: 502,
        headers,
      });
    }
    const data = await res.json();
    return new Response(JSON.stringify(data), { status: 200, headers });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers });
  }
});
