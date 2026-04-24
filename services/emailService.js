const SibApiV3Sdk = require('sib-api-v3-sdk');

const defaultClient = SibApiV3Sdk.ApiClient.instance;
const apiKey = defaultClient.authentications['api-key'];
apiKey.apiKey = process.env.BREVO_API_KEY;

const apiInstance = new SibApiV3Sdk.TransactionalEmailsApi();

const sendEmail = async (toEmail, toName, subject, htmlContent) => {
    // If API key is not set, just mock it
    if (!process.env.BREVO_API_KEY || process.env.BREVO_API_KEY === 'your_brevo_api_key_here') {
        console.log('--- MOCK EMAIL SENT ---');
        console.log(`To: ${toEmail}`);
        console.log(`Subject: ${subject}`);
        console.log(`Content: ${htmlContent}`);
        console.log('-----------------------');
        return true;
    }

    const sendSmtpEmail = new SibApiV3Sdk.SendSmtpEmail();
    sendSmtpEmail.subject = subject;
    sendSmtpEmail.htmlContent = htmlContent;
    sendSmtpEmail.sender = { "name": "BalanceHub", "email": process.env.BREVO_SENDER_EMAIL || "wafflewhisk.otp@gmail.com" };
    sendSmtpEmail.to = [{ "email": toEmail, "name": toName }];

    try {
        await apiInstance.sendTransacEmail(sendSmtpEmail);
        return true;
    } catch (error) {
        console.error('Error sending email:', error);
        return false;
    }
};

const sendOTP = async (user, otp, type = 'password_reset') => {
    let subject = 'Your OTP Code';
    let htmlContent = '';

    if (type === 'registration') {
        subject = 'Verify your BalanceHub Account';
        htmlContent = `<html><body><h1>Welcome to BalanceHub!</h1><p>Your OTP for account verification is: <strong style="font-size:24px; letter-spacing: 5px;">${otp}</strong></p><p>It is valid for 5 minutes.</p></body></html>`;
    } else {
        subject = 'Password Reset OTP';
        htmlContent = `<html><body><h1>Password Reset</h1><p>Your OTP for password reset is: <strong style="font-size:24px; letter-spacing: 5px;">${otp}</strong></p><p>It is valid for 5 minutes.</p></body></html>`;
    }

    return await sendEmail(user.email, user.firstName, subject, htmlContent);
};

const sendNotification = async (user, message) => {
    const subject = 'New Notification - BalanceHub';
    const htmlContent = `<html><body><h3>Hello ${user.firstName},</h3><p>${message}</p></body></html>`;
    return await sendEmail(user.email, user.firstName, subject, htmlContent);
};

module.exports = {
    sendEmail,
    sendOTP,
    sendNotification
};
