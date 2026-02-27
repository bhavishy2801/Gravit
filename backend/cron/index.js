import cron from 'node-cron';
import { createDMSMonitor } from './dmsMonitor.js';
import { createVerificationEnforcer } from './verificationEnforcer.js';

export function startCronJobs(pool, io) {
  const dmsMonitor = createDMSMonitor(pool, io);
  const verificationEnforcer = createVerificationEnforcer(pool, io);

  // Dead Man's Switch — every hour
  cron.schedule('0 * * * *', dmsMonitor, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  console.log('  📅 DMS Monitor: every hour');

  // Verification Poll Enforcer — every 15 minutes
  cron.schedule('*/15 * * * *', verificationEnforcer, {
    scheduled: true,
    timezone: 'Asia/Kolkata',
  });
  console.log('  📅 Verification Enforcer: every 15 minutes');
}
