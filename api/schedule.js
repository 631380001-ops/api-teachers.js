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

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const token = await getFeishuToken();
    const { teacher } = req.query;

    if (req.method === 'GET') {
      // 获取排课数据
      if (teacher) {
        // 获取指定老师的数据
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
        res.json(data);
      } else {
        // 获取所有数据
        const response = await fetch(
          `https://open.feishu.cn/open-apis/bitable/v1/apps/${FEISHU_CONFIG.APP_TOKEN}/tables/${FEISHU_CONFIG.SCHEDULE_TABLE}/records?page_size=500`,
          {
            headers: { 'Authorization': `Bearer ${token}` }
          }
        );
        const data = await response.json();
        res.json(data);
      }
    } else if (req.method === 'POST') {
      // 保存排课数据（只删除当前周的旧数据，再添加新的）
      const { teacher, records, weekStart } = req.body;
      
      // 计算当前周的时间范围（时间戳）
      const weekStartTime = weekStart ? new Date(weekStart).getTime() : Date.now();
      const weekEndTime = weekStartTime + 7 * 24 * 60 * 60 * 1000;
      
      // 获取该老师所有旧数据
      const oldResponse = await fetch(
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
      const oldData = await oldResponse.json();
      
      // 只删除当前周的旧数据（根据日期字段的时间戳判断）
      if (oldData.code === 0 && oldData.data.items.length > 0) {
        const recordsToDelete = oldData.data.items.filter(item => {
          const dateValue = item.fields['日期'];
          // 处理日期字段（可能是时间戳或字符串）
          let recordTime;
          if (typeof dateValue === 'number') {
            recordTime = dateValue;
          } else if (typeof dateValue === 'string') {
            recordTime = new Date(dateValue).getTime();
          } else {
            return false;
          }
          return recordTime >= weekStartTime && recordTime < weekEndTime;
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
      
      // 添加新数据
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
        res.json(data);
      } else {
        res.json({ code: 0, msg: 'success' });
      }
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}
