const dns = require('dns');

dns.setServers(['8.8.8.8', '8.8.4.4']);

dns.resolveSrv('_mongodb._tcp.smartaliminimentoringsy.itfokir.mongodb.net', (err, addresses) => {
  if (err) {
    console.error('SRV Error:', err);
    return;
  }
  console.log('SRV Addresses:', addresses);
  
  dns.resolveTxt('smartaliminimentoringsy.itfokir.mongodb.net', (err, records) => {
    if (err) {
      console.error('TXT Error:', err);
      return;
    }
    console.log('TXT Records:', records);
  });
});
