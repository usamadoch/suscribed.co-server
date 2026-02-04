import { Router } from 'express';
import { Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AuthenticatedRequest } from '../types/index.js';
import { protect } from '../middleware/auth.js';
import config from '../config/index.js';

const router = Router();

// Ensure upload directory exists
const uploadDir = config.upload.dir;
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer storage configuration
const storage = multer.diskStorage({
    destination: (_req, file, cb) => {
        const type = file.mimetype.split('/')[0];
        let folder = 'files';

        if (type === 'image') folder = 'images';
        else if (type === 'video') folder = 'videos';
        else if (type === 'audio') folder = 'audio';

        const targetDir = path.join(uploadDir, folder);
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }
        cb(null, targetDir);
    },
    filename: (_req, file, cb) => {
        const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1E9)}`;
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    },
});

// File filter
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    const allowedMimes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
        // Videos
        'video/mp4', 'video/webm', 'video/quicktime',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg',
        // Documents
        'application/pdf',
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} not allowed`));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: config.upload.maxFileSize,
    },
});

// Upload single image
router.post('/image', protect, upload.single('image'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
            });
            return;
        }

        const relativePath = path.relative(uploadDir, req.file.path).replace(/\\/g, '/');
        const url = `/uploads/${relativePath}`;

        res.json({
            success: true,
            data: {
                url,
                filename: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Upload multiple images
router.post('/images', protect, upload.array('images', 10), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const files = req.files as Express.Multer.File[];

        if (!files || files.length === 0) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'No files uploaded' },
            });
            return;
        }

        const uploadedFiles = files.map((file) => {
            const relativePath = path.relative(uploadDir, file.path).replace(/\\/g, '/');
            return {
                url: `/uploads/${relativePath}`,
                filename: file.originalname,
                fileSize: file.size,
                mimeType: file.mimetype,
            };
        });

        res.json({
            success: true,
            data: { files: uploadedFiles },
        });
    } catch (error) {
        next(error);
    }
});

// Upload video
router.post('/video', protect, upload.single('video'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
            });
            return;
        }

        const relativePath = path.relative(uploadDir, req.file.path).replace(/\\/g, '/');
        const url = `/uploads/${relativePath}`;

        res.json({
            success: true,
            data: {
                url,
                filename: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Upload audio
router.post('/audio', protect, upload.single('audio'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
            });
            return;
        }

        const relativePath = path.relative(uploadDir, req.file.path).replace(/\\/g, '/');
        const url = `/uploads/${relativePath}`;

        res.json({
            success: true,
            data: {
                url,
                filename: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Upload generic file
router.post('/file', protect, upload.single('file'), async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        if (!req.file) {
            res.status(400).json({
                success: false,
                error: { code: 'VALIDATION_ERROR', message: 'No file uploaded' },
            });
            return;
        }

        const relativePath = path.relative(uploadDir, req.file.path).replace(/\\/g, '/');
        const url = `/uploads/${relativePath}`;

        res.json({
            success: true,
            data: {
                url,
                filename: req.file.originalname,
                fileSize: req.file.size,
                mimeType: req.file.mimetype,
            },
        });
    } catch (error) {
        next(error);
    }
});

// Delete file
router.delete('/:type/:filename', protect, async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
        const fileType = String(req.params.type);
        const fileName = String(req.params.filename);
        const filePath = path.join(uploadDir, fileType, fileName);

        if (!fs.existsSync(filePath)) {
            res.status(404).json({
                success: false,
                error: { code: 'NOT_FOUND', message: 'File not found' },
            });
            return;
        }

        fs.unlinkSync(filePath);

        res.json({
            success: true,
            data: { message: 'File deleted' },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
