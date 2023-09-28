import nodemailer from 'nodemailer';
import logger from '../logger/loggger.js'
import { getOracleConnection } from "../db/dbutils.js";

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'adityaraut@credenceanalytics.com',
    pass: 'Credimpl$15',
  },
});

export async function sendEmailNotification({ userEmail, subject, message, payment_id, notificationBy }) {
  let connection;
  try {
    const info = await transporter.sendMail({
      from: 'adityaraut@credenceanalytics.com',
      to: userEmail,
      subject: subject,
      text: message,
    });
    logger.info(`Email Notification Sent To ${userEmail}`);
    const insertNotificationQuery = ` INSERT INTO payments_notification (payment_id, notification_by) VALUES (:payment_id, :notification_by) `;
    connection = await getOracleConnection();
    const result = await connection.execute(insertNotificationQuery, {
      payment_id: payment_id,
      notification_by: notificationBy,
    });

  } catch (error) {
    logger.error('Error Sending Email Notification :', error);
  } finally {
    connection.commit();
    connection.close();
  }
}

