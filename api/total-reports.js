const fetch = require('node-fetch'); 

const TOKEN_AUTORIZADO = process.env.API_TOKEN_INTERNO;
const IMPERSONATE_API_TOKEN = process.env.IMPERSONATE_API_TOKEN;

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  const {
    company_id,
    start_date,
    end_date,
    status,
    api_token
  } = req.query;

  if (api_token !== TOKEN_AUTORIZADO) {
    return res.status(401).json({
      error: "Token inválido ou não autorizado."
    });
  }

  console.log("🔐 TOKEN_AUTORIZADO (partial) =>", process.env.API_TOKEN_INTERNO?.slice(0, 6) + '...');
  console.log("🔐 IMPERSONATE_API_TOKEN (partial) =>", process.env.IMPERSONATE_API_TOKEN?.slice(0, 6) + '...');

  try {
    const impersonateUrl = `https://app.3c.plus/api/v1/companies/${company_id}/impersonate?api_token=${encodeURIComponent(IMPERSONATE_API_TOKEN)}`;
    
    console.log("🔗 impersonateUrl =>", impersonateUrl);

    const impersonateResp = await fetch(impersonateUrl, {
      method: 'POST',
      headers: {
        'User-Agent': '3CPlus Middleware Bot',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    });

    if (!impersonateResp.ok) {
      const errText = await impersonateResp.text();
      console.error(`🛑 impersonateResp erro: ${impersonateResp.status} - ${errText}`);
      throw new Error(`Erro no impersonate: ${impersonateResp.status}`);
    }

    let impersonateJson;
      try {
        impersonateJson = await impersonateResp.json();
      } catch (e) {
          const raw = await impersonateResp.text();
          console.error("❌ Erro ao dar parse no JSON do impersonate =>", raw);
          throw new Error(`❌ Falha ao fazer parse do JSON do impersonate.`);
      }

      const tokenImpersonate = impersonateJson?.data?.api_token;
      console.log("🔓 tokenImpersonate (partial) =>", tokenImpersonate?.slice(0, 6) + '...');


    if (!tokenImpersonate) {
      throw new Error("API token de impersonate não retornado.");
    }

    const chamadasTotais = [];
    let page = 1;
    let hasMorePages = true;

    while (hasMorePages) {
      const pageUrl = new URL("https://app.3c.plus/api/v1/calls");
      pageUrl.searchParams.set("start_date", start_date);
      pageUrl.searchParams.set("end_date", end_date);
      pageUrl.searchParams.set("call_mode", "all");
      if (status) {
        pageUrl.searchParams.set("statuses", status);
      }
      pageUrl.searchParams.set("type", "all");
      pageUrl.searchParams.set("simple_paginate", "true");
      pageUrl.searchParams.set("order_by_desc", "call_date");
      pageUrl.searchParams.set("include", "campaign_rel");
      pageUrl.searchParams.set("api_token", encodeURIComponent(tokenImpersonate));
      pageUrl.searchParams.set("page", String(page));
      pageUrl.searchParams.set("per_page", "100");

      const resp = await fetch(pageUrl.toString(), {
        headers: {
          'User-Agent': 'PostmanRuntime/7.36.0',
          'Accept': '*/*',
          'Connection': 'keep-alive'
        }
      });

      if (!resp.ok) {
        const errText = await resp.text();
        throw new Error(`Erro ao buscar chamadas: ${resp.status} - ${errText}`);
      }

      const json = await resp.json();
      const chamadasPagina = Array.isArray(json.data) ? json.data : [];
      chamadasTotais.push(...chamadasPagina);

      const totalPages = json?.meta?.pagination?.total_pages || 1;
      page++;
      hasMorePages = page <= totalPages;
    }

    const total_ligacoes = chamadasTotais.length;

    return res.status(200).json({
      empresa: company_id,
      periodo: {
        de: start_date,
        ate: end_date
      },
      status: status || "todos",
      total_ligacoes
    });

  } catch (err) {
    return res.status(500).json({
      error: "Erro no processamento do relatório",
      detail: err.message
    });
  }
};
