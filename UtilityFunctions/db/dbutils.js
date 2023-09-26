import oracledb from 'oracledb';
import chalk from 'chalk';

export async function getOracleConnection() {
    try {
        let connection;
        connection = await oracledb.createPool(config);
        if (connection) {
            console.log('DB : ' + chalk.green("Oracle Connected!"));
        } else if (!connection) {
            throw new Error('Oracle Connection Pool Not Initialized');
        }
        return connection;
    } catch (err) {
        console.error('Error Getting Oracle Database Connection: ', err);
    }
};
