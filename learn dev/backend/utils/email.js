import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  tls: {
    rejectUnauthorized: false // Helps with some network environments/validations
  }
});

export const sendPurchaseEmail = async (studentEmail, studentName, courseTitle) => {
  console.log(`📧 Attempting to send purchase confirmation to: ${studentEmail}`);
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: studentEmail,
      subject: `Course Purchase Confirmation: ${courseTitle}`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #15211f;">
          <h2 style="color: #16806f;">Welcome to Learn Dev!</h2>
          <p>Hi <strong>${studentName}</strong>,</p>
          <p>Congratulations! You have successfully enrolled in <strong>${courseTitle}</strong>.</p>
          <p>You can now access your course content from your dashboard and start learning.</p>
          <p>If you have any questions, feel free to reply to this email.</p>
          <br />
          <p>Happy Learning!</p>
          <p><strong>The Learn Dev Team</strong></p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ Purchase email sent successfully:", info.messageId);
    return true;
  } catch (error) {
    console.error("❌ CRITICAL: Error sending purchase email:", error);
    
    console.log("-----------------------------------------");
    console.log(`⚠️  PURCHASE CONFIRMATION LOG (Email Failed):`);
    console.log(`To: ${studentEmail}`);
    console.log(`Student: ${studentName}`);
    console.log(`Course: ${courseTitle}`);
    console.log("-----------------------------------------");

    if (error.code === 'EAUTH') {
      console.error("AUTHENTICATION FAILED: Check your EMAIL_USER and EMAIL_PASS (App Password) in .env");
    }
    return false;
  }
};

export const sendOTPEmail = async (studentEmail, otp) => {
  console.log(`📧 Attempting to send OTP email to: ${studentEmail}`);
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: studentEmail,
      subject: `Reset Your Password - OTP Verification`,
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #2D3436;">
          <h2 style="color: #00A884;">Password Reset Request</h2>
          <p>Hi,</p>
          <p>You have requested to reset your password. Use the following OTP to proceed:</p>
          <div style="background-color: #F8F9FA; padding: 20px; text-align: center; border-radius: 12px; border: 1px solid #E9ECEF;">
            <h1 style="color: #00A884; font-size: 32px; letter-spacing: 5px; margin: 0;">${otp}</h1>
          </div>
          <p>This OTP is valid for 10 minutes. If you did not request this, please ignore this email.</p>
          <br />
          <p>Best regards,</p>
          <p><strong>The Learn Dev Team</strong></p>
        </div>
      `
    };

    const info = await transporter.sendMail(mailOptions);
    console.log("✅ OTP email sent successfully!");
    console.log("Message ID:", info.messageId);
    console.log("Response:", info.response);
    return true;
  } catch (error) {
    console.error("❌ CRITICAL: Error sending OTP email to:", studentEmail);
    console.error("Error Details:", error.message);
    if (error.code === 'EAUTH') {
      console.error("AUTHENTICATION FAILED: Check your EMAIL_USER and EMAIL_PASS (App Password) in .env");
    }
    return false;
  }
};
