const Database = require('better-sqlite3');
const db = new Database('../medikiosk.db');

const facts = db.prepare('SELECT * FROM history_facts').all();
console.log(JSON.stringify(facts, null, 2));
