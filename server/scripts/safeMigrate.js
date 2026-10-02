/**
 * Safe Non-Destructive Baseline Migration
 * Adds academicYear: '2026-27' ONLY where missing
 * Preserves all existing data untouched
 */
const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function migrate() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/campuspro';
  await mongoose.connect(uri);
  console.log('[Migration] Connected to MongoDB');

  // 1. Sections without academicYear -> set '2026-27'
  const secRes = await mongoose.connection.db.collection('sections').updateMany(
    { academicYear: { $exists: false } },
    { $set: { academicYear: '2026-27' } }
  );
  console.log(`[Migration] Updated ${secRes.modifiedCount} sections to 2026-27`);

  // 2. Ensure AcademicYear baseline
  const ayCount = await mongoose.connection.db.collection('academicyears').countDocuments();
  if (ayCount === 0) {
    await mongoose.connection.db.collection('academicyears').insertMany([
      { year: '2026-27', isCurrent: true, status: 'ACTIVE', createdAt: new Date(), updatedAt: new Date() },
      { year: '2025-26', isCurrent: false, status: 'COMPLETED', createdAt: new Date(), updatedAt: new Date() },
      { year: '2024-25', isCurrent: false, status: 'ARCHIVED', createdAt: new Date(), updatedAt: new Date() }
    ]);
    console.log('[Migration] Inserted baseline academic years');
  } else {
    console.log(`[Migration] AcademicYears already exists (${ayCount} records)`);
  }

  // 3. Question Bank without academicYear -> set '2026-27'
  const qRes = await mongoose.connection.db.collection('questions').updateMany(
    { academicYear: { $exists: false } },
    { $set: { academicYear: '2026-27' } }
  );
  console.log(`[Migration] Updated ${qRes.modifiedCount} questions to 2026-27`);

  // 4. Interview Experiences without academicYear -> set '2026-27'
  const expRes = await mongoose.connection.db.collection('interviewexperiences').updateMany(
    { academicYear: { $exists: false } },
    { $set: { academicYear: '2026-27' } }
  );
  console.log(`[Migration] Updated ${expRes.modifiedCount} experiences to 2026-27`);

  // 5. Applications without academicYear -> sync with drive or set '2026-27'
  const appRes = await mongoose.connection.db.collection('applications').updateMany(
    { academicYear: { $exists: false } },
    { $set: { academicYear: '2026-27' } }
  );
  console.log(`[Migration] Updated ${appRes.modifiedCount} applications to 2026-27`);

  // 6. Interview Results without academicYear -> set '2026-27'
  const irRes = await mongoose.connection.db.collection('interviewresults').updateMany(
    { academicYear: { $exists: false } },
    { $set: { academicYear: '2026-27' } }
  );
  console.log(`[Migration] Updated ${irRes.modifiedCount} interview results to 2026-27`);

  // 7. Mock Tests without academicYear -> set '2026-27'
  const mtRes = await mongoose.connection.db.collection('mocktests').updateMany(
    { academicYear: { $exists: false } },
    { $set: { academicYear: '2026-27' } }
  );
  console.log(`[Migration] Updated ${mtRes.modifiedCount} mock tests to 2026-27`);

  // 8. Mock Results without academicYear -> set '2026-27'
  const mrRes = await mongoose.connection.db.collection('mockresults').updateMany(
    { academicYear: { $exists: false } },
    { $set: { academicYear: '2026-27' } }
  );
  console.log(`[Migration] Updated ${mrRes.modifiedCount} mock results to 2026-27`);

  await mongoose.disconnect();
  console.log('[Migration] Done safely.');
}

migrate().catch(console.error);
