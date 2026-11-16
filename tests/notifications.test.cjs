const assert = require('node:assert/strict');
const { AppDataSource } = require('../dist/config/data-source');
const { User } = require('../dist/entities/User');
const { notifyUser } = require('../dist/services/NotificationService');
(async () => {
 const original = AppDataSource.getRepository;
 let preferences = {}, delivered = [];
 AppDataSource.getRepository = entity => entity === User ? { findOneBy: async () => ({ preferences }) } : { create: x => x, save: async x => { delivered.push(x); return x; } };
 try {
  await notifyUser('recipient', 'custom.deploy', 'Deployment', 'Done');
  assert.equal(delivered.length, 1);
  assert.equal(delivered[0].userId, 'recipient');
  preferences = { notifications: false };
  await notifyUser('recipient', 'task.assigned', 'Task', 'Test');
  assert.equal(delivered.length, 1);
  preferences = { notifications: true, mutedNotificationTypes: ['custom.deploy'] };
  await notifyUser('recipient', 'custom.deploy', 'Deployment', 'Done');
  assert.equal(delivered.length, 1);
  await notifyUser('recipient', 'task.assigned', 'Task', 'Test');
  assert.equal(delivered.length, 2);
  preferences = { mutedNotificationTypes: [] };
  await notifyUser('recipient', 'custom.deploy', 'Deployment', 'Done');
  assert.equal(delivered.length, 3);
  console.log('Notification delivery and preference checks passed');
 } finally { AppDataSource.getRepository = original; }
})().catch(error => { console.error(error); process.exitCode = 1; });
