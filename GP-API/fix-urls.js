const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

async function fixUrls() {
  try {
    const domains = [
      'https://minio.devplus.edu.vn/gp-bucket-dev',
      'https://10.25.83.220:9000/gp-bucket',
      'https://minio.devplus.edu.vn/gp-bucket'
    ];
    const local = 'https://127.0.0.1:9000/gp-bucket';

    console.log('Fixing URLs in Questions table...');

    for (const domain of domains) {
      // 1. AudioKeys (TEXT)
      await sequelize.query(`
        UPDATE "Questions" 
        SET "AudioKeys" = REPLACE("AudioKeys", '${domain}', '${local}')
        WHERE "AudioKeys" LIKE '%${domain}%';
      `);

      // 2. AnswerContent (JSON)
      await sequelize.query(`
        UPDATE "Questions" 
        SET "AnswerContent" = REPLACE("AnswerContent"::text, '${domain}', '${local}')::json
        WHERE "AnswerContent"::text LIKE '%${domain}%';
      `);

      // 3. GroupContent (JSON)
      await sequelize.query(`
        UPDATE "Questions" 
        SET "GroupContent" = REPLACE("GroupContent"::text, '${domain}', '${local}')::json
        WHERE "GroupContent"::text LIKE '%${domain}%';
      `);

      // 4. ImageKeys (ARRAY/TEXT[]) - Chuyển sang text, replace, rồi quay lại ARRAY
      await sequelize.query(`
        UPDATE "Questions" 
        SET "ImageKeys" = (REPLACE("ImageKeys"::text, '${domain}', '${local}')::text[] )
        WHERE "ImageKeys"::text LIKE '%${domain}%';
      `);
    }

    console.log(`Updated all URLs in Questions table successfully.`);
    process.exit(0);
  } catch (error) {
    console.error('Error fixing URLs:', error);
    process.exit(1);
  }
}

fixUrls();
