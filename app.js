import express from 'express'
import path from 'path'
import dotenv from 'dotenv'

dotenv.config()

// Import route modules
import uploadRoutes from './src/routes/upload.js'
import galleryRoutes from './src/routes/gallery.js' 
import imageRoutes from './src/routes/image.js'

const app = express()
const PORT = process.env.PORT || 8080

// Middleware
app.use(express.static('public'))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

// Logging middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.path} - ${new Date().toISOString()}`)
    next()
})

// Routes
app.use('/', uploadRoutes)      // Home page and upload
app.use('/', galleryRoutes)     // Gallery page
app.use('/', imageRoutes)       // Individual image display

// 404 handler
app.use((req, res) => {
    res.status(404).send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>404 - Page Not Found</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body {
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    text-align: center;
                    padding: 50px;
                    margin: 0;
                    min-height: 100vh;
                    display: flex;
                    flex-direction: column;
                    justify-content: center;
                    align-items: center;
                }
                h1 {
                    font-size: 4rem;
                    margin-bottom: 20px;
                    text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
                }
                p {
                    font-size: 1.2rem;
                    margin: 20px 0;
                    opacity: 0.9;
                }
                a {
                    color: #fff;
                    text-decoration: none;
                    font-weight: bold;
                    font-size: 1.1rem;
                    background: rgba(255,255,255,0.2);
                    padding: 15px 30px;
                    border-radius: 25px;
                    display: inline-block;
                    margin-top: 30px;
                    transition: all 0.3s ease;
                    border: 1px solid rgba(255,255,255,0.3);
                }
                a:hover {
                    background: rgba(255,255,255,0.3);
                    transform: translateY(-2px);
                }
            </style>
        </head>
        <body>
            <h1>404</h1>
            <p>The page you're looking for doesn't exist.</p>
            <a href="/">Return to Home</a>
        </body>
        </html>
    `)
})

// Error handler
app.use((error, req, res, next) => {
    console.error('Server error:', error)
    
    // Multer file size error
    if (error.code === 'LIMIT_FILE_SIZE') {
        return res.status(413).send(`
            <h1 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #dc3545;">File Too Large</h1>
            <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Please upload an image smaller than 10MB.</p>
            <a href="/" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #007bff; text-decoration: none;">← Go back</a>
        `)
    }
    
    // General error
    res.status(500).send(`
        <h1 style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #dc3545;">Server Error</h1>
        <p style="font-family: -apple-system, BlinkMacSystemFont, sans-serif;">Something went wrong: ${error.message}</p>
        <a href="/" style="font-family: -apple-system, BlinkMacSystemFont, sans-serif; color: #007bff; text-decoration: none;">← Try again</a>
    `)
})

// Start server
app.listen(PORT, () => {
    console.log(`� Random Image Processor started`)
    console.log(`� Server running at http://localhost:${PORT}`)
    console.log(`📊 Processing odds: 50% original, 25% medium compression, 25% heavy compression`)
})

export default app
