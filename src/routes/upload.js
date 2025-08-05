import express from 'express'
import multer from 'multer'
import { v4 as uuidv4 } from 'uuid'
import { processImageRandomly } from '../utils/imageProcessor.js'
import { supabase, base64ToBytes } from '../config/database.js'
import { renderTemplate } from '../utils/templateRenderer.js'

const router = express.Router()

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB limit
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true)
        } else {
            cb(new Error('Only image files are allowed!'), false)
        }
    }
})

// Upload page route
router.get('/', (req, res) => {
    const baseUrl = `${req.protocol}://${req.get('host')}`
    const currentUrl = `${baseUrl}${req.originalUrl}`
    
    res.send(renderTemplate('upload', {
        baseUrl,
        currentUrl
    }))
})

// Upload endpoint
router.post('/upload', upload.single('image'), async (req, res) => {
    console.log('📤 New image upload received')
    
    try {
        if (!req.file) {
            return res.status(400).send('No image file uploaded!')
        }
        
        console.log(`📸 Processing ${req.file.mimetype} file, size: ${req.file.size} bytes`)
        
        // Apply random processing
        const processingResult = await processImageRandomly(req.file.buffer, req.file.mimetype)
        
        // Generate unique ID for this image
        const imageId = uuidv4()
        
        // Convert buffer to base64 for storage
        const base64Data = processingResult.buffer.toString('base64')
        
        // Store processing metadata in the mimetype field
        const metadataMimetype = `${processingResult.mimetype}|random:${processingResult.randomValue}|type:${processingResult.processingType}|msg:${encodeURIComponent(processingResult.resultMessage)}`
        
        // Save to database
        const { error } = await supabase
            .from('images')
            .insert([
                {
                    id: imageId,
                    data: base64Data,
                    mimetype: metadataMimetype
                }
            ])
        
        if (error) {
            console.error('� Database error:', error)
            return res.status(500).send('Failed to save image to database!')
        }
        
        console.log(`✅ Image saved with ID: ${imageId}`)
        console.log(`🎲 Processing result: ${processingResult.processingType} (${processingResult.randomValue}%)`)
        
        // Prepare result data for template
        const resultStyles = {
            'LUCKY_SURVIVOR': {
                resultClass: 'original',
                emoji: '✨',
                resultEmoji1: '✨',
                resultEmoji2: '✨',
                resultType: 'LUCKY_SURVIVOR'
            },
            'NORMAL_SHIT': {
                resultClass: 'medium',
                emoji: '💩',
                resultEmoji1: '💩',
                resultEmoji2: '💩',
                resultType: 'NORMAL_SHIT'
            },
            'EXTREME_NUCLEAR': {
                resultClass: 'heavy',
                emoji: '💀',
                resultEmoji1: '💀',
                resultEmoji2: '💀',
                resultType: 'EXTREME_NUCLEAR'
            }
        }
        
        const style = resultStyles[processingResult.processingType] || resultStyles['MEDIUM_COMPRESSION']
        
        // Prepare URL data for metadata
        const baseUrl = `${req.protocol}://${req.get('host')}`
        const currentUrl = `${baseUrl}/result/${imageId}`
        
        // Show results page
        res.send(renderTemplate('result', {
            imageId: imageId,
            resultMessage: processingResult.resultMessage,
            randomValue: processingResult.randomValue,
            processingType: processingResult.processingType.replace('_', ' '),
            baseUrl,
            currentUrl,
            color: style.resultClass === 'original' ? '#28a745' : 
                   style.resultClass === 'medium' ? '#17a2b8' : '#dc3545',
            ...style
        }))
        
    } catch (error) {
        console.error('� Upload error:', error)
        res.status(500).send(`Processing failed! Error: ${error.message}`)
    }
})

export default router
