-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Analysis" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fieldId" TEXT NOT NULL,
    "meanNDVI" REAL NOT NULL,
    "ndviTrend" TEXT NOT NULL,
    "healthStatus" TEXT NOT NULL,
    "avgTemperature" REAL NOT NULL,
    "totalRainfall" REAL NOT NULL,
    "waterStressRisk" BOOLEAN NOT NULL,
    "diseaseRisk" BOOLEAN NOT NULL,
    "rawData" TEXT NOT NULL,
    "recommendations" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Analysis_fieldId_fkey" FOREIGN KEY ("fieldId") REFERENCES "Field" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Analysis" ("avgTemperature", "createdAt", "diseaseRisk", "fieldId", "healthStatus", "id", "meanNDVI", "ndviTrend", "rawData", "recommendations", "totalRainfall", "waterStressRisk") SELECT "avgTemperature", "createdAt", "diseaseRisk", "fieldId", "healthStatus", "id", "meanNDVI", "ndviTrend", "rawData", "recommendations", "totalRainfall", "waterStressRisk" FROM "Analysis";
DROP TABLE "Analysis";
ALTER TABLE "new_Analysis" RENAME TO "Analysis";
CREATE TABLE "new_Field" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "cropType" TEXT NOT NULL DEFAULT 'Tobacco',
    "polygon" TEXT NOT NULL,
    "area" REAL,
    "location" TEXT,
    "userId" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Field_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Field" ("area", "createdAt", "cropType", "id", "location", "name", "polygon", "userId") SELECT "area", "createdAt", "cropType", "id", "location", "name", "polygon", "userId" FROM "Field";
DROP TABLE "Field";
ALTER TABLE "new_Field" RENAME TO "Field";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
