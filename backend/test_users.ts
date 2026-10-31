import 'dotenv/config';
import mongoose from 'mongoose';
import { User } from './src/models/User.js';

async function run() {
  await mongoose.connect(process.env.MONGODB_URI!);
  const users = await User.find().sort({ createdAt: -1 }).limit(5).lean();
  console.log(JSON.stringify(users.map(u => ({ email: u.email, roles: u.roles, role: (u as any).role, activeMode: u.activeMode, phone: u.phone })), null, 2));
  process.exit(0);
}
run().catch(console.error);
