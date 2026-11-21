import { randomBytes } from 'node:crypto';
import { writeFileSync, existsSync } from 'node:fs';
const file = new URL('../.env', import.meta.url);
if (existsSync(file)) throw new Error('.env ya existe; no se sobrescribirá');
writeFileSync(file, `RABBITMQ_USER=univalleshop_local\nRABBITMQ_PASSWORD=${randomBytes(24).toString('hex')}\n`, { flag: 'wx', mode: 0o600 });
console.log('Credenciales locales generadas en .env (ignorado por Git). No se imprimió la contraseña.');
