import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'adityaraut@credenceanalytics.com',
  auth: {
    user: 'adityaraut@credenceanalytics.com',
    pass: 'Credimpl$15',
  },
});

export async function sendEmailNotification(userEmail, subject, message) {
  try {
    const info = await transporter.sendMail({
      from: 'adityaraut@credenceanalytics.com',
      to: userEmail,
      subject: subject,
      text: message,
    });

    console.log('Email Notification Sent:', info.response);
  } catch (error) {
    console.error('Error Sending Email Notification :', error);
    throw error;
  }
}

