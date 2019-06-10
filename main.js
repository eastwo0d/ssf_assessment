//load lib
const express = require('express');
const hbs = require('express-handlebars');
const request = require('request');
const mysql = require('mysql');

//tunables
const PORT = parseInt( process.argv[2] || process.env.APP_PORT || 3000);

//SQL statements
const SQL_Find_Game = 'select * from bgg.game where name like ?'
const SQL_Game_Details = 'select * from bgg.game where gid like ?'
const SQL_Game_comments = 'select * from bgg.comment where gid like ? limit ? offset ?'
const SQL_Count_Comments = 'select count(*) as totalComm from bgg.comment where gid like ?'

//create connection pool
const pool = mysql.createPool(require('./config.json'));

//create an instance of the application
const app = express();

//handlebars
app.engine('hbs', hbs());
app.set('view engine', 'hbs');
app.set('views', __dirname + '/views');

//route handlers
app.get('/search', (req,res) => {
    const name = req.query.name;
    pool.getConnection((err,conn) => {
        if (err) {
            res.status(400);
            res.type('text/plain');
            res.send(err);
            return;
        }
        conn.query(SQL_Find_Game,
            [`%${name}%`],
            (err, result) => {
                conn.release()
                if (err) {
                    res.status(400);
                    res.type('text/plain');
                    res.send(err);
                    return;
                }
                console.log(result.length)

                res.status(200);
                res.type('text/html');
                res.render('search', {
                    layout : false,
                    game : result,
                    name : name,
                    noResult : result.length <= 0
                })
        })
    })
})

app.get('/game/:gid',(req,res) => {
    console.log(`game id is ${req.params.gid}`)
    const gameId = parseInt(req.params.gid);
    const limit = parseInt(req.query.limit) || 5;
    const offset = parseInt(req.query.offset) || 0;
    pool.getConnection((err, conn) => {
        if (err) {
            res.status(400);
            res.type('text/plain');
            res.send(err);
            return;
        }
        conn.query(SQL_Game_Details,
            [ gameId ],
            (err, gameDetails) => {
                if(err){
                    res.status(400);
                    res.type('text/plain');
                    res.send(err);
                    return;
                }
                console.log(gameDetails[0])

                conn.query(SQL_Count_Comments,
                    [gameId],
                    (err, totCount) => {
                        if(err){
                            res.status(400);
                            res.type('text/plain');
                            res.send(err);
                            return;
                        }
                        console.log(totCount[0].totalComm)
                    
                    const totalCount = totCount[0].totalComm
                        
                    conn.query(SQL_Game_comments,
                        [ gameId, limit, offset ],
                        (err, gameComm) => {
                            conn.release();
                            if(err){
                                res.status(400);
                                res.type('text/plain');
                                res.send(err);
                                return;
                            }
                            console.log(gameComm.length)

                            res.status(200);
                            res.type('text/html');
                            res.render('game', {
                                layout : false,
                                game : gameDetails[0],
                                gameComm : gameComm,
                                noComm : gameComm.length <= 0,
                                next_offset : offset + limit,
                                prev_offset : offset - limit,
                                prev_disabled : (offset - limit) < 0 ? "disabled" : "",
                                next_disabled : (gameComm.length < limit || (offset + limit ) >= totalCount) ? "disabled" : ""
                            })
                        })
                    }) 
            })        
    })
})




app.get(/.*/, express.static(__dirname + '/public'))



//start the server
app.listen(PORT, () => {
    console.info(`Application started on ${new Date()} at port ${PORT}`)
})