/**
 * Database configuration and connection utilities
 * 
 * Database Schema:
 * CREATE TABLE images (
 *     id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 *     data text NOT NULL,
 *     mimetype text NOT NULL
 * );
 * 
 * CREATE EXTENSION IF NOT EXISTS "pgcrypto";
 */

import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config()

// Supabase connection
export const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY)

/**
 * Helper function to convert base64 string to buffer
 * @param {string} base64 - Base64 encoded string
 * @returns {Buffer} Buffer containing the binary data
 */
export function base64ToBytes(base64) {
    return Buffer.from(base64, 'base64')
}
