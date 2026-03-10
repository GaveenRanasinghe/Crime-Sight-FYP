import * as fs from "fs";
import * as path from "path";
import { fileURLToPath } from "url";
import * as XLSX from "xlsx";
import mysql from "mysql2/promise";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Sri Lanka district coordinates (latitude, longitude)
const DISTRICT_COORDINATES = {
  "Anuradhapura": [8.3163, 80.4365],
  "Polonnaruwa": [7.9271, 81.0001],
  "Colombo": [6.9271, 80.7789],
  "Kalutara": [6.4254, 80.1298],
  "Gampaha": [7.0674, 80.1987],
  "Galle": [6.0535, 80.2170],
  "Matara": [5.7489, 80.5375],
  "Hambanothota": [5.9167, 80.7833],
  "Kandy": [7.2906, 80.6337],
  "Nuwara Eliya": [6.9271, 80.7789],
  "Matale": [7.4697, 80.6289],
  "Jaffna": [9.6615, 80.7740],
  "Vavuniya": [8.7606, 80.8272],
  "Mannar": [8.9833, 79.9167],
  "Kilinochchi": [9.3667, 80.3833],
  "Mulative": [9.3000, 80.8000],
  "Ampara": [7.2906, 81.6667],
  "Batticaloa": [7.7102, 81.7859],
  "Trincomalee": [8.5874, 81.2344],
  "Kurunegala": [7.4863, 80.3635],
  "Puttalam": [8.0306, 79.8278],
  "Badulla": [6.9906, 81.0552],
  "Moneragala": [6.8667, 81.2500],
  "Ratnapura": [6.6828, 80.3978],
  "Kegalle": [7.2500, 80.6500],
};

async function importCrimeData() {
  try {
    // Read Excel file
    const excelPath = path.join(__dirname, "../../../upload/CrimeDatasetFYP.xlsx");
    console.log(`Reading Excel file from: ${excelPath}`);

    const workbook = XLSX.readFile(excelPath);
    const sheets = ["2021 Dataset", "2022 Dataset", "2023 Dataset"];

    // Connect to database
    const connection = await mysql.createConnection({
      host: process.env.DB_HOST || "localhost",
      user: process.env.DB_USER || "root",
      password: process.env.DB_PASSWORD || "",
      database: process.env.DB_NAME || "crime_db",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });

    console.log("Connected to database");

    let totalRecords = 0;

    for (const sheetName of sheets) {
      const sheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(sheet);
      const year = parseInt(sheetName.split(" ")[0]);

      console.log(`\nProcessing ${sheetName} (${data.length} records)`);

      for (const row of data) {
        const districtName = row.District;
        const coords = DISTRICT_COORDINATES[districtName];

        if (!coords) {
          console.warn(`Warning: Coordinates not found for district: ${districtName}`);
          continue;
        }

        // Get or create district
        let districtId;
        const [districtRows] = await connection.query(
          "SELECT id FROM districts WHERE name = ?",
          [districtName]
        );

        if (districtRows.length > 0) {
          districtId = districtRows[0].id;
        } else {
          const [result] = await connection.query(
            "INSERT INTO districts (name, latitude, longitude) VALUES (?, ?, ?)",
            [districtName, coords[0], coords[1]]
          );
          districtId = result.insertId;
          console.log(`  Created district: ${districtName}`);
        }

        // Check if crime statistics already exist for this district and year
        const [existing] = await connection.query(
          "SELECT id FROM crime_statistics WHERE district_id = ? AND year = ?",
          [districtId, year]
        );

        if (existing.length > 0) {
          console.log(`  Skipping existing record for ${districtName} (${year})`);
          continue;
        }

        // Insert crime statistics
        const query = `
          INSERT INTO crime_statistics (
            district_id, year, rape_cases, homicide, attempted_homicide,
            abduction, kidnapping, arson, theft_over_50k, grievous_hurt,
            hurt_by_knife, robbery, extortion, unnatural_offense, sexual_abuse, total
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const values = [
          districtId,
          year,
          row["Rape Cases"] || 0,
          row["Homicide"] || 0,
          row["Attempted Homicide"] || 0,
          row["Abduction"] || 0,
          row["Kidnapping"] || 0,
          row["Arson"] || 0,
          row["Theft over Rs. 50,000"] || 0,
          row["Grievous Hurt"] || 0,
          row["Hurt by Knife"] || 0,
          row["Robbery"] || 0,
          row["Extortion"] || 0,
          row["Unnatural Offense"] || 0,
          row["Sexual Abuse"] || 0,
          row["Total"] || 0,
        ];

        await connection.query(query, values);
        totalRecords++;
        console.log(`  Inserted: ${districtName} (${year})`);
      }
    }

    await connection.end();
    console.log(`\n✅ Import completed! Total records inserted: ${totalRecords}`);
  } catch (error) {
    console.error("❌ Import failed:", error);
    process.exit(1);
  }
}

importCrimeData();
