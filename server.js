require('dotenv').config();
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');

const app = express();
const PORT = process.env.PORT || 3000;

// Security constants
const JWT_SECRET = process.env.JWT_SECRET || 'harshank_photography_secret_2026';
const ADMIN_USER = 'admin';
const ADMIN_PASS = '123456'; // Default password

// Middleware
app.use(cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000', // Update for Netlify
    credentials: true
}));
app.use(express.json());
app.use(cookieParser());

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/harshank-portfolio')
    .then(() => console.log('✅ Connected to MongoDB'))
    .catch(err => console.error('❌ MongoDB connection error:', err));

// Media Schema
const mediaSchema = new mongoose.Schema({
    filename: String, // Cloudinary public_id
    originalName: String,
    path: String, // Cloudinary URL
    type: { type: String, enum: ['image', 'video'] },
    category: String,
    title: String,
    size: Number,
    uploadedAt: { type: Date, default: Date.now }
});

const Media = mongoose.model('Media', mediaSchema);

// Custom Auth Middleware
function verifyToken(req, res, next) {
    const token = req.cookies.token;
    if (!token) return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }
}

// intercept admin.html request to enforce login
app.get('/admin.html', (req, res, next) => {
    const token = req.cookies.token;
    if (!token) {
        return res.redirect('/login.html');
    }
    try {
        jwt.verify(token, JWT_SECRET);
        next(); // Token is valid, proceed to serve static file
    } catch (err) {
        return res.redirect('/login.html');
    }
});

app.use(express.static(path.join(__dirname, 'public')));

// Cloudinary Configuration
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Multer-Cloudinary Storage engine
const storage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'harshank-portfolio',
        resource_type: 'auto', // Support video and image
        allowed_formats: ['jpeg', 'png', 'webp', 'gif', 'mp4', 'webm', 'mov']
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB
});

// ==================== API ROUTES ====================

// Auth Routes
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        const token = jwt.sign({ username: ADMIN_USER }, JWT_SECRET, { expiresIn: '2h' });
        res.cookie('token', token, { httpOnly: true, maxAge: 2 * 60 * 60 * 1000 }); // 2 hours
        return res.json({ success: true, message: 'Logged in successfully' });
    }
    res.status(401).json({ success: false, error: 'Invalid username or password' });
});

app.post('/api/logout', (req, res) => {
    res.clearCookie('token');
    res.json({ success: true, message: 'Logged out successfully' });
});

// Check auth status for frontend
app.get('/api/auth/status', (req, res) => {
    const token = req.cookies.token;
    if (!token) return res.json({ isAuthenticated: false });
    try {
        jwt.verify(token, JWT_SECRET);
        res.json({ isAuthenticated: true });
    } catch {
        res.json({ isAuthenticated: false });
    }
});

// GET all media (optionally filtered by category)
app.get('/api/media', async (req, res) => {
    try {
        const { category } = req.query;
        const filter = category ? { category } : {};
        const media = await Media.find(filter).sort({ uploadedAt: -1 });
        res.json(media);
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// POST upload media (Protected)
app.post('/api/upload', verifyToken, upload.array('files', 20), async (req, res) => {
    try {
        const { category, title } = req.body;

        const newItems = await Promise.all(req.files.map(async file => {
            const isVideo = file.mimetype.startsWith('video/');
            const item = new Media({
                filename: file.filename, // Contains Cloudinary public_id (e.g., folder/name)
                originalName: file.originalname,
                path: file.path, // Secure Cloudinary URL
                type: isVideo ? 'video' : 'image',
                category: category || 'uncategorized',
                title: title || file.originalname,
                size: file.size
            });
            return await item.save();
        }));

        res.json({ success: true, uploaded: newItems.length, items: newItems });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// DELETE media (Protected)
app.delete('/api/media/:id', verifyToken, async (req, res) => {
    try {
        const item = await Media.findById(req.params.id);
        if (!item) {
            return res.status(404).json({ success: false, error: 'Media not found' });
        }

        // Delete from Cloudinary
        const publicId = item.filename; // contains the folder/name
        if (publicId) {
            await cloudinary.uploader.destroy(publicId, { resource_type: item.type });
        }

        // Delete from MongoDB
        await Media.findByIdAndDelete(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Fallback: serve index.html
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: err.message });
    }
    if (err) {
        return res.status(400).json({ success: false, error: err.message });
    }
    next();
});

app.listen(PORT, () => {
    console.log(`🚀 Harshank Portfolio server running at http://localhost:${PORT}`);
    console.log(`📁 Admin panel at http://localhost:${PORT}/admin.html`);
});
