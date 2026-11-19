"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = require("./config/prisma.js");
async function main() {
    const result = await prisma_js_1.prisma.$queryRawUnsafe("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users'");
    console.log('Users columns:', result.map((r) => r.COLUMN_NAME));
    await prisma_js_1.prisma.$disconnect();
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
