import { createClient } from '@supabase/supabase-js'
import { writeFileSync, mkdirSync } from 'fs'

// Initialize Supabase client
const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
)

// Tables to export
const tablesToExport = process.env.TABLES_TO_EXPORT
    ? process.env.TABLES_TO_EXPORT.split(',')
    : ['users', 'orders', 'products']

async function exportTables() {
    console.log('Starting Supabase CSV export...')
    console.log('Tables to export:', tablesToExport)

    // Ensure exports directory exists
    mkdirSync('exports', { recursive: true })

    // Export each table
    for (const tableName of tablesToExport) {
        try {
            console.log(`Exporting table: ${tableName}`)
            await exportTable(tableName)
        } catch (error) {
            console.error(`Error exporting ${tableName}:`, error.message)
        }
    }

    console.log('CSV export completed!')
}

async function exportTable(tableName) {
    try {
        // Query all data from the table
        const { data, error } = await supabase
            .from(tableName)
            .select('*')
            .order('id', { ascending: true })

        if (error) {
            throw new Error(`Supabase query error for ${tableName}: ${error.message}`)
        }

        // Convert to CSV
        const csvContent = convertToCSV(data || [])

        // Generate filename with date
        const dateStr = new Date().toISOString().split('T')[0]
        const filename = `exports/${tableName}_${dateStr}.csv`

        // Write to file
        writeFileSync(filename, csvContent)
        console.log(`Exported ${data?.length || 0} rows to ${filename}`)
    } catch (error) {
        console.error(`Failed to export ${tableName}:`, error.message)
        // Create an empty file with error message
        const dateStr = new Date().toISOString().split('T')[0]
        const filename = `exports/${tableName}_${dateStr}.csv`
        writeFileSync(filename, `Error exporting data: ${error.message}`)
    }
}

function convertToCSV(data) {
    if (!data || data.length === 0) {
        return 'No data available'
    }

    // Get all unique keys from all objects
    const headers = [...new Set(data.flatMap(obj => Object.keys(obj)))]

    // Create CSV header
    const headerRow = headers.map(header => `"${header.replace(/"/g, '""')}"`).join(',')

    // Create data rows
    const dataRows = data.map(obj => {
        return headers.map(header => {
            const value = obj[header] !== null && obj[header] !== undefined ? obj[header] : ''
            // Escape quotes and wrap in quotes
            return `"${String(value).replace(/"/g, '""')}"`
        }).join(',')
    })

    // Combine header and data
    return [headerRow, ...dataRows].join('\n')
}

// Handle unhandled rejections
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error)
    process.exit(1)
})

// Run the export
exportTables().catch(error => {
    console.error('Export failed:', error)
    process.exit(1)
})
