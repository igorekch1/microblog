# Microblog

## Description
Simple Web application featuring PostgreSQL trigger for making a partition of records, posting by users, by date.

## Technologies used

#### _BACK_
1. Express.js as a Node.js Framework 
2. PostgreSQL
3. PostgreSQL trigger

#### _FRONT_
1. React.js
2. Redux + Thunk middleware

#### TRIGGER Example

_TRIGGER FUNCTION_ invoked each time user posts something
```sql
CREATE OR REPLACE FUNCTION posts_insert_trigger()
RETURNS trigger AS
$BODY$
DECLARE
table_master varchar(255):= 'posts';
table_part varchar(255):= '';
BEGIN
table_part := table_master
|| '_y' || date_part( 'year', NEW.publish_date )::text
|| '_m' || date_part( 'month',NEW.publish_date )::text
|| '_d' || date_part( 'day', NEW.publish_date )::text;
PERFORM 1 FROM pg_class
WHERE relname = table_part
LIMIT 1;
IF NOT FOUND
THEN EXECUTE '
CREATE TABLE ' || table_part || ' ( )
INHERITS ( ' || table_master || ' )';
EXECUTE '
CREATE INDEX ' ||table_part || '_post_id_date_index
ON ' || table_part || '
USING btree (id, publish_date)';
END IF;
EXECUTE '
INSERT INTO ' || table_part || '
SELECT(('||quote_literal(NEW)||')::'||TG_RELNAME||').*';
RETURN NULL;
END;
$BODY$ 

LANGUAGE plpgsql VOLATILE
COST 100;
```

_TRIGGER_
```sql
DROP TRIGGER IF EXISTS posts_insert_trigger ON posts;
CREATE TRIGGER posts_insert_trigger
BEFORE INSERT
ON posts
FOR EACH ROW
EXECUTE PROCEDURE posts_insert_trigger();
```
