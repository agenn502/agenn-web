import { chromium } from "playwright";
import fs from "node:fs";
import path from "node:path";

const BASE_URL = process.env.AGENN_BASE_URL || "http://localhost:3000";

const carpeta = path.resolve(".playwright");
const archivoSesion = path.join(carpeta, "agenn-session.json");

fs.mkdirSync(carpeta, { recursive: true });

const browser = await chromium.launch({
  headless: false,
});

const context = await browser.newContext();
const page = await context.newPage();

await page.goto(`${BASE_URL}/login`, {
  waitUntil: "domcontentloaded",
});

console.log("");
console.log("==============================================");
console.log(" AGENN - SESION PARA AUDITORIA RESPONSIVE");
console.log("==============================================");
console.log("");
console.log("1. Inicia sesion normalmente en la ventana que se abrio.");
console.log("2. Espera hasta estar dentro del area de miembros.");
console.log("3. Regresa a esta consola y presiona ENTER.");
console.log("");

process.stdin.resume();

await new Promise((resolve) => {
  process.stdin.once("data", resolve);
});

await context.storageState({
  path: archivoSesion,
});

console.log("");
console.log(`Sesion guardada en: ${archivoSesion}`);
console.log("");

await browser.close();
process.exit(0);