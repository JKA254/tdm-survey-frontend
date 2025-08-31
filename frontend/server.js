const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

// Load environment variables
dotenv.config();

const app = express();
const PORT = 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('.'));

// MySQL Connection Configuration
const dbConfig = {
    // Synology NAS SQL Server (MariaDB/MySQL)
    host: process.env.DB_HOST || '192.168.1.147', // เปลี่ยนเป็น IP ของ NAS
    port: process.env.DB_PORT || 3307, // พอร์ต MySQL ของ Synology (ปกติ 3306 หรือ 3307)
    user: process.env.DB_USER || 'tdm_user',
    password: process.env.DB_PASSWORD || 'your_password',
    database: process.env.DB_NAME || 'tdm_survey',
    charset: 'utf8mb4',
    // สำหรับ Synology NAS
    connectTimeout: 60000,
    acquireTimeout: 60000
};

// Alternative configuration for remote SQL server (fallback)
const remoteDbConfig = {
    host: '183.88.220.24',
    user: 'JKdata',
    password: '2852542Job@',
    database: 'AppSheet',
    charset: 'utf8mb4'
};

// File upload configuration
const upload = multer({ dest: 'uploads/' });

// Database connection pool
let pool;

async function initDB() {
    try {
        // เลือก configuration ตาม environment
        const useRemoteDB = process.env.USE_REMOTE_DB === 'true';
        const selectedConfig = useRemoteDB ? remoteDbConfig : dbConfig;

        console.log(`🔌 Connecting to ${useRemoteDB ? 'remote' : 'NAS'} database...`);
        console.log(`📍 Host: ${selectedConfig.host}:${selectedConfig.port || 3306}`);

        pool = mysql.createPool({
            ...selectedConfig,
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0
        });

        // Test connection
        const connection = await pool.getConnection();
        console.log('✅ Connected to MySQL database successfully');

        // Create organizations table
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS organizations (
                id INT AUTO_INCREMENT PRIMARY KEY,
                org_code VARCHAR(50) UNIQUE NOT NULL,
                org_name VARCHAR(255) NOT NULL,
                org_name_full VARCHAR(500),
                province VARCHAR(100),
                district VARCHAR(100),
                subdistrict VARCHAR(100),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);

        // Insert default organization
        await connection.execute(`
            INSERT IGNORE INTO organizations (org_code, org_name)
            VALUES ('CHAIYAKRAM', 'อบต.ไชยคราม')
        `);

        // Create land_parcels table with organization reference
        await connection.execute(`
            CREATE TABLE IF NOT EXISTS land_parcels (
                id INT AUTO_INCREMENT PRIMARY KEY,
                org_id INT NOT NULL,
                organization_name VARCHAR(255) DEFAULT 'อบต.ไชยคราม',
                parcel_cod VARCHAR(50) NOT NULL,
                owner_name VARCHAR(255),
                ryw VARCHAR(50),
                assessed_value DECIMAL(10,2),
                village_number VARCHAR(50),
                land_type VARCHAR(100),
                land_use VARCHAR(100),
                remarks TEXT,
                coordinates VARCHAR(100),
                recorder VARCHAR(255) DEFAULT 'jobaom5@gmail.com',
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
                photos JSON,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (org_id) REFERENCES organizations(id),
                UNIQUE KEY unique_parcel_per_org (org_id, parcel_cod)
            ) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
        `);

        connection.release();
        console.log('📊 Database tables initialized successfully');
    } catch (error) {
        console.error('❌ Database connection failed:', error);

        // ถ้าเชื่อมต่อ NAS ไม่ได้ ให้ลองใช้ remote database
        if (!process.env.USE_REMOTE_DB) {
            console.log('🔄 Trying remote database as fallback...');
            process.env.USE_REMOTE_DB = 'true';
            return initDB();
        }

        // ถ้า remote ก็ไม่ได้ ให้ทำงานแบบ offline
        console.log('⚠️ Running in offline mode without database');
    }
}

// Routes

// Test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working', timestamp: new Date() });
});

// Database test endpoint
app.get('/api/db-test', async (req, res) => {
  try {
    const [rows] = await pool.execute('SELECT 1 as test');
    res.json({ message: 'Database connected', test: rows });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all organizations
app.get('/api/organizations', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM organizations ORDER BY org_name');
        res.json(rows);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

// Get parcels by organization
app.get('/api/parcels/:orgCode?', async (req, res) => {
    try {
        const orgCode = req.params.orgCode || 'CHAIYAKRAM';
        const [rows] = await pool.execute(`
            SELECT lp.*, o.org_name, o.org_code 
            FROM land_parcels lp 
            JOIN organizations o ON lp.org_id = o.id 
            WHERE o.org_code = ? 
            ORDER BY lp.parcel_cod
        `, [orgCode]);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching parcels:', error);
        res.status(500).json({ error: 'Failed to fetch parcels' });
    }
});

// Get all parcels (original endpoint for compatibility)
app.get('/api/parcels', async (req, res) => {
    try {
        const [rows] = await pool.execute(`
            SELECT lp.*, o.org_name, o.org_code 
            FROM land_parcels lp 
            JOIN organizations o ON lp.org_id = o.id 
            ORDER BY o.org_name, lp.parcel_cod
        `);
        res.json(rows);
    } catch (error) {
        console.error('Error fetching parcels:', error);
        res.status(500).json({ error: 'Failed to fetch parcels' });
    }
});

// Get single parcel
app.get('/api/parcel/:code', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM land_parcels WHERE parcel_cod = ?', [req.params.code]);
        if (rows.length === 0) {
            return res.status(404).json({ error: 'Parcel not found' });
        }
        res.json(rows[0]);
    } catch (error) {
        console.error('Error fetching parcel:', error);
        res.status(500).json({ error: 'Failed to fetch parcel' });
    }
});

// Create or update parcel
app.post('/api/parcel', async (req, res) => {
    try {
        const {
            org_code = 'CHAIYAKRAM',
            parcel_cod, owner_name, ryw, assessed_value, village_number,
            land_type, land_use, remarks, coordinates, recorder, timestamp
        } = req.body;

        // Get organization ID
        const [orgResult] = await pool.execute('SELECT id FROM organizations WHERE org_code = ?', [org_code]);
        if (orgResult.length === 0) {
            return res.status(400).json({ error: 'Organization not found' });
        }
        const org_id = orgResult[0].id;

        const [existing] = await pool.execute('SELECT id FROM land_parcels WHERE parcel_cod = ? AND org_id = ?', [parcel_cod, org_id]);
        
        if (existing.length > 0) {
            // Update existing
            await pool.execute(`
                UPDATE land_parcels SET 
                owner_name = ?, ryw = ?, assessed_value = ?, village_number = ?,
                land_type = ?, land_use = ?, remarks = ?, coordinates = ?,
                recorder = ?, timestamp = ?, updated_at = CURRENT_TIMESTAMP
                WHERE parcel_cod = ? AND org_id = ?
            `, [owner_name, ryw, assessed_value, village_number, land_type, land_use, 
                remarks, coordinates, recorder, timestamp, parcel_cod, org_id]);
        } else {
            // Create new
            await pool.execute(`
                INSERT INTO land_parcels 
                (org_id, parcel_cod, owner_name, ryw, assessed_value, village_number, land_type, 
                 land_use, remarks, coordinates, recorder, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [org_id, parcel_cod, owner_name, ryw, assessed_value, village_number, land_type,
                land_use, remarks, coordinates, recorder, timestamp]);
        }
        
        res.json({ success: true });
    } catch (error) {
        console.error('Error saving parcel:', error);
        res.status(500).json({ error: 'Failed to save parcel' });
    }
});

// Delete parcel
app.delete('/api/parcel/:code', async (req, res) => {
    try {
        await pool.execute('DELETE FROM land_parcels WHERE parcel_cod = ?', [req.params.code]);
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting parcel:', error);
        res.status(500).json({ error: 'Failed to delete parcel' });
    }
});

// Import Excel
app.post('/api/import-excel', upload.single('file'), async (req, res) => {
    try {
        let data;
        if (req.file) {
            // File uploaded
            const workbook = XLSX.readFile(req.file.path);
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            data = XLSX.utils.sheet_to_json(sheet);
            
            // Clean up uploaded file
            fs.unlinkSync(req.file.path);
        } else {
            // JSON data from frontend
            data = req.body.rows;
        }

        for (const row of data) {
            const parcel_cod = row.parcel_cod || row['รหัสแปลง'] || row['Parcel Code'];
            const owner_name = row.owner_name || row['ชื่อเจ้าของ'] || row['Owner Name'];
            const ryw = row.ryw || row['r-y-w'];
            const assessed_value = row.assessed_value || row['ราคาประเมิน'] || row['Assessed Value'];
            const village_number = row.village_number || row['หมู่ที่'] || row['Village'];
            const land_type = row.land_type || row['ประเภทที่ดิน'] || row['Land Type'];
            const land_use = row.land_use || row['การใช้งาน'] || row['Land Use'];
            const coordinates = row.coordinates || row['พิกัด'] || row['Coordinates'];
            
            if (parcel_cod) {
                await pool.execute(`
                    INSERT INTO land_parcels 
                    (parcel_cod, owner_name, ryw, assessed_value, village_number, land_type, land_use, coordinates)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                    ON DUPLICATE KEY UPDATE 
                    owner_name = VALUES(owner_name),
                    ryw = VALUES(ryw),
                    assessed_value = VALUES(assessed_value),
                    village_number = VALUES(village_number),
                    land_type = VALUES(land_type),
                    land_use = VALUES(land_use),
                    coordinates = VALUES(coordinates),
                    updated_at = CURRENT_TIMESTAMP
                `, [parcel_cod, owner_name, ryw, assessed_value, village_number, land_type, land_use, coordinates]);
            }
        }
        
        res.json({ success: true, imported: data.length });
    } catch (error) {
        console.error('Error importing Excel:', error);
        res.status(500).json({ error: 'Failed to import Excel data' });
    }
});

// Export Excel
app.get('/api/export-excel', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT * FROM land_parcels ORDER BY parcel_cod');
        
        const workbook = XLSX.utils.book_new();
        const worksheet = XLSX.utils.json_to_sheet(rows.map(row => ({
            'รหัสแปลง': row.parcel_cod,
            'ชื่อเจ้าของ': row.owner_name,
            'r-y-w': row.ryw,
            'ราคาประเมิน': row.assessed_value,
            'หมู่ที่': row.village_number,
            'ประเภทที่ดิน': row.land_type,
            'การใช้งาน': row.land_use,
            'หมายเหตุ': row.remarks,
            'พิกัด': row.coordinates,
            'ผู้บันทึก': row.recorder,
            'วันที่': row.timestamp
        })));
        
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Land Parcels');
        
        const filename = `land_parcels_${new Date().toISOString().split('T')[0]}.xlsx`;
        const filepath = path.join(__dirname, 'temp', filename);
        
        // Ensure temp directory exists
        if (!fs.existsSync(path.join(__dirname, 'temp'))) {
            fs.mkdirSync(path.join(__dirname, 'temp'));
        }
        
        XLSX.writeFile(workbook, filepath);
        
        res.download(filepath, filename, (err) => {
            if (err) {
                console.error('Error downloading file:', err);
            }
            // Clean up temp file
            fs.unlinkSync(filepath);
        });
    } catch (error) {
        console.error('Error exporting Excel:', error);
        res.status(500).json({ error: 'Failed to export Excel' });
    }
});

// Search parcels
app.get('/api/search', async (req, res) => {
    try {
        const { q } = req.query;
        const [rows] = await pool.execute(`
            SELECT * FROM land_parcels 
            WHERE parcel_cod LIKE ? OR owner_name LIKE ? OR land_type LIKE ?
            ORDER BY parcel_cod
        `, [`%${q}%`, `%${q}%`, `%${q}%`]);
        res.json(rows);
    } catch (error) {
        console.error('Error searching:', error);
        res.status(500).json({ error: 'Failed to search' });
    }
});

// File upload for photos
app.post('/api/upload-photo', upload.single('photo'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        const filename = `photo_${Date.now()}${path.extname(req.file.originalname)}`;
        const newPath = path.join(__dirname, 'uploads', filename);
        
        fs.renameSync(req.file.path, newPath);
        
        res.json({ filename, url: `/uploads/${filename}` });
    } catch (error) {
        console.error('Error uploading photo:', error);
        res.status(500).json({ error: 'Failed to upload photo' });
    }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve the frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Initialize database and start server
initDB().then(() => {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT}`);
        console.log(`Server accessible from network on http://[YOUR_IP]:${PORT}`);
    });
}).catch(error => {
    console.error('Failed to initialize database:', error);
    // Start server anyway for development
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Server running on http://localhost:${PORT} (without database)`);
    });
});
