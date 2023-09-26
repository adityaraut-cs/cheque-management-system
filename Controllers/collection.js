import { sendToMq } from "../UtilityFunctions/mq/rabbitMq.js";
import { getOracleConnection } from "../UtilityFunctions/db/dbutils.js";
import { sendEmailNotification } from '../UtilityFunctions/notify/notification.js';

export async function uploadPayments(req, res) {
    let connection;
    try {
        const paymentRecords = req.body.data;
        const values = [];

        for (const payment of paymentRecords) {
            const {
                payment_id,
                payment_date,
                payee_name,
                bank_name,
                bank_code,
                amount,
                amount_in_words,
                email_address,
                payment_mode
            } = payment;

            values.push([
                payment_id,
                payment_date,
                payee_name,
                bank_name,
                bank_code,
                amount,
                amount_in_words,
                email_address,
                payment_mode
            ]);
        };


        const insertQry = `
            INSERT INTO payments_data
            (payment_id, payment_date, payee_name, bank_name, bank_code, amount, amount_in_words, email_address, payment_mode)
            VALUES
            (:payment_id, to_date(:payment_date, 'DD-MM-YYYY'), :payee_name, :bank_name, :bank_code, :amount, :amount_in_words, :email_address, :payment_mode)
        `;
        connection = await getOracleConnection();

        for (const dataArray of values) {
            await connection.execute(insertQry, dataArray);
        }

        await sendToMq({ event: 'upload', message: 'Payment Has Been Processed Successfully' }, 'pay', "sysevents");

        return res.status(200).json({
            message: 'Payment Data Processed Successfully'
        });
    } catch (error) {
        connection.close();
        console.error('Error Processed Payment Data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        connection.commit();
        connection.close();
    }
}


export async function editPayment(req, res) {
    let connection;
    try {
        let bindObj = {};
        const paymentData = req.body.data;
        connection = await getOracleConnection();
        const updateQuery = `
            UPDATE payments_data
            SET
              payeeName = :payee_name,
              emailAddress = :email_address
            WHERE
              paymentIdentifier = :payment_id
        `;

        for (const update of paymentData) {
            const { payment_id, payee_name, email_address } = update;

            if (!payment_id) {
                return res.status(400).json({ error: 'Invalid Request Body. Each Record Should Contain payment_id.' });
            }

            bindObj = {
                payment_id,
            };

            if (payee_name !== undefined) {
                bindObj.payee_name = payee_name;
            }
            if (email_address !== undefined) {
                bindObj.email_address = email_address;
            }

            await connection.execute(updateQuery, bindObj);
        }

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `Payment Record Not Found For Payment_ID: ${payment_id}` });
        }
        await sendToMq({ event: 'edit', message: 'Payment Data Has Been Updated Successfully' }, 'pay', "sysevents")
        return res.status(200).json({
            message: 'Payment Data Updated Successfully'
        });
    } catch (error) {
        console.error('Error Updating Payment Record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        connection.commit();
        connection.close();
    }
}

export async function authorizePayment(req, res) {
    let connection;
    try {
        const { payment_id } = req.body.data[0];
        if (!payment_id) {
            return res.status(400).json({ error: 'Mandatory Field : payment_id' });
        };

        connection = await getOracleConnection();
        const updateQuery = `
        UPDATE payments_data
        SET auth_status = 1
        WHERE paymentIdentifier = :payment_id
      `;

        const result = await connection.execute(updateQuery, { payment_id });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `Payment Record Not Found For Payment_ID: ${payment_id}` });
        };

        await sendToMq({ event: 'authorize', message: 'Payment Has Been Authorized Successfully' }, 'pay', "sysevents");
        await sendEmailNotification('adityarautr947@gmail.com', 'Payment Authorized', `Payment Has Been Authorized Successfully For Payment_ID ${payment_id}`);
        return res.status(200).json({ message: 'Payment Has Been Authorized Successfully' });

    } catch (error) {
        console.error('Error authorizing payment:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await connection.commit();
        await connection.close();
    }
}

export async function unauthorizePayment(req, res) {
    let connection;
    try {
        const { payment_id } = req.body.data[0];

        if (!payment_id) {
            return res.status(400).json({ error: 'Mandatory Field : payment_id' });
        };

        const updateQuery = `
        UPDATE payments_data
        SET auth_status = 0
        WHERE paymentIdentifier = :payment_id
        `;
        
        connection = await getOracleConnection();
        const result = await connection.execute(updateQuery, { payment_id });

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `Payment Record Not Found For Payment_ID: ${payment_id}` });
        }

        await sendToMq({ event: 'unauthorize', message: 'Payment Has Been Unauthorized Successfully' }, 'pay', "sysevents");
        await sendEmailNotification('adityarautr947@gmail.com', 'Payment Unauthorized', `Payment Has Been Unauthorized Successfully For Payment_ID ${payment_id}`);
        return res.status(200).json({ message: 'Payment Has Been Unauthorized Successfully' });

    } catch (error) {
        console.error('Error unauthorizing payment:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await connection.commit();
        await connection.close();
    }
}
