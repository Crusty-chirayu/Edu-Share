import "dotenv/config";
import { getSql } from "../src/db/client";

const INSTITUTION_ID = "10000000-0000-4000-8000-000000000001";
const SUBJECT_ID_1 = "20000000-0000-4000-8000-000000000001";
const SUBJECT_ID_2 = "20000000-0000-4000-8000-000000000002";
const USER_ID = "30000000-0000-4000-8000-000000000001";
const RESOURCE_ID = "40000000-0000-4000-8000-000000000001";

async function main() {
  const sql = getSql();
  console.log("Seeding sample academic data...");

  await sql`
    INSERT INTO institutions (id, name)
    VALUES (${INSTITUTION_ID}, 'Engineering Faculty')
    ON CONFLICT (id) DO NOTHING
  `;

  await sql`
    INSERT INTO subjects (id, institution_id, name, code, department, semester)
    VALUES 
      (${SUBJECT_ID_1}, ${INSTITUTION_ID}, 'Computer Networks & Security', 'CS401', 'Computer Science', 4),
      (${SUBJECT_ID_2}, ${INSTITUTION_ID}, 'Advanced Algorithms', 'CS402', 'Computer Science', 4)
    ON CONFLICT (id) DO NOTHING
  `;

  await sql.begin(async (tx) => {
    await tx.unsafe(`SELECT set_config('app.user_id', $1, true)`, [USER_ID]);
    await tx`
      INSERT INTO profiles (id, display_name, email, role)
      VALUES (${USER_ID}, 'Dr. Elena Rostova', 'elena@university.invalid', 'teacher')
      ON CONFLICT (id) DO NOTHING
    `;
    await tx`
      INSERT INTO resources (
        id, owner_id, subject_id, title, description,
        resource_type, visibility, file_key, file_name,
        file_size_bytes, file_mime_type, download_count
      )
      VALUES (
        ${RESOURCE_ID},
        ${USER_ID},
        ${SUBJECT_ID_1},
        'Comprehensive Guide to TCP/IP Congestion Control',
        'In-depth lecture notes covering Reno, Vegas, Cubic, and BBR algorithms with mathematical models, packet loss analysis, and real-world simulation traces.',
        'lecture_notes',
        'public',
        'resources/sample/tcp-congestion-control.pdf',
        'tcp-congestion-control.pdf',
        2485760,
        'application/pdf',
        42
      )
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        resource_type = EXCLUDED.resource_type,
        visibility = EXCLUDED.visibility,
        download_count = EXCLUDED.download_count
    `;
  });

  console.log("Sample data seeded successfully. Resource ID:", RESOURCE_ID);
  await sql.end({ timeout: 5 });
}

main().catch((e) => {
  console.error("Seeding error:", e);
  process.exit(1);
});
