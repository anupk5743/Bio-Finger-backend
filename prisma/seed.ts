import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Bio Finger idempotent database seed...');

  // 1. Seed Required Roles
  const roles = [
    {
      name: 'SUPER_ADMIN',
      description: 'Full application access, user administration, and system configuration',
    },
    {
      name: 'ADMIN',
      description: 'Manage users, students, batches, and view operational dashboards',
    },
    {
      name: 'OPERATOR',
      description: 'Student registration and biometric fingerprint enrollment',
    },
    {
      name: 'VIEWER',
      description: 'Read-only access to authorized records, batches, and reports',
    },
  ];

  const roleMap: Record<string, string> = {};

  for (const r of roles) {
    const roleRecord = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: {
        name: r.name,
        description: r.description,
      },
    });
    roleMap[r.name] = roleRecord.id;
    console.log(`✓ Role synced: ${roleRecord.name} [ID: ${roleRecord.id}]`);
  }

  // 2. Initial Super Admin Account from Environment Variables
  const adminFirstName = process.env.SEED_ADMIN_FIRST_NAME || 'Admin';
  const adminLastName = process.env.SEED_ADMIN_LAST_NAME || 'System';
  const adminEmail = process.env.SEED_ADMIN_EMAIL || 'admin@biofinger.local';
  const adminMobile = process.env.SEED_ADMIN_MOBILE || '9000000001';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD || 'Admin@BioFinger2026!';

  // Check if admin already exists to prevent overwriting existing credentials
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  let superAdminId: string;

  if (existingAdmin) {
    // Preserve password, update role and profile fields if needed
    const updatedAdmin = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        firstName: adminFirstName,
        lastName: adminLastName,
        mobileNumber: adminMobile,
        roleId: roleMap['SUPER_ADMIN'],
        status: 'ACTIVE',
        isDeleted: false,
      },
    });
    superAdminId = updatedAdmin.id;
    console.log(`✓ Existing Super Admin verified & updated: ${updatedAdmin.email} [ID: ${superAdminId}] (password preserved)`);
  } else {
    // Hash password with bcrypt cost factor 12
    const salt = await bcrypt.genSalt(12);
    const passwordHash = await bcrypt.hash(adminPassword, salt);

    const newAdmin = await prisma.user.create({
      data: {
        firstName: adminFirstName,
        lastName: adminLastName,
        email: adminEmail,
        mobileNumber: adminMobile,
        passwordHash,
        roleId: roleMap['SUPER_ADMIN'],
        status: 'ACTIVE',
        isDeleted: false,
      },
    });
    superAdminId = newAdmin.id;
    console.log(`✓ New Super Admin created: ${newAdmin.email} [ID: ${superAdminId}] (password securely hashed with bcrypt cost 12)`);
  }

  // 3. Seed 4 Sample Batches
  const sampleBatches = [
    { name: '261503915402', status: 'ACTIVE' },
    { name: '261503915403', status: 'ACTIVE' },
    { name: '261503915404', status: 'ACTIVE' },
    { name: '261503915405', status: 'INACTIVE' },
  ];

  const batchMap: Record<string, string> = {};

  for (const b of sampleBatches) {
    const batchRecord = await prisma.batch.upsert({
      where: { name: b.name },
      update: {
        status: b.status,
        isDeleted: false,
      },
      create: {
        name: b.name,
        status: b.status,
        createdById: superAdminId,
      },
    });
    batchMap[b.name] = batchRecord.id;
    console.log(`✓ Batch synced: ${batchRecord.name} (Status: ${batchRecord.status})`);
  }

  // 4. Seed 10 Fictional Sample Students (Mixed Active/Inactive)
  const sampleStudents = [
    {
      firstName: 'Aarav',
      lastName: 'Sharma',
      mobileNumber: '9876500001',
      email: 'aarav.sharma@demo.student',
      batchName: '261503915402',
      status: 'ACTIVE',
    },
    {
      firstName: 'Vihaan',
      lastName: 'Verma',
      mobileNumber: '9876500002',
      email: 'vihaan.verma@demo.student',
      batchName: '261503915402',
      status: 'ACTIVE',
    },
    {
      firstName: 'Aditya',
      lastName: 'Patel',
      mobileNumber: '9876500003',
      email: 'aditya.patel@demo.student',
      batchName: '261503915403',
      status: 'ACTIVE',
    },
    {
      firstName: 'Sai',
      lastName: 'Kumar',
      mobileNumber: '9876500004',
      email: 'sai.kumar@demo.student',
      batchName: '261503915403',
      status: 'ACTIVE',
    },
    {
      firstName: 'Reyansh',
      lastName: 'Singh',
      mobileNumber: '9876500005',
      email: 'reyansh.singh@demo.student',
      batchName: '261503915403',
      status: 'INACTIVE',
    },
    {
      firstName: 'Diya',
      lastName: 'Gupta',
      mobileNumber: '9876500006',
      email: 'diya.gupta@demo.student',
      batchName: '261503915404',
      status: 'ACTIVE',
    },
    {
      firstName: 'Ananya',
      lastName: 'Joshi',
      mobileNumber: '9876500007',
      email: 'ananya.joshi@demo.student',
      batchName: '261503915404',
      status: 'ACTIVE',
    },
    {
      firstName: 'Ishaan',
      lastName: 'Reddy',
      mobileNumber: '9876500008',
      email: 'ishaan.reddy@demo.student',
      batchName: '261503915404',
      status: 'ACTIVE',
    },
    {
      firstName: 'Tanvi',
      lastName: 'Mehta',
      mobileNumber: '9876500009',
      email: 'tanvi.mehta@demo.student',
      batchName: '261503915405',
      status: 'INACTIVE',
    },
    {
      firstName: 'Rohan',
      lastName: 'Deshmukh',
      mobileNumber: '9876500010',
      email: 'rohan.deshmukh@demo.student',
      batchName: '261503915405',
      status: 'INACTIVE',
    },
  ];

  for (const s of sampleStudents) {
    const studentRecord = await prisma.student.upsert({
      where: { mobileNumber: s.mobileNumber },
      update: {
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        batchId: batchMap[s.batchName],
        status: s.status,
        isDeleted: false,
      },
      create: {
        firstName: s.firstName,
        lastName: s.lastName,
        mobileNumber: s.mobileNumber,
        email: s.email,
        batchId: batchMap[s.batchName],
        createdById: superAdminId,
        status: s.status,
      },
    });
    console.log(`✓ Student synced: ${studentRecord.firstName} ${studentRecord.lastName} (Batch: ${s.batchName}, Status: ${studentRecord.status})`);
  }

  // 5. Initial Audit Log
  const existingAudit = await prisma.auditLog.findFirst({
    where: { action: 'SYSTEM_SEED', entity: 'System' },
  });

  if (!existingAudit) {
    await prisma.auditLog.create({
      data: {
        actorId: superAdminId,
        action: 'SYSTEM_SEED',
        entity: 'System',
        entityId: 'SYSTEM',
        details: 'Initial database seeding executed successfully with verified schema, roles, and reference batches.',
        ipAddress: '127.0.0.1',
      },
    });
    console.log('✓ Initial audit log entry created.');
  } else {
    console.log('✓ Initial audit log entry already present.');
  }

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
