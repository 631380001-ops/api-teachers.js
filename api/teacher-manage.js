const FEISHU_CONFIG = {
  APP_ID: 'cli_a96321aea4b85ceb',
  APP_SECRET: '0ylNJgCwouaq6zpb4OR2pgj6yrFq0rTZ',
  APP_TOKEN: 'CDJ6b1EOeavDL9sqG8Gcn7C3nhb',
  SCHEDULE_TABLE: 'tblyFnRWHFwibyHq',
  TEACHER_TABLE: 'tblzc6aj4asytUGn'
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
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json'
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  try {
    const token = await getFeishuToken();
    const body = JSON.parse(event.body || '{}');

    if (event.httpMethod === 'POST') {
      const { name, phone, password } = body;
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TEACHER_TABLE}/records`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              '老师姓名': name,
              '手机号': phone,
              '密码': password
            }
          })
        }
      );
      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    } else if (event.httpMethod === 'PUT') {
      const { recordId, password } = body;
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TEACHER_TABLE}/records/${recordId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            fields: {
              '密码': password
            }
          })
        }
      );
      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    } else if (event.httpMethod === 'DELETE') {
      const { recordId } = body;
      const response = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.TEACHER_TABLE}/records/${recordId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        }
      );
      const data = await response.json();
      return { statusCode: 200, headers, body: JSON.stringify(data) };
    }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
