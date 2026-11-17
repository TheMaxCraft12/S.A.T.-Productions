import { pbkdf2Sync, randomBytes } from 'node:crypto';
const password = process.argv[2];
if (!password || password.length < 12) {
  console.error('Verwendung: node hash-password.mjs "EIN-LANGES-PASSWORT"');
  console.error('Bitte mindestens 12 Zeichen verwenden.');
  process.exit(1);
}
const iterations = 310000;
const salt = randomBytes(16);
const hash = pbkdf2Sync(password, salt, iterations, 32, 'sha256');
console.log(`pbkdf2$${iterations}$${salt.toString('hex')}$${hash.toString('hex')}`);
