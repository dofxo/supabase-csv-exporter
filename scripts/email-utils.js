import nodemailer from 'nodemailer'
import { readdirSync, readFileSync } from 'fs'

async function sendEmail() {
    console.log('Preparing to send email via Gmail...')

    // Check if we have any CSV files to send
    const exportDir = 'exports'
    const files = readdirSync(exportDir).filter(file => file.endsWith('.csv'))

    if (files.length === 0) {
        console.log('No CSV files found to send')
        return
    }

    console.log(`Found ${files.length} CSV files to attach`)

    // Create Gmail transporter
    const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.GMAIL_EMAIL,
            pass: process.env.GMAIL_APP_PASSWORD,
        },
    })

    // Verify connection configuration
    try {
        await transporter.verify()
        console.log('Gmail server connection verified')
    } catch (error) {
        console.error('Error connecting to Gmail:', error)
        throw new Error('Failed to connect to Gmail. Check your credentials and ensure you\'re using an App Password.')
    }

    // Prepare attachments
    const attachments = files.map(file => ({
        filename: file,
        content: readFileSync(`${exportDir}/${file}`),
        contentType: 'text/csv'
    }))

    // Get current date
    const currentDate = new Date().toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    })

    // Email content
    const mailOptions = {
        from: `"Supabase Exporter" <${process.env.GMAIL_EMAIL}>`,
        to: process.env.EMAIL_RECIPIENT,
        subject: `Supabase CSV Export - ${currentDate}`,
        html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Supabase Daily Export</h2>
        <p>Hello,</p>
        <p>Attached are the daily CSV exports from your Supabase database.</p>
        
        <div style="background-color: #f9fafb; padding: 15px; border-radius: 8px; margin: 20px 0;">
          <p style="margin: 0;"><strong>Generated on:</strong> ${new Date().toLocaleString()}</p>
          <p style="margin: 10px 0 0 0;"><strong>Files attached (${files.length}):</strong></p>
          <ul style="margin: 5px 0 0 0;">
            ${files.map(file => `<li>${file}</li>`).join('')}
          </ul>
        </div>
        
        <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;">
        <p style="color: #6b7280; font-size: 14px;">
          This is an automated email from your GitHub Actions workflow.
        </p>
      </div>
    `,
        attachments: attachments
    }

    // Send email
    try {
        const info = await transporter.sendMail(mailOptions)
        console.log('Email sent successfully!')
        console.log('Message ID:', info.messageId)
    } catch (error) {
        console.error('Error sending email:', error)
        throw new Error(`Failed to send email: ${error.message}`)
    }
}

// Run email sending
sendEmail().catch(error => {
    console.error('Failed to send email:', error)
    process.exit(1)
})
