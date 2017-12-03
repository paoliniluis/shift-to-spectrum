const { Pool } = require('pg');
const argv = require('minimist')(process.argv.slice(2));
const fs = require('fs');

let dbConfig = {
    user: argv.user,
    database: argv.db,
    password: argv.pass,
    host: argv.host,
    port: argv.port || 5439, //default for redshift
    ssl: true
};

let finalSyntax = '';

const pool = new Pool(dbConfig);

const dataTypeValidator = (dataType) => {
    let type = '';
    switch(dataType.data_type) {
        case 'character varying':
            type = 'VARCHAR(' + dataType.character_maximum_length + ')';
        break;
        case 'timestamp without time zone':
            type = 'TIMESTAMP';
        break;
        case 'bigint':
            type = 'BIGINT';
        break;
        default:
            type = '';
        break;
    }
    return dataType.column_name + ' ' + type + ','
}

async function tableSyntaxGen(schema, table) {
    let unloadToS3 = `
        UNLOAD ('select * from ` + schema + '.' + table + `')
        TO 's3://` + argv.spdir+ `/` + schema + table + `/'
        ACCESS_KEY_ID '` + argv.awskey + `' 
        SECRET_ACCESS_KEY '` + argv.awssecret + `' 
        MAXFILESIZE 100 mb
        GZIP;`

    let describeTable = `
        SELECT column_name,
            data_type,
            character_maximum_length
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE table_schema = '` + schema +`'
            AND table_name = '` + table + `';`

    let countRows = 'SELECT COUNT(*) FROM ' + schema + '.' + table + ';'

    const client = await pool.connect();
    const structure = await client.query(describeTable);
    const rowCount = await client.query(countRows);
    await client.release();

    let newTableStructure = '';
    structure.rows.forEach(row => {
        newTableStructure += dataTypeValidator(row);
    })

    let createExternal = `
        CREATE EXTERNAL TABLE e_` + schema + `.` + table + 
        `(` + newTableStructure.slice(0,-1) + `)
        ROW FORMAT DELIMITED
        FIELDS TERMINATED BY '|'
        LOCATION 's3://` + argv.spdir + `/` + schema + table + `/'
        TABLE PROPERTIES ('numRows'='`+ rowCount.rows[0].count +`');`

    return unloadToS3 + createExternal;
}

async function schemaSyntaxGen(schema) {
    let getAllTablesOfTheSchema = `
        SELECT table_name
        FROM information_schema.tables
        WHERE table_type = 'BASE TABLE'
        AND table_schema ='` + schema + `';`

    const client = await pool.connect();
    const tables = await client.query(getAllTablesOfTheSchema);
    await client.release();
    
    let tablesResponse = [];
    tables.rows.forEach(table => {
        tablesResponse.push(table.table_name)
    })
    return tablesResponse;
}

const externalSchemaSyntaxGen = (schema) => {
    return generateExternalSchema = `
    CREATE external SCHEMA e_` + schema + `
    FROM data catalog
    DATABASE '` + schema + `'
    iam_role '` + argv.awsiamrole + `'
    CREATE external DATABASE if not exists;`

}

async function main() {
    if (!argv || argv.help || argv.h || argv['?']) throw new Error (`I need the following mandatory attributes to work:
    --host: AWS Redshift host to connect to
    --user: username (must have privileges to unload and create new tables in Spectrum schemas) to connect to AWS Redshift
    --pass: password to connect to AWS Redshift
    --db: database to connect to inside AWS Redshift
    --schema: originl Redshift Schema (the one that will be unloaded)
    --spdir: AWS Redshift Spectrum S3 Bucket
    --awskey: IAM Key that has privileges over the S3 where files will be unloaded
    --awssecret: IAM Secret that has privileges over the S3 Bucket where files will be unloaded
    OPTIONAL:
    --port: in case you have your cluster in another port
    --table: if you want to generate the script for a single table instead of the whole schema
    --awsiamrole: the IAM Role who has access to the S3 bucket that Spectrum can query`)
    if (!argv.pass || argv.pass == '') throw new Error ('I need a password to connect to Redshift, otherwise I cannot continue');
    if (!argv.host || argv.host == '') throw new Error ('I need a host to connect to, otherwise I cannot continue');
    if (!argv.user || argv.user == '') throw new Error ('I need a username to connect to Redshift, otherwise I cannot continue');
    if (!argv.db || argv.db == '') throw new Error ('I need a database to point to, otherwise I cannot continue');
    if (!argv.schema || argv.schema == '') throw new Error ('I need a DB schema at least, otherwise I cannot continue');
    if (!argv.spdir || argv.spdir == '') throw new Error ('I need the S3 Bucket where the Spectrum files will be located, otherwise I cannot continue');
    if (!argv.awskey || argv.awskey == '') throw new Error ('I need the AWS key that will be used for unloading the table, otherwise I cannot continue');
    if (!argv.awssecret || argv.awssecret == '') throw new Error ('I need the AWS Secret that will be used for unloading the table, otherwise I cannot continue');
    if (argv.schema && !argv.table) {
        console.log('I will generate the script for unloading the whole schema', argv.schema);
        finalSyntax += externalSchemaSyntaxGen(argv.schema);
        tables = await schemaSyntaxGen(argv.schema);
        for (let table of tables) {
            console.log('Generating syntax for', table, '...');
            finalSyntax += await tableSyntaxGen(argv.schema, table);
        }
        if (argv.execute == 'true') return console.log('I will be executing the following syntax', finalSyntax) || await client.query(finalSyntax);
        if (!argv.execute || argv.execute == 'false' || argv.execute == '') return console.log('syntax.sql file generated') || fs.writeFileSync('syntax.sql', finalSyntax);

    }
    if (argv.schema && argv.table) {
        console.log('I will generate the script for unloading ', argv.schema + '.' + argv.table)
        console.log('Generating syntax for', argv.table, '...');
        finalSyntax = await table(argv.schema, argv.table);
        if (argv.execute == 'true') return console.log('I will be executing the following syntax', finalSyntax) || await client.query(finalSyntax);
        if (!argv.execute || argv.execute == 'false' || argv.execute == '') return console.log('syntax.sql file generated') || fs.writeFileSync('syntax.sql', finalSyntax);   
    }
}

try {
    main();
}
catch (e) {
    console.log(e)
}