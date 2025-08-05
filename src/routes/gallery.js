import express from 'express'
import { supabase } from '../config/database.js'
import { renderTemplate } from '../utils/templateRenderer.js'

const router = express.Router()

/**
 * Gallery page - displays all processed images with statistics
 */
router.get('/gallery', async (req, res) => {
    try {
        console.log('🖼️ Loading gallery page...')
        
        // Fetch all images from database, ordered by creation date (newest first)
        const { data: images, error } = await supabase
            .from('images')
            .select('*')
            .order('id', { ascending: false })
        
        if (error) {
            console.error('❌ Database error:', error)
            throw error
        }
        
        console.log(`📸 Found ${images.length} images in the gallery`)
        
        // Process images for template
        const processedImages = images.map(image => {
            // Parse processing info from mimetype field  
            let type = 'unknown'
            let typeDisplay = 'Unknown Processing'
            let rollInfo = 'N/A'
            
            if (image.mimetype?.includes('random:')) {
                const parts = image.mimetype.split('random:')[1]
                if (parts) {
                    const [rollPart, typePart] = parts.split('-')
                    rollInfo = rollPart || 'N/A'
                    
                    if (typePart?.includes('ORIGINAL')) {
                        type = 'original'
                        typeDisplay = '✨ Original Quality'
                    } else if (typePart?.includes('MEDIUM_COMPRESSION')) {
                        type = 'medium'
                        typeDisplay = '📸 Medium Compression'
                    } else if (typePart?.includes('HEAVY_COMPRESSION')) {
                        type = 'heavy'
                        typeDisplay = '🔥 Heavy Compression'
                    }
                }
            }
            
            return {
                id: image.id,
                type: type,
                typeDisplay: typeDisplay,
                rollInfo: rollInfo,
                date: "some time..."
            }
        })
        
        // Calculate statistics for display
        const originalCount = images.filter(img => img.mimetype?.includes('LUCKY_SURVIVOR')).length
        const mediumCount = images.filter(img => img.mimetype?.includes('NORMAL_SHIT')).length
        const heavyCount = images.filter(img => img.mimetype?.includes('EXTREME_NUCLEAR')).length
        const unknownCount = images.filter(img => !img.mimetype?.includes('random:')).length
        
        // Render gallery template with all data
        const templateData = {
            currentUrl: `${req.protocol}://${req.get('host')}${req.originalUrl}`,
            baseUrl: `${req.protocol}://${req.get('host')}`,
            imageCount: images.length,
            hasImages: images.length > 0,
            images: processedImages,
            survivorCount: originalCount,
            shittifiedCount: mediumCount, 
            obliteratedCount: heavyCount,
            unknownCount: unknownCount
        }
        
        const html = await renderTemplate('gallery', templateData)
        res.send(html)
        
    } catch (error) {
        console.error('❌ Gallery error:', error)
        res.status(500).send(`
            <div style="text-align: center; padding: 50px; font-family: Arial;">
                <h2>🚫 Gallery Unavailable</h2>
                <p>Unable to load gallery. Please try again later.</p>
                <a href="/" style="color: #007bff;">← Back to Upload</a>
            </div>
        `)
    }
})

export default router