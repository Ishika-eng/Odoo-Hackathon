const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt'); // from Person 2's package.json
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding fake data for testing...');
  const passwordHash = await bcrypt.hash('password123', 10);

  // Create Company
  const company = await prisma.company.create({
    data: {
      name: 'Odoo Hackathon Corp',
      country: 'USA',
      currency_code: 'USD',
    }
  });

  // Create Manager
  const manager = await prisma.user.create({
    data: {
      company_id: company.id,
      name: 'Manager Sarah',
      email: 'manager@test.com',
      password: passwordHash,
      role: 'MANAGER',
    }
  });

  // Create Employee
  const employee = await prisma.user.create({
    data: {
      company_id: company.id,
      name: 'Employee Test',
      email: 'you@test.com',
      password: passwordHash,
      role: 'EMPLOYEE',
      manager_id: manager.id // Manager relationship for Approval Engine
    }
  });

  // Create Admin
  await prisma.user.create({
    data: {
      company_id: company.id,
      name: 'Admin Boss',
      email: 'admin@test.com',
      password: passwordHash,
      role: 'ADMIN',
    }
  });

  // Create Workflow Step 1
  await prisma.approvalWorkflow.create({
    data: {
      company_id: company.id,
      step_order: 1,
      role: 'MANAGER',
      is_mandatory: true,
      is_manager_approver: true
    }
  });

  // Create Workflow Step 2
  await prisma.approvalWorkflow.create({
    data: {
      company_id: company.id,
      step_order: 2,
      role: 'DIRECTOR',
      is_mandatory: false,
      is_manager_approver: false
    }
  });

  // Create rule
  await prisma.approvalRule.create({
    data: {
      company_id: company.id,
      rule_type: 'PERCENTAGE',
      percentage: 50
    }
  });

  console.log('Seed completed successfully!');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
