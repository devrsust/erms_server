// cloudinary.config.ts
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { ConfigService } from '@nestjs/config';

export const CloudinaryConfig = (configService: ConfigService) => {
    cloudinary.config({
        cloud_name: configService.get('CLOUDINARY_CLOUD_NAME'),
        api_key: configService.get('CLOUDINARY_API_KEY'),
        api_secret: configService.get('CLOUDINARY_API_SECRET'),
    });
};

export const cloudinaryStorage = new CloudinaryStorage({
    cloudinary: cloudinary,
    params: async (req, file) => {
        const isSignature = req.url.includes('signature');

        return {
            folder: isSignature ? 'signatures' : 'stamps',
            format: 'png',
            public_id: `${Date.now()}-${Math.random().toString(36).substring(7)}`,
            transformation: [
                { quality: 'auto' },
                { fetch_format: 'auto' },
            ],
            allowed_formats: ['jpg', 'jpeg', 'png', 'svg'],
        };
    },
});