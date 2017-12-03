#### NOTE: I AM NOT RESPONSIBLE OF ANYTHING THAT HAPPENED OR CAN HAPPEN TO YOUR REDSHIFT CLUSTER, THE USER (YOU) IS THE ONE AND ONLY RESPONSIBLE OF THE USE/MISUSE OF THIS SCRIPT. I HAVEN'T GOT ANY RELATIONSHIP WITH AWS SO THE CREATION AND USE OF THIS SCRIPT HAS BEEN DONE ACCORDING TO AWS DOCUMENTATION.

This script was created to ease the offloading of tables out of AWS Redshift and having them on Redshift Spectrum. This is of special use when you want to dump historical data into other types of storage (like AWS S3). The Spectrum layer does a wonderful job when queried with AWS Redshift, so I created this script to help myself in the offloading of old and rarely used tables of our Data Warehouse.

At this state, the script only supports offloading the tables with a AWS Key and Secret (the ones you create through IAM) and it stores the tables in TEXT files separated by PIPE (|). It stores those files GZIP'ed and with a size of maximum 100MB, as this is a recommended practice according to AWS documentation as Spectrum can parallelize its queries across all these files.

You can use this script to generate the Syntax and run it for yourself, with any client you want, or run it though the Node postgre client itself. You can use it in multiple ways:
1. Generate (or execute) the offloading script for an entire schema
2. Generate (or execute) the offloading script for a single table

The script will generate the UNLOAD syntax followed by a CREATE EXTERNAL TABLE one with the same structure as the table has. Be aware that the table in the spectrum schema will be named (yourSpectrumSchemaName).(yourOldSchemaName + yourTableName)

Please note that this script does not configure your Redshift cluster to use Redshift Spectrum and you MUST do that before running this script, otherwise the CREATE EXTERNAL TABLE part of it will fail. Also, and I'm already aware, that having PARQUET formatted files in S3 rather than text files is way quicker than text files, but Redshift does a great job caching the queries so while the Redshift team builds the UNLOAD to Parquet feature, this tool provides great functionality to everyone that is running out of space on their clusters.

TODO:
1. Include an option to generate the VIEW in the old schema to maintain the same behaviour in the schema + dropping the old table
2. Add new Data Types in the function dataTypeValidator --> this was planned to only use TIMESTAMP and VARCHAR fields, if there are more fields that you need, please send a Pull Request so we can all improve this tool!