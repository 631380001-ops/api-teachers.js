const FEISHU_CONFIG = {
  APP_ID: 'cli_a96321aea4b85ceb',
  APP_SECRET: '0ylNJgCwouaq6zpb4OR2pgj6yrFq0rTZ',
  APP_TOKEN: 'Z4TxbYerbavEjisDmRAc8AVxnAf',
  SCHEDULE_TABLE: 'tblYA5iBJMk1fCKq',
  TEACHER_TABLE: 'tbljnjwN5AAO5PZA'
};

async function getFeishuToken() {
  const res = await fetch('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      app_id: FEISHU_CONFIG.APP_ID,
      app_secret: FEISHU_CONFIG.APP_SECRET
    })
  });
  const data = await res.json();
  return data.code === 0 ? data.tenant_access_token : null;
}

exports.handler = async (event, context) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const token = await getFeishuToken();
    const response = await fetch(
      `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TEACHER_TABLE}/records?page_size=500`,
      {
        headers: { 'Authorization': `Bearer ${token}` }
      }
    );
    const data = await response.json();
    return { statusCode: 200, headers, body: JSON.stringify(data) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
