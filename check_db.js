const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  'https://xtcpdolwfahcunumijcr.supabase.co',
  'sb_publishable_uk_AC-YPpefT4074zDEEPg_n3aN8rdZ'
);

async function check() {
  console.log('--- CONTENEDORES ---');
  const { data: c } = await supabase.from('contenedores').select('*').order('id_contenedor', { ascending: false }).limit(3);
  console.log(c);
  
  if (c && c.length > 0) {
    console.log('\n--- DETALLES DEL ÚLTIMO CONTENEDOR ---');
    const { data: d } = await supabase.from('contenedor_detalles').select('*').eq('id_contenedor', c[0].id_contenedor);
    console.log(d);
  }

  console.log('\n--- KARDEX ---');
  const { data: k } = await supabase.from('kardex_inventario').select('*').limit(5);
  console.log(k);
}

check();
