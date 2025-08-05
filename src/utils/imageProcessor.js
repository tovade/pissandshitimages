import sharp from 'sharp'

/**
 * Processes an image with random quality degradation
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimetype - Original image mimetype
 * @returns {Object} Processing result with buffer, mimetype, and metadata
 */
async function processImageRandomly(buffer, mimetype) {
    // Generate random percentage (0-100)
    const randomValue = Math.random() * 100
    
    console.log(`� Processing image with random value: ${randomValue.toFixed(2)}%`)
    
    let result = {}
    
    if (randomValue < 25) {
        // 25% chance - Heavy compression
        console.log('🔥 Applying heavy compression')
        const processedResult = await applyHeavyCompression(buffer, mimetype)
        result = {
            ...processedResult,
            processingType: 'EXTREME_NUCLEAR',
            randomValue: randomValue.toFixed(2),
            resultMessage: 'Image processed with heavy compression'
        }
    } else if (randomValue < 50) {
        // 25% chance - Medium compression  
        console.log('� Applying medium compression')
        const processedResult = await applyMediumCompression(buffer, mimetype)
        result = {
            ...processedResult,
            processingType: 'NORMAL_SHIT',
            randomValue: randomValue.toFixed(2),
            resultMessage: 'Image processed with medium compression'
        }
    } else {
        // 50% chance - No processing (original)
        console.log('✨ Keeping original quality')
        result = {
            buffer,
            mimetype,
            processingType: 'LUCKY_SURVIVOR',
            randomValue: randomValue.toFixed(2),
            resultMessage: 'Image kept in original quality'
        }
    }
    
    return result
}

/**
 * Applies medium compression to an image
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimetype - Original mimetype
 * @returns {Object} Processed image data
 */
async function applyMediumCompression(buffer, mimetype) {
    try {
        console.log(`Processing image: ${mimetype}, size: ${buffer.length} bytes`)
        
        // First pass: resize and compress
        const firstPass = await sharp(buffer)
            .resize(800, 600, { 
                fit: 'inside', 
                withoutEnlargement: false
            })
            .jpeg({ 
                quality: 70,
                progressive: true
            })
            .toBuffer()
        
        console.log(`Medium compression: ${buffer.length} → ${firstPass.length} bytes`)
        
        return {
            buffer: firstPass,
            mimetype: 'image/jpeg'
        }
    } catch (error) {
        console.error('Medium compression failed:', error)
        
        // Fallback to minimal processing
        try {
            const fallbackBuffer = await sharp(buffer)
                .jpeg({ quality: 80 })
                .toBuffer()
            
            return {
                buffer: fallbackBuffer,
                mimetype: 'image/jpeg'
            }
        } catch (fallbackError) {
            console.error('Fallback also failed:', fallbackError)
            return { buffer, mimetype }
        }
    }
}

/**
 * Applies heavy compression to an image
 * @param {Buffer} buffer - Image buffer
 * @param {string} mimetype - Original mimetype
 * @returns {Object} Processed image data
 */
async function applyHeavyCompression(buffer, mimetype) {
    try {
        console.log(`Heavy processing: ${mimetype}, size: ${buffer.length} bytes`)
        
        let processedBuffer = buffer
        
        // Multi-pass compression for maximum size reduction
        for (let pass = 0; pass < 3; pass++) {
            console.log(`� Compression pass ${pass + 1}/3`)
            
            processedBuffer = await sharp(processedBuffer)
                // Progressive size reduction
                .resize(
                    Math.max(200, 600 - (pass * 100)),
                    Math.max(150, 450 - (pass * 75)),
                    { 
                        fit: 'inside',
                        kernel: 'cubic'
                    }
                )
                // Add slight blur for compression artifacts
                .blur(0.3 + (pass * 0.2))
                // Reduce quality progressively
                .jpeg({ 
                    quality: Math.max(30, 50 - (pass * 10)),
                    progressive: false,
                    mozjpeg: true
                })
                .toBuffer()
                
            console.log(`Pass ${pass + 1} complete. Size: ${processedBuffer.length} bytes`)
        }
        
        console.log(`Heavy compression complete: ${buffer.length} → ${processedBuffer.length} bytes`)
        return {
            buffer: processedBuffer,
            mimetype: 'image/jpeg'
        }
    } catch (error) {
        console.error('Heavy compression failed:', error)
        // Fall back to medium compression
        return await applyMediumCompression(buffer, mimetype)
    }
}

export {
    processImageRandomly,
    applyMediumCompression,
    applyHeavyCompression
}
