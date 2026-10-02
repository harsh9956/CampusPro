const mongoose = require('mongoose');
require('dotenv').config();

async function migrate() {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
  await mongoose.connect(mongoUri);
  console.log('[Migration] Connected to MongoDB');

  const deptCol = mongoose.connection.db.collection('departments');
  const missingDeptYears = await deptCol.find({
    $or: [{ academicYear: { $exists: false } }, { academicYear: null }]
  }).toArray();

  console.log(`[Migration] Found ${missingDeptYears.length} departments needing academicYear backfill`);

  if (missingDeptYears.length > 0) {
    const res = await deptCol.updateMany(
      { $or: [{ academicYear: { $exists: false } }, { academicYear: null }] },
      { $set: { academicYear: '2026-27', isActive: true, status: 'active' } }
    );
    console.log(`[Migration] Updated ${res.modifiedCount} departments with academicYear: '2026-27'`);
  }

  // Drop old global unique index on enrollmentNo if it exists on students
  const studentCol = mongoose.connection.db.collection('students');
  const studentIndexes = await studentCol.indexes();
  const oldEnrollmentIndex = studentIndexes.find(idx => idx.name === 'enrollmentNo_1');
  if (oldEnrollmentIndex) {
    console.log('[Migration] Dropping old global enrollmentNo_1 index on students collection...');
    await studentCol.dropIndex('enrollmentNo_1');
    console.log('[Migration] Dropped enrollmentNo_1 index successfully.');
  }

  // Drop old name_1 index on departments if it exists
  const deptIndexes = await deptCol.indexes();
  const oldDeptNameIndex = deptIndexes.find(idx => idx.name === 'name_1');
  if (oldDeptNameIndex) {
    console.log('[Migration] Dropping old global name_1 index on departments collection...');
    await deptCol.dropIndex('name_1');
    console.log('[Migration] Dropped name_1 index successfully.');
  }

  console.log('[Migration] Complete.');
  await mongoose.disconnect();
}

migrate().catch(console.error);
