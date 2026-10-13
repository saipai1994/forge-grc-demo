// Writes a consistent copy of the database to data/backups. Usage: node server/backup.js
const {backup}=require('./server.js');const f=backup();console.log(f?'Backup written: '+f:'Backup failed');process.exit(f?0:1);
