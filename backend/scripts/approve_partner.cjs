const mongoose = require('mongoose');
require('dotenv').config({ path: './.env' });

async function approve() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/date-to-go');
  await mongoose.connection.collection('partnerprofiles').updateOne(
    { userId: new mongoose.Types.ObjectId('6ac605da2940784adcb067b9') },
    { $set: { approvalStatus: 'APPROVED' } }
  );
  console.log('PARTNER_APPROVED');
  await mongoose.disconnect();
}

approve().catch(console.error);
