#### NOTE: I AM NOT RESPONSIBLE OF ANYTHING THAT HAPPENED OR CAN HAPPEN TO YOUR REDSHIFT CLUSTER, THE USER (YOU) IS THE ONE AND ONLY RESPONSIBLE OF THE USE/MISUSE OF THIS SCRIPT. I HAVEN'T GOT ANY RELATIONSHIP WITH AWS SO THE CREATION AND USE OF THIS SCRIPT HAS BEEN DONE ACCORDING TO AWS DOCUMENTATION. PLEASE CHECK THE LICENSE.

# Shift to Spectrum

This script was created to ease the offloading of tables/schemas out of AWS Redshift and having them on Redshift Spectrum. This is of special use when you want to dump historical data into other types of storage (like AWS S3). The Spectrum layer does a wonderful job when queried with AWS Redshift, so I created this script to help myself in the offloading of old and rarely used tables of our Data Warehouse.

At this stage, the script only supports offloading the tables with a AWS Key and Secret (the ones you create through IAM) and it stores the tables in TEXT files separated by PIPE (|). It stores those files GZIP'ed and with a size of maximum 100MB, as this is a recommended practice according to AWS documentation as Spectrum can parallelize its queries across all these files.

You can use this script to generate the Syntax and run it for yourself, with any client you want, or run it though the Node postgre client itself. You can use it in multiple ways:
1. Generate (or execute) the offloading script for an entire schema
2. Generate (or execute) the offloading script for a single table

### REQUIREMENTS
**Node.js 8+** (must support async/await)

### USAGE:
1. `git clone` or download this repo
2. on the downloaded directory do a `npm i` to install all dependencies
3. `node index` with the flags below
4. Once finished (and if you didn't use the execute flag), you will see a syntax.sql file generated with all the commands

### FLAGS
> **--host**: AWS Redshift host to connect to
> 
> **--user**: username (must have privileges to unload and create new tables in Spectrum schemas) to connect to AWS Redshift
> 
> **--pass**: password to connect to AWS Redshift
> 
> **--db**: database to connect to inside AWS Redshift
> 
> **--schema**: originl Redshift Schema (the one that will be unloaded)
> 
> **--spdir**: AWS Redshift Spectrum S3 Bucket
> 
> **--awskey**: IAM Key that has privileges over the S3 Bucket where files will be unloaded
> 
> **--awssecret**: IAM Secret that has privileges over the S3 Bucket where files will be unloaded
#### OPTIONAL:
> **--port**: in case you have your cluster in another port
> 
> **--table**: if you want to generate the script for a single table instead of the whole schema
> 
> **--awsiamrole**: the IAM Role who has access to the S3 bucket that Spectrum can query

The script will generate the UNLOAD syntax followed by a CREATE EXTERNAL TABLE one with the same structure as the table has. For entire schema dump, it will also generate the CREATE EXTERNAL SCHEMA and will generate a new schema with an "e_" + the name of your schema 

Please note that this script does not configure your Redshift cluster to use Redshift Spectrum and you MUST do that before running this script, otherwise it will fail. 

NOTE: I'm already aware that having PARQUET formatted files in S3 rather than text files is way quicker than text files, but Redshift does a great job caching the queries so while the Redshift team builds the UNLOAD to Parquet feature, this tool provides great functionality to everyone that is running out of space on their clusters.

TODO:
1. Include an option to generate the VIEW in the old schema
2. Add new Data Types in the function dataTypeValidator --> this was planned to only use TIMESTAMP, VARCHAR and BIGINT, BOOLEAN and FLOAT fields, if there are more fields that you need, please send a Pull Request so we can all improve this tool!
