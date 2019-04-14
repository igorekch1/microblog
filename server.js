require('dotenv').config();

const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');
const Sequelize = require('sequelize');
const port = process.env.PORT || 5000;

const sequelize = new Sequelize('microblog', process.env.USER, process.env.PASS,  {
    host: process.env.HOST,
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    },
}); 

sequelize
    .authenticate()
    .then(() => {
        console.log('Connection has been established successfully.');
    })
    .catch(err => {
        console.error('Unable to connect to the database:', err);
    });

const Post = sequelize.define('posts',{
        username: Sequelize.STRING(14),
        text: Sequelize.STRING(140),
        publish_date: Sequelize.DATE
    }, { 
        onDelete: 'cascade' 
    }
);

sequelize.query(`CREATE OR REPLACE FUNCTION posts_insert_trigger()
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
COST 100;`);

sequelize.query(`DROP TRIGGER IF EXISTS posts_insert_trigger ON posts;
CREATE TRIGGER posts_insert_trigger
BEFORE INSERT
ON posts
FOR EACH ROW
EXECUTE PROCEDURE posts_insert_trigger();`);

sequelize.sync();

app.use (express.static('public'));
app.use(bodyParser.json());
app.use(
    cors({
        origin: process.env.FRONT_HOST || "http://localhost:3000",
        credentials: 'include'
    })
);

app.post("/posts", async(req,res) => {
    console.log("body - ",req.body);
    let newPost = await Post.create({
        username: req.body.username,
        text: req.body.text,
        publish_date: req.body.time
    })

    res.status(200).end(JSON.stringify(newPost));
});

app.get("/posts", async(req, res) => {
    let posts = await Post.findAll();
    res.status(200).end(JSON.stringify(posts));
})

app.listen(port, () => {
    console.log(`Listening on port ${port}`)
});