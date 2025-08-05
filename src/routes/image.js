import express from 'express'
import { supabase, base64ToBytes } from '../config/database.js'
import { renderTemplate } from '../utils/templateRenderer.js'

const router = express.Router()

// Individual image display route
router.get('/image/:id', async (req, res) => {
    try {
        const imageId = req.params.id
        console.log(`🖼️ Requesting image: ${imageId}`)
        
        // Fetch image from database
        const { data: images, error } = await supabase
            .from('images')
            .select('*')
            .eq('id', imageId)
            .limit(1)
        
        if (error) {
            console.error('� Image fetch error:', error)
            return res.status(500).send('Database error while fetching image!')
        }
        
        if (!images || images.length === 0) {
            return res.status(404).send('Image not found! �')
        }
        
        const image = images[0]
        console.log(`✅ Found image: ${imageId}`)
        
        // Check if this is a direct image request (for <img> tags) or page request
        const isDirectImageRequest = req.headers.accept && req.headers.accept.includes('image/')
        
        if (isDirectImageRequest || req.query.raw === 'true') {
            // Return raw image data
            const imageBuffer = base64ToBytes(image.data)
            
            // Extract the actual mimetype (before the metadata)
            const actualMimetype = image.mimetype.split('|')[0] || 'image/jpeg'
            
            res.set('Content-Type', actualMimetype)
            res.set('Cache-Control', 'public, max-age=86400') // Cache for 1 day
            res.send(imageBuffer)
        } else {
            // Return HTML page with image details
            
            // Parse metadata from mimetype field
            let randomValue = 'Unknown'
            let processingType = 'UNKNOWN'
            let resultMessage = ''
            
            if (image.mimetype.includes('random:')) {
                randomValue = image.mimetype.split('random:')[1]?.split('|')[0] || 'Unknown'
            }
            
            if (image.mimetype.includes('type:')) {
                processingType = image.mimetype.split('type:')[1]?.split('|')[0] || 'UNKNOWN'
            }
            
            if (image.mimetype.includes('msg:')) {
                const encodedMsg = image.mimetype.split('msg:')[1]?.split('|')[0] || ''
                resultMessage = decodeURIComponent(encodedMsg)
            }
            
            // Get result emoji and color
            const resultEmoji = {
                'LUCKY_SURVIVOR': '✨',
                'NORMAL_SHIT':  '💩',
                'EXTREME_NUCLEAR': '💀'
            }
            
            const resultColor = {
                'LUCKY_SURVIVOR': '#28a745',
                'NORMAL_SHIT': '#17a2b8', 
                'EXTREME_NUCLEAR': '#dc3545'
            }

            const resultText = {
                'LUCKY_SURVIVOR': 'You lucky rn twin, im finna get yo ass next time 🫰',
                'NORMAL_SHIT':  'you still kinda lucky, you got moderately fucked bro... Im finna destroy that shit next time.',
                'EXTREME_NUCLEAR': 'You got nuclear shit bro, we gonna start digging in yo butt twin'
            }
            
            // Prepare URL data for metadata
            const baseUrl = `${req.protocol}://${req.get('host')}`
            const currentUrl = `${baseUrl}${req.originalUrl}`
            
            res.send(renderTemplate('image', {
                id: imageId,
                mimetype: image.mimetype.split('|')[0] || 'image/jpeg',
                createdAt: 'Recently processed',
                randomValue,
                processingType: processingType.replace('_', ' '),
                resultMessage: resultText[processingType],
                emoji: resultEmoji[processingType] || '❓',
                color: resultColor[processingType] || '#6c757d',
                baseUrl,
                currentUrl
            }))
        }
        
    } catch (error) {
        console.error('� Image route error:', error)
        res.status(500).send(`Failed to load image! Error: ${error.message}`)
    }
})

export default router
