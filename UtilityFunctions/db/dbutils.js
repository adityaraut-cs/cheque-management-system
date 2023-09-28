import oracledb from 'oracledb';

export async function getOracleConnection() {
    try {
        let connection;
        connection = await oracledb.getConnection(config.oracledb);
        if (!connection) {
            logger.error('Oracle Connection Not Initialized');
        }
        return connection;
    } catch (error) {
        logger.error('Error Getting Oracle Database Connection: ', error);
        throw err;
    }
};
