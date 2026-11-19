"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const prisma_js_1 = require("./config/prisma.js");
async function main() {
    const check = await prisma_js_1.prisma.$queryRawUnsafe(`
    IF NOT EXISTS (
      SELECT * FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'validUntil'
    )
    BEGIN
      ALTER TABLE [dbo].[Users] ADD [validUntil] DATETIME2 NULL;
      PRINT 'Column validUntil added successfully';
    END
    ELSE
    BEGIN
      PRINT 'Column validUntil already exists';
    END
  `);
    console.log('ALTER result:', check);
    const result = await prisma_js_1.prisma.$queryRawUnsafe("SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = 'Users'");
    console.log('Updated Users columns:', result.map((r) => r.COLUMN_NAME));
    await prisma_js_1.prisma.$disconnect();
    process.exit(0);
}
main().catch(err => {
    console.error(err);
    process.exit(1);
});
