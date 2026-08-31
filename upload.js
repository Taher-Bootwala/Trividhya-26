const { createClient } = require('@supabase/supabase-js');
const sharp = require('sharp');
const fs = require('fs');

const SUPABASE_URL = 'https://cwjxzhshujlujhproenn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN3anh6aHNodWpsdWpocHJvZW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5MDYwNDMsImV4cCI6MjA4OTQ4MjA0M30.8E9n9jUeMHs5IuWuYt0YkB7bYaNawf1RNpUBKTUxi4o';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
    try {
        console.log('Compressing image...');
        await sharp('d:/trividhya/homebg.png')
            .resize({ width: 1920, withoutEnlargement: true })
            .jpeg({ quality: 75 })
            .toFile('d:/trividhya/homebg_compressed.jpg');
            
        console.log('Reading compressed image...');
        const fileData = fs.readFileSync('d:/trividhya/homebg_compressed.jpg');
        
        console.log('Deleting old homebg.png from supabase...');
        const { error: delError } = await supabase.storage.from('trividhya_images').remove(['homebg.png']);
        if (delError) {
            console.log('Delete error (might not exist):', delError.message);
        } else {
            console.log('Successfully deleted old homebg.png');
        }

        console.log('Uploading new homebg...');
        const { data, error } = await supabase.storage.from('trividhya_images').upload('homebg.png', fileData, {
            contentType: 'image/jpeg',
            upsert: true
        });
        
        if (error) {
            console.error('Upload error:', error);
        } else {
            console.log('Successfully uploaded:', data);
        }
    } catch (err) {
        console.error('Script error:', err);
    }
}
run();
