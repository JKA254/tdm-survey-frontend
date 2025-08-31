// TDM Survey - Web Station Version
// เวอร์ชัน Web Station สำหรับ Synology
// Port: 80 (มาตรฐาน HTTP)

const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const XLSX = require('xlsx');

const app = express();
const PORT = process.env.PORT || 8080;

// Database configuration
const dbConfig = {
    host: '183.88.220.24',
    user: 'JKdata',
    password: 'Changeme1234',
    database: 'JKdata',
    charset: 'utf8mb4'
};

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(__dirname));

// Upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        cb(null, `${timestamp}_${originalname}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB limit
});

// Database connection
async function getDbConnection() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        return connection;
    } catch (error) {
        console.error('Database connection error:', error);
        throw error;
    }
}

// Routes

// Home page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Health check
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'OK', 
        message: 'TDM Survey Web Station is running!',
        timestamp: new Date().toISOString(),
        port: PORT,
        version: 'Web Station 1.0'
    });
});

// Get organizations
app.get('/api/organizations', async (req, res) => {
    try {
        const connection = await getDbConnection();
        const [rows] = await connection.execute('SELECT DISTINCT organization_name FROM parcels ORDER BY organization_name');
        await connection.end();
        
        const organizations = rows.map(row => row.organization_name);
        res.json(organizations);
    } catch (error) {
        console.error('Error fetching organizations:', error);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

// Get parcels
app.get('/api/parcels', async (req, res) => {
    try {
        const { organization } = req.query;
        const connection = await getDbConnection();
        
        let query = 'SELECT * FROM parcels';
        let params = [];
        
        if (organization) {
            query += ' WHERE organization_name = ?';
            params.push(organization);
        }
        
        query += ' ORDER BY created_at DESC';
        
        const [rows] = await connection.execute(query, params);
        await connection.end();
        
        res.json(rows);
    } catch (error) {
        console.error('Error fetching parcels:', error);
        res.status(500).json({ error: 'Failed to fetch parcels' });
    }
});

// Add new parcel
app.post('/api/parcel', async (req, res) => {
    try {
        const {
            parcel_cod,
            owner_name,
            organization_name,
            land_type,
            ryw,
            recorded_by,
            latitude,
            longitude,
            photos,
            notes
        } = req.body;

        const connection = await getDbConnection();
        
        const query = `
            INSERT INTO parcels 
            (parcel_cod, owner_name, organization_name, land_type, ryw, recorded_by, latitude, longitude, photos, notes, created_at) 
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())
        `;
        
        const values = [
            parcel_cod,
            owner_name,
            organization_name,
            land_type,
            ryw || null,
            recorded_by,
            latitude || null,
            longitude || null,
            photos ? JSON.stringify(photos) : null,
            notes || null
        ];
        
        const [result] = await connection.execute(query, values);
        await connection.end();
        
        res.json({ 
            success: true, 
            message: 'Parcel saved successfully!',
            id: result.insertId 
        });
        
    } catch (error) {
        console.error('Error saving parcel:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to save parcel',
            details: error.message 
        });
    }
});

// File upload
app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }
        
        res.json({
            success: true,
            filename: req.file.filename,
            originalname: req.file.originalname,
            size: req.file.size
        });
    } catch (error) {
        console.error('Upload error:', error);
        res.status(500).json({ error: 'File upload failed' });
    }
});

// Export to Excel
app.get('/api/export/:organization', async (req, res) => {
    try {
        const { organization } = req.params;
        const connection = await getDbConnection();
        
        const [rows] = await connection.execute(
            'SELECT * FROM parcels WHERE organization_name = ? ORDER BY created_at DESC',
            [organization]
        );
        await connection.end();
        
        // Create Excel workbook
        const ws = XLSX.utils.json_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Parcels');
        
        // Generate Excel file
        const excelBuffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
        
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="${organization}_parcels.xlsx"`);
        res.send(excelBuffer);
        
    } catch (error) {
        console.error('Export error:', error);
        res.status(500).json({ error: 'Export failed' });
    }
});

// Start server
app.listen(PORT, () => {
    console.log(`🚀 TDM Survey Web Station running on port ${PORT}`);
    console.log(`📱 Access via: http://tdmbackup-sg4.quickconnect.to`);
    console.log(`💾 Database: ${dbConfig.host}`);
    console.log(`📁 Upload dir: ${path.join(__dirname, 'uploads')}`);
    console.log(`🌐 Version: Web Station 1.0`);
});
