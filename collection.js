import { sendToMq } from "./UtilityFunctions/mq/rabbitMq.js";
import { sendEmailNotification } from './UtilityFunctions/notify/notification.js'
import { getOracleConnection } from "./UtilityFunctions/db/dbutils.js";
import logger from "./UtilityFunctions/logger/loggger.js";

export async function uploadPayments(req, res) {
    let connection, user;
    try {
        const paymentRecords = req.body.data;
        const user_id = req.body.user_id
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

        logger.debug(`Processing Payment Data: { payment_id: ${payment_id}, payment_date: ${payment_date}, payee_name: ${payee_name}, bank_name: ${bank_name}, bank_code: ${bank_code}, amount: ${amount}, amount_in_words: ${amount_in_words}, email_address: ${email_address}, payment_mode: ${payment_mode}}`)

        const insertStatement = ` INSERT INTO payments_data (payment_id, payment_date, payee_name, bank_name, bank_code, amount, amount_in_words, email_address, payment_mode) VALUES (:payment_id, to_date(:payment_date, 'DD-MM-YYYY'), :payee_name, :bank_name, :bank_code, :amount, :amount_in_words, :email_address, :payment_mode) `;
        const auditInsertStatement = `INSERT INTO payment_audit (audit_id, payment_id, action_type, changed_by) VALUES (payment_audit_seq.nextval, :payment_id, 'upload', :changed_by) `;
        const userIdQuery = `SELECT user_name FROM iwz_user_master WHERE user_id = :user_id `;

        connection = await getOracleConnection();
        user = await connection.execute(userIdQuery, { user_id });
        user = user.rows[0][0] || 'unknown';
        for (const valuesArray of values) {
            await connection.execute(insertStatement, valuesArray);
        }
        for (const valuesArray of values) {
            await connection.execute(auditInsertStatement, {
                payment_id: valuesArray[0],
                changed_by: user,
            });
        }
        await sendToMq({ event: 'Upload', message: 'Payment Has Been Processed Successfully' }, 'pay', "sysevents")
        res.status(200).json({
            message: 'Payment Data Uploaded Successfully'
        });
        connection.commit();

    } catch (error) {
        logger.error('Error Uploading payment data:', error);
        connection.close();
        res.status(500).json({ error: 'Internal Server Error' });
    };
};

export async function getPayments(req, res) {
    let connection, selectQuery = 'SELECT * FROM payments_data', bind = {};
    try {
        const [paymentData] = req.body.data;

        if (paymentData.payment_id !== undefined) {
            selectQuery += ' WHERE payment_id = :payment_id '
            bind[`payment_id`] = paymentData.payment_id;
        }

        connection = await getOracleConnection();
        const result = await connection.execute(selectQuery, bind);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Payment Record Not Found.' });
        };
        res.status(200).json(result.rows);

    } catch (error) {
        logger.error('Error Retrieving Payment Data:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        connection.close();
    }
}

export async function editPayment(req, res) {
    let connection, result, user;
    try {
        let bindObj = {};
        const paymentData = req.body.data;
        const user_id = req.body.user_id;
        const updateQuery = ` UPDATE payments_data SET payee_name = :payee_name, email_address = :email_address WHERE payment_id = :payment_id `;
        const auditInsertStatement = `INSERT INTO payment_audit (audit_id, payment_id, action_type, changed_by) VALUES (payment_audit_seq.nextval, :payment_id, 'edit', :changed_by) `;
        const userIdQuery = `SELECT user_name FROM iwz_user_master WHERE user_id = :user_id `;

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

            connection = await getOracleConnection();
            [result, user] = await Promise.all([
                connection.execute(updateQuery, bindObj),
                connection.execute(userIdQuery, { user_id }),
            ]);
            user = user.rows[0][0] || 'unknown';
            connection.execute(auditInsertStatement, { payment_id: payment_id, changed_by: user })

            connection.commit();
            connection.close();
        }

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `Payment Record Not Found For Payment_ID: ${payment_id}` });
        }
        await sendToMq({ event: 'Edit', message: 'Payment Data Has Been Updated Successfully' }, 'pay', "sysevents",)
        return res.status(200).json({
            message: 'Payment Data Updated Successfully'
        });
    } catch (error) {
        logger.error('Error Updating Payment Record:', error);
        res.status(500).json({ error: 'Internal Server Error' });
    };
};

export async function authorizePayment(req, res) {
    let connection, user, result, resultEmail, updateQuery, auditInsertStatement, userIdQuery, getUserEmail;
    try {
        const { payment_id } = req.body.data[0];
        const user_id = req.body.user_id;
        if (!payment_id) {
            return res.status(400).json({ error: 'Mandatory Field : payment_id' });
        };
        updateQuery = ` UPDATE payments_data SET auth_status = 1 WHERE payment_id = :payment_id `;
        auditInsertStatement = `INSERT INTO payment_audit (audit_id, payment_id, action_type, changed_by) VALUES (payment_audit_seq.nextval, :payment_id, 'authorize', :changed_by) `;
        userIdQuery = `SELECT user_name FROM iwz_user_master WHERE user_id = :user_id `;
        getUserEmail = `SELECT email_address from payments_data where payment_id = :payment_id`

        connection = await getOracleConnection();
        [result, user] = await Promise.all([
            connection.execute(updateQuery, { payment_id }),
            connection.execute(userIdQuery, { user_id }),
        ]);

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `Payment Record Not Found For Payment_ID: ${payment_id}` });
        } else {

            logger.info(`Payment Data Authorized Successfully For Payment ID : ${payment_id}`)

            resultEmail = await connection.execute(getUserEmail, { payment_id });
            user = user.rows[0][0] || 'unknown';
            connection.execute(auditInsertStatement, { payment_id: payment_id, changed_by: user })
            console.log(resultEmail.rows[0][0])
            await sendEmailNotification({ userEmail: resultEmail.rows[0][0], subject: 'Payment Authorized', message: `Payment Has Been Authorized Successfully For Payment_ID ${payment_id}`, payment_id: payment_id, notificationBy: user });

        }
        await sendToMq({ event: 'Authorize', message: 'Payment Has Been Authorized Successfully' }, 'pay', "sysevents");
        return res.status(200).json({ message: 'Payment Has Been Authorized Successfully' });

    } catch (error) {
        logger.error('Error Authorizing Payment:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await connection.commit();
        await connection.close();
    };
};

export async function unauthorizePayment(req, res) {
    let connection, user, result, resultEmail, updateQuery, auditInsertStatement, userIdQuery, getUserEmail;
    try {
        const { payment_id } = req.body.data[0];
        const user_id = req.body.user_id;
        if (!payment_id) {
            return res.status(400).json({ error: 'Mandatory Field : payment_id' });
        };
        updateQuery = ` UPDATE payments_data SET auth_status = 0 WHERE payment_id = :payment_id `;
        auditInsertStatement = `INSERT INTO payment_audit (audit_id, payment_id, action_type, changed_by) VALUES (payment_audit_seq.nextval, :payment_id, 'unauthorize', :changed_by) `;
        userIdQuery = `SELECT user_name FROM iwz_user_master WHERE user_id = :user_id `;
        getUserEmail = `SELECT email_address from payments_data where payment_id = :payment_id`

        connection = await getOracleConnection();
        [result, user] = await Promise.all([
            connection.execute(updateQuery, { payment_id }),
            connection.execute(userIdQuery, { user_id }),
        ]);

        if (result.rowsAffected === 0) {
            return res.status(404).json({ error: `Payment Record Not Found For Payment_ID: ${payment_id}` });
        } else {

            logger.info(`Payment Data Unauthorized Successfully For Payment ID : ${payment_id}`)

            resultEmail = await connection.execute(getUserEmail, { payment_id });
            user = user.rows[0][0] || 'unknown';
            connection.execute(auditInsertStatement, { payment_id: payment_id, changed_by: user })

            await sendEmailNotification({ userEmail: resultEmail.rows[0][0], subject: 'Payment Unauthorized', message: `Payment Has Been Unauthorized Successfully For Payment_ID ${payment_id}`, payment_id: payment_id, notificationBy: user });

        }
        await sendToMq({ event: 'Authorize', message: 'Payment Has Been Unauthorized Successfully' }, 'pay', "sysevents");
        return res.status(200).json({ message: 'Payment Has Been Unauthorized Successfully' });

    } catch (error) {
        logger.error('Error Unauthorizing Payment:', error);
        return res.status(500).json({ error: 'Internal Server Error' });
    } finally {
        await connection.commit();
        await connection.close();
    }
};