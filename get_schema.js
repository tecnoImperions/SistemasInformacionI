const fs = require('fs');

async function getSchema() {
  const url = 'https://aptvjgcvbozwceudyylg.supabase.co/rest/v1/?apikey=sb_publishable__fAyMdirJ1WCfg2ShgXBAQ_oN6fUZQI';
  const res = await fetch(url);
  const data = await res.json();
  fs.writeFileSync('schema_dump.json', JSON.stringify(data, null, 2));
  console.log('Schema dumped to schema_dump.json');
}

getSchema();
