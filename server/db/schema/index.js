
module.exports =
  process.env.DB_DIALECT === 'pg'
    ? require('./pg')
    : require('./sqlite');
