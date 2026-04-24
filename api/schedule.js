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

function getWeekRange(dateStr) {
  const d = new Date(dateStr);
  const day = d.getDay();
  const monday = new Date(d);
  monday.setDate(d.getDate() - (day === 0 ? 6 : day - 1));
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 7);
  return { start: monday.getTime(), end: sunday.getTime() };
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
    const teacher = event.queryStringParameters?.teacher;

    if (event.httpMethod === 'GET') {
      if (teacher) {
        const response = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.SCHEDULE_TABLE}/records/search`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              filter: {
                conjunction: 'and',
                conditions: [{
                  field_name: '老师姓名',
                  operator: 'is',
                  value: [teacher]
                }]
              }
            })
          }
        );
        const data = await response.json();
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      } else {
        const response = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.SCHEDULE_TABLE}/records?page_size=500`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await response.json();
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      }
    } else if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body || '{}');
      const { teacher, records, weekStart } = body;
      
      // 获取该老师所有记录
      const allRecordsResponse = await fetch(
        `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.SCHEDULE_TABLE}/records/search`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter: {
              conjunction: 'and',
              conditions: [{
                field_name: '老师姓名',
                operator: 'is',
                value: [teacher]
              }]
            }
          })
        }
      );
      const allRecordsData = await allRecordsResponse.json();
      
      // 计算当前周的时间范围
      let weekStartTime, weekEndTime;
      if (weekStart) {
        const ws = new Date(weekStart);
        weekStartTime = ws.getTime();
        const we = new Date(ws);
        we.setDate(we.getDate() + 7);
        weekEndTime = we.getTime();
      } else if (records && records.length > 0) {
        const firstDate = records[0].fields['日期'];
        const weekRange = getWeekRange(firstDate);
        weekStartTime = weekRange.start;
        weekEndTime = weekRange.end;
      }
      
      // 只删除当前周的记录
      if (allRecordsData.code === 0 && allRecordsData.data.items.length > 0 && weekStartTime) {
        const recordsToDelete = allRecordsData.data.items.filter(item => {
          const itemDate = item.fields['日期'];
          return itemDate >= weekStartTime && itemDate < weekEndTime;
        });
        
        if (recordsToDelete.length > 0) {
          await fetch(
            `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.SCHEDULE_TABLE}/records/batch_delete`,
            {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({
                records: recordsToDelete.map(i => i.record_id)
              })
            }
          );
        }
      }
      
      // 创建新记录
      if (records && records.length > 0) {
        const response = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.SCHEDULE_TABLE}/records/batch_create`,
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ records })
          }
        );
        const data = await response.json();
        return { statusCode: 200, headers, body: JSON.stringify(data) };
      } else {
        return { statusCode: 200, headers, body: JSON.stringify({ code: 0, msg: 'success' }) };
      }
    }
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
