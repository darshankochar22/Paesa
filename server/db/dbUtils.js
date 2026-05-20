// DB utility functions for common operations like get, insert, update, delete, etc.

const { drizzle } = require('drizzle-orm/libsql');
const { sql } = require('drizzle-orm');
const { db: libsqlClient } = require('./index');

const db = drizzle(libsqlClient);

const BATCH_INSERT_DELAY = 1;
const INSERTION_BATCH_SIZE = 1000;

const getSingle = async (table, match = {}, selectColumns = []) => {
    try {
        const cols = selectColumns.length > 0 ? selectColumns.join(', ') : '*';
        const whereKeys = Object.keys(match);

        if (whereKeys.length === 0) {
            throw new Error('Match condition required for getSingle');
        }

        const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
        const whereValues = whereKeys.map(key => match[key]);

        const result = await db.execute(
            sql.raw(`SELECT ${cols} FROM ${table} WHERE ${whereClause} LIMIT 1`, whereValues)
        );

        if (!result.rows || result.rows.length === 0) {
            throw {
                custom: true,
                message: `Requested record not found`,
                table,
                match,
            };
        }

        return result.rows[0];
    } catch (error) {
        console.error(`Error in getSingle for table ${table}:`, error);
        throw error;
    }
};

const getSingleNoThrow = async (table, match = {}, selectColumns = []) => {
    try {
        const cols = selectColumns.length > 0 ? selectColumns.join(', ') : '*';
        const whereKeys = Object.keys(match);

        if (whereKeys.length === 0) {
            const result = await db.execute(sql.raw(`SELECT ${cols} FROM ${table} LIMIT 1`));
            return result.rows.length > 0 ? result.rows[0] : null;
        }

        const whereClause = whereKeys.map(key => `${key} = ?`).join(' AND ');
        const whereValues = whereKeys.map(key => match[key]);

        const result = await db.execute(
            sql.raw(`SELECT ${cols} FROM ${table} WHERE ${whereClause} LIMIT 1`, whereValues)
        );

        return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
        console.error(`Error in getSingleNoThrow for table ${table}:`, error);
        return null;
    }
};

const getRecords = async (table, options = {}) => {
    try {
        const {
            match = {},
            whereIns = [],
            ranges = [],
            orderBy = null,
            limit = null,
            offset = null,
            order = 'asc',
            selectColumns = []
        } = options;

        const cols = selectColumns.length > 0 ? selectColumns.join(', ') : '*';
        const args = [];
        let query = `SELECT ${cols} FROM ${table}`;
        const conditions = [];

        // Add match conditions
        const matchKeys = Object.keys(match);
        if (matchKeys.length > 0) {
            conditions.push(matchKeys.map(key => `${key} = ?`).join(' AND '));
            args.push(...matchKeys.map(key => match[key]));
        }

        // Add whereIn conditions
        whereIns.forEach(([column, values]) => {
            if (values && values.length > 0) {
                const placeholders = values.map(() => '?').join(', ');
                conditions.push(`${column} IN (${placeholders})`);
                args.push(...values);
            }
        });

        // Add range conditions
        ranges.forEach(([column, low, high]) => {
            if (low !== null && low !== undefined) {
                conditions.push(`${column} > ?`);
                args.push(low);
            }
            if (high !== null && high !== undefined) {
                conditions.push(`${column} <= ?`);
                args.push(high);
            }
        });

        if (conditions.length > 0) {
            query += ` WHERE ${conditions.join(' AND ')}`;
        }

        // Add order by
        if (orderBy) {
            if (orderBy === 'random') {
                query += ` ORDER BY RANDOM()`;
            } else {
                query += ` ORDER BY ${orderBy} ${order.toUpperCase()}`;
            }
        }

        // Add limit
        if (limit) {
            query += ` LIMIT ?`;
            args.push(limit);
        }

        // Add offset
        if (offset) {
            query += ` OFFSET ?`;
            args.push(offset);
        }

        const result = await db.execute(sql.raw(query, args));
        return result.rows || [];
    } catch (error) {
        console.error(`Error in getRecords for table ${table}:`, error);
        throw error;
    }
};

const insertRecord = async (table, data, trx = null) => {
    try {
        const dbClient = trx || db;

        if (!data.created_at) {
            data.created_at = new Date().toISOString();
        }
        if (!data.last_updated_at) {
            data.last_updated_at = new Date().toISOString();
        }

        const keys = Object.keys(data);
        const values = keys.map(key => data[key]);
        const placeholders = keys.map(() => '?').join(', ');

        const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

        const result = await dbClient.execute(sql.raw(query, values));

        return result.rows[0];
    } catch (error) {
        console.error(`Error in insertRecord for table ${table}:`, error);
        throw error;
    }
};

const insertBatch = async (table, records, trx = null) => {
    try {
        if (!records || records.length === 0) return [];

        const dbClient = trx || db;
        const currentTime = new Date();

        for (const record of records) {
            currentTime.setMilliseconds(currentTime.getMilliseconds() + BATCH_INSERT_DELAY);
            const timeString = currentTime.toISOString();
            if (!record.created_at) {
                record.created_at = timeString;
            }
            if (!record.last_updated_at) {
                record.last_updated_at = timeString;
            }
        }

        const insertedRecords = [];

        for (let i = 0; i < records.length; i += INSERTION_BATCH_SIZE) {
            const chunk = records.slice(i, i + INSERTION_BATCH_SIZE);

            try {
                for (const record of chunk) {
                    const keys = Object.keys(record);
                    const values = keys.map(key => record[key]);
                    const placeholders = keys.map(() => '?').join(', ');
                    const query = `INSERT INTO ${table} (${keys.join(', ')}) VALUES (${placeholders}) RETURNING *`;

                    const result = await dbClient.execute(sql.raw(query, values));
                    insertedRecords.push(result.rows[0]);
                }
            } catch (error) {
                console.error('Error inserting chunk:', error);
                throw new Error(`Failed to insert chunk starting at index ${i}`);
            }
        }

        return insertedRecords;
    } catch (error) {
        console.error(`Error in insertBatch for table ${table}:`, error);
        throw error;
    }
};

const updateRecords = async (table, match, updates) => {
    try {
        const matchKeys = Object.keys(match);
        const updateKeys = Object.keys(updates);

        if (updateKeys.length === 0) {
            throw new Error('No data provided for update');
        }

        if (matchKeys.length === 0) {
            throw new Error('No match conditions provided for update (safety check)');
        }

        updates.last_updated_at = new Date().toISOString();

        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const whereClause = matchKeys.map(key => `${key} = ?`).join(' AND ');

        const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
        const args = [
            ...Object.keys(updates).map(key => updates[key]),
            ...matchKeys.map(key => match[key])
        ];

        const result = await db.execute(sql.raw(query, args));

        return result.rows || [];
    } catch (error) {
        console.error(`Error in updateRecords for table ${table}:`, error);
        throw error;
    }
};

const updateSingle = async (table, match, updates) => {
    try {
        const matchKeys = Object.keys(match);
        const updateKeys = Object.keys(updates);

        if (updateKeys.length === 0) {
            throw new Error('No data provided for update');
        }

        if (matchKeys.length === 0) {
            throw new Error('No match conditions provided for update');
        }

        updates.last_updated_at = new Date().toISOString();

        const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
        const whereClause = matchKeys.map(key => `${key} = ?`).join(' AND ');

        const query = `UPDATE ${table} SET ${setClause} WHERE ${whereClause} RETURNING *`;
        const args = [
            ...Object.keys(updates).map(key => updates[key]),
            ...matchKeys.map(key => match[key])
        ];

        const result = await db.execute(sql.raw(query, args));

        if (!result.rows || result.rows.length === 0) {
            throw {
                custom: true,
                message: `Requested record not found`,
                table,
                match,
            };
        }

        return result.rows[0];
    } catch (error) {
        console.error(`Error in updateSingle for table ${table}:`, error);
        throw error;
    }
};

const updateBatch = async (table, updates) => {
    try {
        if (!updates || updates.length === 0) return [];

        const keyColumn = 'id';
        const allKeys = Array.from(new Set(updates.flatMap(Object.keys).filter(col => col !== keyColumn)));

        const params = [];
        const cases = allKeys.map(column => {
            const whenClauses = updates
                .filter(update =>
                    update[column] !== undefined &&
                    update[keyColumn] !== undefined &&
                    update[keyColumn] !== null &&
                    update[column] !== null
                )
                .map(update => {
                    params.push(update[keyColumn]);
                    params.push(update[column]);
                    return `WHEN ? THEN ?`;
                })
                .join(' ');

            if (whenClauses.trim() === '') {
                return `${column} = ${column}`;
            }
            return `${column} = CASE ${keyColumn} ${whenClauses} ELSE ${column} END`;
        }).join(', ');

        const keys = updates.map(update => update[keyColumn]);
        params.push(...keys);
        const whereClause = `WHERE ${keyColumn} IN (${keys.map(() => '?').join(', ')})`;

        const query = `UPDATE ${table} SET ${cases} ${whereClause} RETURNING *`;
        const result = await db.execute(sql.raw(query, params));

        return result.rows || [];
    } catch (error) {
        console.error(`Error in updateBatch for table ${table}:`, error);
        throw error;
    }
};

const removeRecords = async (table, match = {}) => {
    try {
        const matchKeys = Object.keys(match);

        if (matchKeys.length === 0) {
            throw new Error('No match conditions provided for delete (safety check)');
        }

        const whereClause = matchKeys.map(key => `${key} = ?`).join(' AND ');
        const whereValues = matchKeys.map(key => match[key]);

        const query = `DELETE FROM ${table} WHERE ${whereClause}`;
        const result = await db.execute(sql.raw(query, whereValues));

        return result.rowsAffected || 0;
    } catch (error) {
        console.error(`Error in removeRecords for table ${table}:`, error);
        throw error;
    }
};

const upsertRecord = async (table, record) => {
    try {
        if (!record.id) {
            throw new Error('Cannot upsert record without id');
        }

        const { id, ...updates } = record;
        const keys = Object.keys(record);
        const values = keys.map(key => record[key]);
        const placeholders = keys.map(() => '?').join(', ');

        const updateKeys = Object.keys(updates);
        const updateClause = updateKeys.map(key => `${key} = excluded.${key}`).join(', ');

        const query = `
      INSERT INTO ${table} (${keys.join(', ')}) 
      VALUES (${placeholders}) 
      ON CONFLICT (id) DO UPDATE SET ${updateClause}
      RETURNING *
    `;

        const result = await db.execute(sql.raw(query, values));
        return result.rows[0];
    } catch (error) {
        console.error(`Error in upsertRecord for table ${table}:`, error);
        throw error;
    }
};

const executeQuery = async (query, args = []) => {
    try {
        const result = await db.execute(sql.raw(query, args));
        return result;
    } catch (error) {
        console.error('Error in executeQuery:', error);
        throw error;
    }
};

const count = async (table, match = {}) => {
    try {
        const matchKeys = Object.keys(match);
        let query = `SELECT COUNT(*) as count FROM ${table}`;
        const args = [];

        if (matchKeys.length > 0) {
            const whereClause = matchKeys.map(key => `${key} = ?`).join(' AND ');
            query += ` WHERE ${whereClause}`;
            args.push(...matchKeys.map(key => match[key]));
        }

        const result = await db.execute(sql.raw(query, args));
        return result.rows[0].count;
    } catch (error) {
        console.error(`Error in count for table ${table}:`, error);
        throw error;
    }
};

const exists = async (table, match = {}) => {
    try {
        const result = await count(table, match);
        return result > 0;
    } catch (error) {
        console.error(`Error in exists for table ${table}:`, error);
        throw error;
    }
};

const transaction = async (callback) => {
    try {
        await db.execute(sql`BEGIN TRANSACTION`);
        const result = await callback(db);
        await db.execute(sql`COMMIT`);
        return result;
    } catch (error) {
        await db.execute(sql`ROLLBACK`);
        console.error('Transaction failed:', error);
        throw error;
    }
};

module.exports = {
    getSingle,
    getSingleNoThrow,
    getRecords,
    insertRecord,
    insertBatch,
    updateRecords,
    updateSingle,
    updateBatch,
    removeRecords,
    upsertRecord,
    count,
    exists,
    executeQuery,
    transaction,
    db
};
